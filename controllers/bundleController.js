// controllers/bundleController.js (UPDATED)
import Bundle from '../models/Bundle.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import comfortRatingService from '../services/comfortRatingService.js';
import { checkCompatibility } from '../utils/compatibilityUtils.js';

// @desc    Create new bundle with ML comfort rating
// @route   POST /api/bundles
export const createBundle = async (req, res) => {
   try {
      const {
         name,
         parts = {},
         notes = '',
         compatibilityScore = 0,
         comfortProfile = {},
         isPublic = false,
      } = req.body;

      const products = [];
      let totalPrice = 0;
      const fullParts = {};

      // Fetch full product data
      for (const [categoryId, part] of Object.entries(parts)) {
         const product = await Product.findById(part._id);
         if (!product) {
            return res.status(404).json({
               success: false,
               message: `Product ${part._id} not found in category ${categoryId}`,
            });
         }

         products.push({
            product: product._id,
            category: categoryId,
         });

         fullParts[categoryId] = product;
         totalPrice += part.selectedPrice || 0;
      }

      // Calculate compatibility
      const compatibilityReport = checkCompatibility(fullParts);

      // Calculate ML-based comfort rating
      let mlComfortProfile = comfortProfile;
      try {
         mlComfortProfile =
            await comfortRatingService.calculateBundleComfortRating(fullParts);
         console.log('ML Comfort Rating:', mlComfortProfile);
      } catch (error) {
         console.error('ML comfort calculation failed, using provided:', error);
      }

      const bundle = await Bundle.create({
         user: req.user._id,
         name,
         products,
         totalPrice,
         compatibilityScore: compatibilityReport.score || compatibilityScore,
         comfortProfile: mlComfortProfile,
         isPublic,
         notes,
      });

      await User.findByIdAndUpdate(req.user._id, {
         $push: { savedBundles: bundle._id },
      });

      res.status(201).json({
         success: true,
         bundle,
         compatibility: compatibilityReport,
         mlComfortRating: mlComfortProfile,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get user bundles with comfort ratings
// @route   GET /api/bundles
export const getUserBundles = async (req, res) => {
   try {
      const bundles = await Bundle.find({ user: req.user._id })
         .populate('products.product')
         .sort('-createdAt');

      res.json({
         success: true,
         count: bundles.length,
         bundles,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get single bundle with detailed comfort analysis
// @route   GET /api/bundles/:id
export const getBundle = async (req, res) => {
   try {
      const bundle = await Bundle.findById(req.params.id).populate(
         'products.product'
      );

      if (!bundle) {
         return res.status(404).json({
            success: false,
            message: 'Bundle not found',
         });
      }

      // Check if user owns bundle or if it's public
      if (
         bundle.user.toString() !== req.user._id.toString() &&
         !bundle.isPublic
      ) {
         return res.status(403).json({
            success: false,
            message: 'Not authorized to view this bundle',
         });
      }

      // Recalculate comfort rating if needed (optional)
      if (!bundle.comfortProfile || !bundle.comfortProfile.overall) {
         try {
            const fullParts = {};
            bundle.products.forEach((p) => {
               fullParts[p.category] = p.product;
            });

            const mlComfortProfile =
               await comfortRatingService.calculateBundleComfortRating(
                  fullParts
               );

            bundle.comfortProfile = mlComfortProfile;
            await bundle.save();
         } catch (error) {
            console.error('Failed to recalculate comfort:', error);
         }
      }

      res.json({
         success: true,
         bundle,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Update bundle
// @route   PUT /api/bundles/:id
export const updateBundle = async (req, res) => {
   try {
      let bundle = await Bundle.findById(req.params.id);

      if (!bundle) {
         return res.status(404).json({
            success: false,
            message: 'Bundle not found',
         });
      }

      if (bundle.user.toString() !== req.user._id.toString()) {
         return res.status(403).json({
            success: false,
            message: 'Not authorized to update this bundle',
         });
      }

      bundle = await Bundle.findByIdAndUpdate(req.params.id, req.body, {
         new: true,
         runValidators: true,
      }).populate('products.product');

      res.json({
         success: true,
         bundle,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Delete bundle
// @route   DELETE /api/bundles/:id
export const deleteBundle = async (req, res) => {
   try {
      const bundle = await Bundle.findById(req.params.id);

      if (!bundle) {
         return res.status(404).json({
            success: false,
            message: 'Bundle not found',
         });
      }

      if (bundle.user.toString() !== req.user._id.toString()) {
         return res.status(403).json({
            success: false,
            message: 'Not authorized to delete this bundle',
         });
      }

      await bundle.deleteOne();

      await User.findByIdAndUpdate(req.user._id, {
         $pull: { savedBundles: bundle._id },
      });

      res.json({
         success: true,
         message: 'Bundle deleted',
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};
