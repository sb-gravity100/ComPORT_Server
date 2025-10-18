import Bundle from '../models/Bundle.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// @desc    Create new bundle
// @route   POST /api/bundles
export const createBundle = async (req, res) => {
   try {
      const {
         name,
         products = [], // Now expecting array of {product: id, category: string}
         sources = {}, // New: {categoryId: sourceData}
         notes = '',
         compatibilityScore = 0,
         comfortProfile = {},
         isPublic = false,
      } = req.body;

      let totalPrice = 0;
      const bundleProducts = [];

      // Validate and calculate price from selected sources
      for (const item of products) {
         const product = await Product.findById(item.product);
         if (!product) {
            return res.status(404).json({
               success: false,
               message: `Product ${item.product} not found`,
            });
         }

         // Get the selected source for this category
         const selectedSource = sources[item.category];

         if (!selectedSource) {
            return res.status(400).json({
               success: false,
               message: `No source selected for ${item.category}`,
            });
         }

         // Verify the source exists in the product
         const sourceExists = product.sources.some(
            (s) =>
               s.shopName === selectedSource.shopName &&
               s.price === selectedSource.price
         );

         if (!sourceExists) {
            return res.status(400).json({
               success: false,
               message: `Invalid source for ${product.name}`,
            });
         }

         bundleProducts.push({
            product: product._id,
            category: item.category,
            selectedSource: {
               shopName: selectedSource.shopName,
               price: selectedSource.price,
               productUrl: selectedSource.productUrl,
               shipping: selectedSource.shipping,
            },
         });

         totalPrice += selectedSource.price;
      }

      const bundle = await Bundle.create({
         user: req.user._id,
         name,
         products: bundleProducts,
         totalPrice,
         compatibilityScore,
         comfortProfile,
         isPublic,
         notes,
      });

      await User.findByIdAndUpdate(req.user._id, {
         $push: { savedBundles: bundle._id },
      });

      const populatedBundle = await Bundle.findById(bundle._id).populate(
         'products.product'
      );

      res.status(201).json({
         success: true,
         bundle: populatedBundle,
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
