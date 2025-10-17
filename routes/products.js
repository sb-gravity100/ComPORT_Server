import express from 'express';
import {
   getProducts,
   getProduct,
   createReview,
   getReviews,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/:id/reviews', protect, createReview);
router.get('/:id/reviews', getReviews);

export default router;
