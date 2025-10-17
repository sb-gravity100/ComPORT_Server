import express from 'express';
import {
   getProducts,
   getProduct,
   compareProductSources,
   getGroupedProducts,
   addProductSource,
   createReview,
   getReviews,
   getShops,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/grouped', getGroupedProducts);
router.get('/shops/list', getShops);
router.get('/:id', getProduct);
router.get('/:id/compare', compareProductSources);
router.get('/:id/reviews', getReviews);

// Protected routes
router.post('/:id/sources', protect, addProductSource);
router.post('/:id/reviews', protect, createReview);

export default router;
