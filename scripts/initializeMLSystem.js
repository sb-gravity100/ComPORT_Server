// scripts/initializeMLSystem.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import comfortRatingService from '../services/comfortRatingService.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const STEPS = {
   CHECK_DB: '1. Check Database Connection',
   CREATE_DIRS: '2. Create ML Directories',
   CHECK_DATA: '3. Check Data Availability',
   SEED_REVIEWS: '4. Seed Sample Reviews (if needed)',
   INIT_MODEL: '5. Initialize ML Model',
   TRAIN_MODEL: '6. Train Model',
   UPDATE_SCORES: '7. Update Product Scores',
};

async function initializeMLSystem() {
   console.log('\n╔════════════════════════════════════════════════════════╗');
   console.log('║     ComPORT ML Comfort Rating System Initialization    ║');
   console.log('╚════════════════════════════════════════════════════════╝\n');

   try {
      // Step 1: Check Database Connection
      console.log(`\n[${STEPS.CHECK_DB}]`);
      await connectDB();
      console.log('✓ Connected to MongoDB\n');

      // Step 2: Create ML Directories
      console.log(`\n[${STEPS.CREATE_DIRS}]`);
      const mlDir = path.resolve('./ml_models');
      const modelDir = path.resolve('./ml_models/comfort_model');

      if (!fs.existsSync(mlDir)) {
         fs.mkdirSync(mlDir);
         console.log('✓ Created ml_models directory');
      } else {
         console.log('✓ ml_models directory exists');
      }

      if (!fs.existsSync(modelDir)) {
         fs.mkdirSync(modelDir);
         console.log('✓ Created comfort_model directory');
      } else {
         console.log('✓ comfort_model directory exists');
      }

      // Step 3: Check Data Availability
      console.log(`\n[${STEPS.CHECK_DATA}]`);
      const productCount = await Product.countDocuments();
      const reviewCount = await Review.countDocuments();
      const userCount = await User.countDocuments();

      console.log(`Products in database: ${productCount}`);
      console.log(`Reviews in database: ${reviewCount}`);
      console.log(`Users in database: ${userCount}`);

      if (productCount === 0) {
         console.log('\n⚠ Warning: No products found in database!');
         console.log('Please populate the database before continuing.');
         process.exit(1);
      }

      // Step 4: Seed Sample Reviews (if needed)
      console.log(`\n[${STEPS.SEED_REVIEWS}]`);
      if (reviewCount < productCount * 0.1) {
         console.log('⚠ Few reviews found. Seeding sample data...\n');
         await seedSampleReviews();
      } else {
         console.log(`✓ Sufficient reviews (${reviewCount}) available`);
      }

      // Step 5: Initialize ML Model
      console.log(`\n[${STEPS.INIT_MODEL}]`);
      await comfortRatingService.initializeModel();
      console.log('✓ ML Model initialized successfully\n');

      // Step 6: Train Model
      console.log(`\n[${STEPS.TRAIN_MODEL}]`);
      const finalReviewCount = await Review.countDocuments();

      if (finalReviewCount >= 10) {
         console.log('Training model with available data...\n');
         await comfortRatingService.trainModel();
         console.log('\n✓ Model training completed');
      } else {
         console.log(
            '⚠ Not enough data for training (need at least 10 reviews)'
         );
         console.log('Model will use default weights');
      }

      // Step 7: Update Product Scores
      console.log(`\n[${STEPS.UPDATE_SCORES}]`);
      console.log('Calculating comfort scores for all products...\n');

      const products = await Product.find().limit(50); // Limit for initial setup
      let updated = 0;

      for (let i = 0; i < products.length; i++) {
         const product = products[i];
         try {
            const comfortScore =
               await comfortRatingService.calculateProductComfortRating(
                  product._id
               );

            await Product.findByIdAndUpdate(product._id, {
               comfortScore: comfortScore.overall,
            });

            updated++;

            // Progress indicator
            if ((i + 1) % 10 === 0) {
               console.log(
                  `  Processed ${i + 1}/${products.length} products...`
               );
            }
         } catch (error) {
            console.error(`  ✗ Failed for ${product.name}: ${error.message}`);
         }
      }

      console.log(`\n✓ Updated ${updated}/${products.length} product scores`);

      // Summary
      console.log(
         '\n╔════════════════════════════════════════════════════════╗'
      );
      console.log('║              Initialization Complete! ✓                ║');
      console.log(
         '╚════════════════════════════════════════════════════════╝\n'
      );

      console.log('Summary:');
      console.log(`  • Products: ${productCount}`);
      console.log(`  • Reviews: ${await Review.countDocuments()}`);
      console.log(`  • ML Model: Trained and Ready`);
      console.log(`  • Comfort Scores: ${updated} products updated`);

      console.log('\nNext Steps:');
      console.log('  1. Start your server: npm run dev');
      console.log('  2. Check ML status: GET /api/ml/status');
      console.log('  3. Test prediction: GET /api/ml/comfort/product/:id');

      console.log('\nOptional Commands:');
      console.log('  • Retrain model: npm run train');
      console.log('  • Update all scores: npm run update-scores');
      console.log('  • Seed more reviews: node scripts/seedReviewData.js\n');

      process.exit(0);
   } catch (error) {
      console.error('\n✗ Initialization failed:', error);
      process.exit(1);
   }
}

async function seedSampleReviews() {
   const reviewTemplates = {
      highPerformance: {
         rating: 5,
         comment: 'Excellent performance, handles demanding tasks with ease.',
         comfortRatings: { ease: 4, performance: 5, noise: 4, temperature: 4 },
      },
      silent: {
         rating: 5,
         comment: 'Very quiet operation, perfect for quiet environments.',
         comfortRatings: { ease: 4, performance: 4, noise: 5, temperature: 4 },
      },
      cool: {
         rating: 5,
         comment:
            'Stays cool even under heavy load, great thermal performance.',
         comfortRatings: { ease: 4, performance: 4, noise: 4, temperature: 5 },
      },
      balanced: {
         rating: 4,
         comment: 'Good balance of performance, noise, and temperature.',
         comfortRatings: { ease: 4, performance: 4, noise: 4, temperature: 4 },
      },
      hot: {
         rating: 3,
         comment: 'Runs quite hot under load, needs good cooling.',
         comfortRatings: { ease: 3, performance: 4, noise: 3, temperature: 2 },
      },
      loud: {
         rating: 3,
         comment: 'Performance is good but fans can get noisy.',
         comfortRatings: { ease: 3, performance: 4, noise: 2, temperature: 3 },
      },
      efficient: {
         rating: 5,
         comment: 'Very efficient, low power consumption and heat.',
         comfortRatings: { ease: 5, performance: 4, noise: 4, temperature: 5 },
      },
   };

   // Get or create test user
   let testUser = await User.findOne({ username: 'ml_reviewer' });
   if (!testUser) {
      testUser = await User.create({
         username: 'ml_reviewer',
         email: 'ml@comport.test',
         password: 'password123',
      });
      console.log('  ✓ Created test user for reviews');
   }

   const products = await Product.find();
   let created = 0;

   for (const product of products) {
      // Check if already has reviews
      const existingReviews = await Review.countDocuments({
         product: product._id,
      });
      if (existingReviews > 0) continue;

      // Select template based on product
      let template = reviewTemplates.balanced;
      const specs = product.specifications || {};

      switch (product.category) {
         case 'CPU':
            const cpuTDP = parseInt(specs.TDP?.replace('W', '')) || 65;
            template =
               cpuTDP > 150
                  ? reviewTemplates.hot
                  : cpuTDP < 65
                  ? reviewTemplates.efficient
                  : reviewTemplates.highPerformance;
            break;
         case 'GPU':
            const gpuTDP = parseInt(specs.TDP?.replace('W', '')) || 150;
            template =
               gpuTDP > 300
                  ? reviewTemplates.hot
                  : gpuTDP < 150
                  ? reviewTemplates.efficient
                  : reviewTemplates.highPerformance;
            break;
         case 'Storage':
            template = specs.type?.toLowerCase().includes('ssd')
               ? reviewTemplates.silent
               : reviewTemplates.loud;
            break;
         case 'PSU':
            template =
               specs.efficiency?.includes('Platinum') ||
               specs.efficiency?.includes('Titanium')
                  ? reviewTemplates.efficient
                  : reviewTemplates.balanced;
            break;
         case 'Case':
            const fans = parseInt(specs.fans) || 2;
            template =
               fans > 5
                  ? reviewTemplates.cool
                  : fans < 2
                  ? reviewTemplates.hot
                  : reviewTemplates.balanced;
            break;
      }

      // Add variation
      const variation = Math.random() * 0.4 - 0.2;

      try {
         await Review.create({
            user: testUser._id,
            product: product._id,
            rating: template.rating,
            comment: template.comment,
            comfortRatings: {
               ease: Math.max(
                  1,
                  Math.min(5, template.comfortRatings.ease + variation)
               ),
               performance: Math.max(
                  1,
                  Math.min(5, template.comfortRatings.performance + variation)
               ),
               noise: Math.max(
                  1,
                  Math.min(5, template.comfortRatings.noise + variation)
               ),
               temperature: Math.max(
                  1,
                  Math.min(5, template.comfortRatings.temperature + variation)
               ),
            },
         });
         created++;
      } catch (error) {
         // Skip duplicates
      }
   }

   console.log(`  ✓ Created ${created} sample reviews\n`);
}

// Run initialization
initializeMLSystem();
