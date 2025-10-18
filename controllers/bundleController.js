import Bundle from '../models/Bundle.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// @desc    Create new bundle
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

         totalPrice += part.selectedPrice || 0;
      }

      const bundle = await Bundle.create({
         user: req.user._id,
         name,
         products,
         totalPrice,
         compatibilityScore,
         comfortProfile,
         isPublic,
         notes,
      });

      await User.findByIdAndUpdate(req.user._id, {
         $push: { savedBundles: bundle._id },
      });

      res.status(201).json({
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

// @desc    Get user bundles
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

// @desc    Get single bundle
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
