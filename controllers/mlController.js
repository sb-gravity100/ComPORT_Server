// controllers/mlController.js
import comfortRatingService from '../services/comfortRatingService.js';
import Product from '../models/Product.js';

// @desc    Calculate comfort rating for a single product
// @route   GET /api/ml/comfort/product/:id
export const getProductComfortRating = async (req, res) => {
   try {
      const { id } = req.params;

      const comfortScore =
         await comfortRatingService.calculateProductComfortRating(id);

      // Update product with calculated score
      await Product.findByIdAndUpdate(id, {
         comfortScore: comfortScore.overall,
      });

      res.json({
         success: true,
         productId: id,
         comfortRating: comfortScore,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Calculate comfort rating for a bundle
// @route   POST /api/ml/comfort/bundle
export const getBundleComfortRating = async (req, res) => {
   try {
      const { parts } = req.body;

      if (!parts || Object.keys(parts).length === 0) {
         return res.status(400).json({
            success: false,
            message: 'No parts provided',
         });
      }

      // Fetch full product data for each part
      const fullParts = {};
      for (const [category, partId] of Object.entries(parts)) {
         if (typeof partId === 'string') {
            const product = await Product.findById(partId);
            if (product) {
               fullParts[category] = product;
            }
         } else if (partId._id) {
            fullParts[category] = partId;
         }
      }

      const comfortScore =
         await comfortRatingService.calculateBundleComfortRating(fullParts);

      res.json({
         success: true,
         comfortRating: comfortScore,
         breakdown: Object.keys(fullParts).map((category) => ({
            category,
            productId: fullParts[category]._id,
            name: fullParts[category].name,
         })),
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Update comfort scores for all products
// @route   POST /api/ml/comfort/update-all
export const updateAllComfortScores = async (req, res) => {
   try {
      const products = await Product.find();
      let updated = 0;
      let failed = 0;

      for (const product of products) {
         try {
            const comfortScore =
               await comfortRatingService.calculateProductComfortRating(
                  product._id
               );
            await Product.findByIdAndUpdate(product._id, {
               comfortScore: comfortScore.overall,
            });
            updated++;
         } catch (error) {
            console.error(`Failed to update ${product._id}:`, error.message);
            failed++;
         }
      }

      res.json({
         success: true,
         message: `Updated ${updated} products, ${failed} failed`,
         stats: { updated, failed, total: products.length },
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Train the ML model with current data
// @route   POST /api/ml/train
export const trainModel = async (req, res) => {
   try {
      await comfortRatingService.trainModel();

      res.json({
         success: true,
         message: 'Model training completed successfully',
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get ML model status
// @route   GET /api/ml/status
export const getModelStatus = async (req, res) => {
   try {
      res.json({
         success: true,
         status: {
            isReady: comfortRatingService.isModelReady,
            modelType: 'Neural Network (TensorFlow.js)',
            features: 12,
            outputs: 4,
            metrics: ['ease', 'performance', 'noise', 'temperature'],
         },
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};
