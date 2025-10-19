import express from 'express';
import {
   getProductComfortRating,
   getBundleComfortRating,
   updateAllComfortScores,
   trainModel,
   getModelStatus,
} from '../controllers/mlController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/status', getModelStatus);
router.get('/comfort/product/:id', getProductComfortRating);
router.post('/comfort/bundle', getBundleComfortRating);

// Protected routes (admin only - add admin middleware if needed)
router.post('/comfort/update-all', protect, updateAllComfortScores);
router.post('/train', protect, trainModel);

export default router;
