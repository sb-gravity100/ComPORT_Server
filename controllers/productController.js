import Product from '../models/Product.js';
import Review from '../models/Review.js';

// @desc    Get all products with filters
// @route   GET /api/products
export const getProducts = async (req, res) => {
   try {
      const { category, minPrice, maxPrice, search, sort } = req.query;
      const query = {};

      if (category) query.category = category;
      if (minPrice || maxPrice) {
         query.price = {};
         if (minPrice) query.price.$gte = Number(minPrice);
         if (maxPrice) query.price.$lte = Number(maxPrice);
      }
      if (search) {
         query.$text = { $search: search };
      }

      let sortOption = {};
      if (sort === 'price_asc') sortOption.price = 1;
      else if (sort === 'price_desc') sortOption.price = -1;
      else if (sort === 'rating') sortOption.averageRating = -1;
      else sortOption.createdAt = -1;

      const products = await Product.find(query).sort(sortOption);

      res.json({
         success: true,
         count: products.length,
         products,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get single product
// @route   GET /api/products/:id
export const getProduct = async (req, res) => {
   try {
      const product = await Product.findById(req.params.id).populate({
         path: 'reviews',
         populate: { path: 'user', select: 'username' },
      });

      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      res.json({
         success: true,
         product,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Create product review
// @route   POST /api/products/:id/reviews
export const createReview = async (req, res) => {
   try {
      const { rating, comment, comfortRatings } = req.body;
      const productId = req.params.id;

      const product = await Product.findById(productId);
      if (!product) {
         return res.status(404).json({
            success: false,
            message: 'Product not found',
         });
      }

      // Check if user already reviewed
      const existingReview = await Review.findOne({
         user: req.user._id,
         product: productId,
      });

      if (existingReview) {
         return res.status(400).json({
            success: false,
            message: 'You have already reviewed this product',
         });
      }

      const review = await Review.create({
         user: req.user._id,
         product: productId,
         rating,
         comment,
         comfortRatings,
      });

      product.reviews.push(review._id);

      // Update average rating
      const allReviews = await Review.find({ product: productId });
      product.averageRating =
         allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;
      product.totalReviews = allReviews.length;

      await product.save();

      res.status(201).json({
         success: true,
         review,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};

// @desc    Get product reviews
// @route   GET /api/products/:id/reviews
export const getReviews = async (req, res) => {
   try {
      const reviews = await Review.find({ product: req.params.id })
         .populate('user', 'username')
         .sort('-createdAt');

      res.json({
         success: true,
         count: reviews.length,
         reviews,
      });
   } catch (error) {
      res.status(500).json({
         success: false,
         message: error.message,
      });
   }
};
