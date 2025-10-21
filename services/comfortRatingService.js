// services/comfortRatingService.js
import * as tf from '@tensorflow/tfjs-node';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import path from 'path';

class ComfortRatingService {
   constructor() {
      this.model = null;
      this.isModelReady = false;
   }

   /**
    * Initialize and train the comfort rating model
    */
   async initializeModel() {
      try {
         console.log('Initializing Comfort Rating ML Model...');

         // Create a neural network optimized for review, rating, and price data
         this.model = tf.sequential({
            layers: [
               tf.layers.dense({
                  inputShape: [12], // 12 input features: price(3) + shop ratings(4) + reviews(5)
                  units: 29,
                  activation: 'relu',
                  kernelInitializer: 'heNormal',
               }),
               tf.layers.dropout({ rate: 0.3 }),
               tf.layers.dense({
                  units: 16,
                  activation: 'relu',
                  kernelInitializer: 'heNormal',
               }),
               tf.layers.dropout({ rate: 0.2 }),
               tf.layers.dense({
                  units: 8,
                  activation: 'relu',
                  kernelInitializer: 'heNormal',
               }),
               tf.layers.dense({
                  units: 2, // 4 outputs: ease, performance, noise, temperature
                  activation: 'sigmoid', // Output between 0-1
               }),
            ],
         });

         // Compile the model
         this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae'],
         });

         // Try to load pre-trained weights if they exist
         try {
            await this.model.loadWeights(
               `file://${path.resolve('./ml_models/comfort_model/model.json')}`
            );
            console.log('Loaded pre-trained comfort model weights');
         } catch (error) {
            console.log(error);
            console.log('No pre-trained weights found, using fresh model');
         }

         this.isModelReady = true;
         console.log('Comfort Rating Model Ready');
      } catch (error) {
         console.error('Error initializing comfort model:', error);
         throw error;
      }
   }

   /**
    * Extract features from product for ML training
    * Focus on: reviews, shop ratings, and price
    */
   extractProductFeatures(product, category) {
      const features = {
         // Price features (3 features)
         avgPrice: 0,
         priceRange: 0,
         priceToRatingRatio: 0,

         // Shop rating features (4 features)
         overallShopRating: 0,
         shopRatingCount: 0,
         avgShopRating: 0,
         shopAvailability: 0,

         // Platform review features (5 features)
         platformRating: 0,
         platformReviewCount: 0,
         reviewRecency: 0,
         reviewConsistency: 0,
         avgUserRating: 0,
      };

      // Price features
      const avgPrice = product.priceRange?.average || 0;
      features.avgPrice = this.normalizePrice(avgPrice);
      features.priceRange = this.normalizePriceSpread(
         product.priceRange?.min || 0,
         product.priceRange?.max || 0
      );

      // Shop ratings from sources
      if (product.ratings?.bySource && product.ratings.bySource.length > 0) {
         const shopRatings = product.ratings.bySource;
         const totalRating = shopRatings.reduce(
            (sum, r) => sum + (r.average || 0),
            0
         );
         const totalCount = shopRatings.reduce(
            (sum, r) => sum + (r.count || 0),
            0
         );

         features.avgShopRating =
            shopRatings.length > 0
               ? totalRating / shopRatings.length / 5 // Normalize to 0-1
               : 0;
         features.shopRatingCount = Math.min(totalCount / 1000, 1); // Normalize, max 1000
         features.overallShopRating =
            (product.ratings.overall?.average || 0) / 5;
      }

      // Shop availability
      features.shopAvailability =
         product.availableAt && product.totalSources
            ? product.availableAt / product.totalSources
            : 0;

      // Platform reviews (user reviews on our platform)
      if (product.platformReviews && product.platformReviews.length > 0) {
         features.platformReviewCount = Math.min(
            product.platformReviews.length / 50,
            1
         ); // Max 50
      }

      // Price to rating ratio (value indicator)
      if (features.overallShopRating > 0 && avgPrice > 0) {
         features.priceToRatingRatio =
            features.overallShopRating / (avgPrice / 50000); // Normalize
      }

      // Category-specific adjustments
      const categoryWeights = {
         CPU: 1.2,
         GPU: 1.2,
         RAM: 0.9,
         Motherboard: 1.0,
         Storage: 0.95,
         PSU: 1.1,
         Case: 0.85,
      };

      const categoryWeight = categoryWeights[category] || 1.0;
      Object.keys(features).forEach((key) => {
         if (features[key] > 0) {
            features[key] *= categoryWeight;
         }
      });

      return features;
   }

   /**
    * Extract features from reviews (platform and shop reviews combined)
    */
   async extractReviewFeatures(productId) {
      const reviews = await Review.find({ product: productId });

      if (reviews.length === 0) {
         return {
            avgEase: 0.5,
            avgPerformance: 0.5,
            reviewCount: 0,
            recency: 0,
            consistency: 0.5,
         };
      }

      let totalEase = 0,
         totalPerformance = 0;
      let countEase = 0,
         countPerformance = 0;

      reviews.forEach((review) => {
         if (review.comfortRatings?.ease) {
            totalEase += review.comfortRatings.ease;
            countEase++;
         }
         if (review.comfortRatings?.performance) {
            totalPerformance += review.comfortRatings.performance;
            countPerformance++;
         }
      });

      return {
         avgEase: countEase > 0 ? totalEase / countEase / 5 : 0.5, // Normalize to 0-1
         avgPerformance:
            countPerformance > 0
               ? totalPerformance / countPerformance / 5
               : 0.5,
         reviewCount: reviews.length,
         recency: this.calculateReviewRecency(reviews),
         consistency: this.calculateReviewConsistency(reviews),
      };
   }

   /**
    * Calculate comfort rating for a single product
    */
   async calculateProductComfortRating(productId) {
      if (!this.isModelReady) {
         await this.initializeModel();
      }

      const product = await Product.findById(productId);
      if (!product) {
         throw new Error('Product not found');
      }

      // Extract features
      const productFeatures = this.extractProductFeatures(
         product,
         product.category
      );
      const reviewFeatures = await this.extractReviewFeatures(productId);

      // Combine features into input vector
      const inputFeatures = [
         productFeatures.avgPrice,
         productFeatures.priceRange,
         productFeatures.overallShopRating,
         productFeatures.shopRatingCount,
         productFeatures.shopAvailability,
         productFeatures.platformRating,
         productFeatures.platformReviewCount,
         productFeatures.reviewRecency,
         productFeatures.reviewConsistency,
         productFeatures.avgUserRating,
         productFeatures.priceToRatingRatio,
         productFeatures.avgShopRating,
      ];

      // If we have review data, use it to adjust predictions
      const inputTensor = tf.tensor2d([inputFeatures]);
      const prediction = this.model.predict(inputTensor);
      const scores = await prediction.data();

      inputTensor.dispose();
      prediction.dispose();

      // Blend ML prediction with actual review data
      const reviewWeight = Math.min(reviewFeatures.reviewCount / 10, 0.7); // Max 70% weight from reviews
      const mlWeight = 1 - reviewWeight;

      const comfortScore = {
         ease: Math.round(
            (scores[0] * mlWeight + reviewFeatures.avgEase * reviewWeight) * 100
         ),
         performance: Math.round(
            (scores[1] * mlWeight +
               reviewFeatures.avgPerformance * reviewWeight) *
               100
         ),
      };

      // Calculate overall score
      comfortScore.overall = Math.round(
         comfortScore.ease * 0.2 + comfortScore.performance * 0.3
      );

      return comfortScore;
   }

   /**
    * Calculate comfort rating for a complete bundle
    * Based on reviews, shop ratings, and price data
    */
   async calculateBundleComfortRating(parts) {
      const componentScores = {};
      let totalPrice = 0;
      let avgShopRating = 0;
      let totalReviews = 0;

      // Get individual component scores
      for (const [category, part] of Object.entries(parts)) {
         if (part._id) {
            try {
               componentScores[category] =
                  await this.calculateProductComfortRating(part._id);

               // Track bundle-level metrics
               const price = part.priceRange?.average || 0;
               totalPrice += price;

               if (part.ratings?.overall?.average) {
                  avgShopRating += part.ratings.overall.average;
               }

               if (part.platformReviews) {
                  totalReviews += part.platformReviews.length;
               }
            } catch (error) {
               console.error(`Error calculating score for ${category}:`, error);
            }
         }
      }

      const partCount = Object.keys(componentScores).length;
      if (partCount === 0) {
         return {
            overall: 0,
            ease: 0,
            performance: 0,
         };
      }

      avgShopRating = avgShopRating / partCount;

      // Calculate weighted averages based on price and ratings
      const weights = {
         CPU: 0.25,
         GPU: 0.25,
         RAM: 0.1,
         Motherboard: 0.1,
         Storage: 0.1,
         PSU: 0.15,
         Case: 0.05,
      };

      let weightedEase = 0,
         weightedPerformance = 0;
      let totalWeight = 0;

      Object.entries(componentScores).forEach(([category, scores]) => {
         const weight = weights[category] || 0.05;
         weightedEase += scores.ease * weight;
         weightedPerformance += scores.performance * weight;
         totalWeight += weight;
      });

      // Normalize by actual weight used
      if (totalWeight > 0) {
         weightedEase /= totalWeight;
         weightedPerformance /= totalWeight;
      }

      // Apply bundle-level adjustments based on price and ratings
      const priceQualityRatio =
         avgShopRating > 0 ? avgShopRating / 5 / (totalPrice / 50000) : 1;
      const reviewConfidence = Math.min(totalReviews / 20, 1); // More reviews = higher confidence

      // Better price-to-quality ratio improves scores
      const priceAdjustment = Math.min(priceQualityRatio, 1.2);

      // More reviews increase confidence in scores
      weightedEase *= 0.85 + reviewConfidence * 0.15;
      weightedPerformance *= 0.85 + reviewConfidence * 0.15;

      const bundleComfort = {
         overall: Math.round(weightedEase * 0.2 + weightedPerformance * 0.3),
         ease: Math.round(weightedEase),
         performance: Math.round(weightedPerformance),
      };

      return bundleComfort;
   }

   // Normalization helper methods for price, ratings, and reviews
   normalizePrice(price) {
      return Math.min(price / 100000, 1); // Max ₱100,000
   }

   normalizePriceSpread(min, max) {
      if (min === 0 || max === 0) return 0;
      const spread = (max - min) / min;
      return Math.min(spread, 1); // Normalize to 0-1
   }

   normalizeRating(rating) {
      return rating / 5; // Ratings are 1-5, normalize to 0-1
   }

   normalizeReviewCount(count) {
      return Math.min(count / 100, 1); // Max 100 reviews
   }

   calculateReviewRecency(reviews) {
      if (!reviews || reviews.length === 0) return 0;

      const now = Date.now();
      const recencyScores = reviews.map((review) => {
         const daysSinceReview =
            (now - new Date(review.createdAt).getTime()) /
            (1000 * 60 * 60 * 24);
         // More recent reviews get higher scores
         if (daysSinceReview < 30) return 1.0;
         if (daysSinceReview < 90) return 0.8;
         if (daysSinceReview < 180) return 0.6;
         if (daysSinceReview < 365) return 0.4;
         return 0.2;
      });

      return recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length;
   }

   calculateReviewConsistency(reviews) {
      if (!reviews || reviews.length < 2) return 0.5;

      const ratings = reviews.map((r) => r.rating);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const variance =
         ratings.reduce((sum, rating) => sum + Math.pow(rating - avg, 2), 0) /
         ratings.length;
      const stdDev = Math.sqrt(variance);

      // Lower standard deviation = more consistent = higher score
      return Math.max(0, 1 - stdDev / 2.5); // Normalize to 0-1
   }

   /**
    * Train the model with actual data
    */
   async trainModel() {
      console.log('Training comfort rating model...');

      // Fetch all products with reviews
      const products = await Product.find().limit(1000);
      const trainingData = [];

      for (const product of products) {
         const features = this.extractProductFeatures(
            product,
            product.category
         );
         const reviewFeatures = await this.extractReviewFeatures(product._id);

         if (reviewFeatures.reviewCount > 0) {
            const inputFeatures = [
               features.avgPrice,
               features.priceRange,
               features.overallShopRating,
               features.shopRatingCount,
               features.shopAvailability,
               features.platformRating,
               features.platformReviewCount,
               features.reviewRecency,
               features.reviewConsistency,
               features.avgUserRating,
               features.priceToRatingRatio,
               features.avgShopRating,
            ];

            const outputLabels = [
               reviewFeatures.avgEase,
               reviewFeatures.avgPerformance,
            ];

            trainingData.push({ input: inputFeatures, output: outputLabels });
         }
      }

      if (trainingData.length < 10) {
         console.log('Not enough training data, skipping training');
         return;
      }

      // Prepare tensors
      const inputs = tf.tensor2d(trainingData.map((d) => d.input));
      const outputs = tf.tensor2d(trainingData.map((d) => d.output));

      // Train the model
      await this.model.fit(inputs, outputs, {
         epochs: 200,
         batchSize: 32,
         validationSplit: 0.2,
         callbacks: {
            onEpochEnd: (epoch, logs) => {
               if (epoch % 10 === 0) {
                  console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
               }
            },
         },
      });

      // Save the trained model
      await this.model.save('file://./ml_models/comfort_model');

      inputs.dispose();
      outputs.dispose();

      console.log('Model training completed and saved');
   }
}

// Export singleton instance
const comfortRatingService = new ComfortRatingService();
export default comfortRatingService;
