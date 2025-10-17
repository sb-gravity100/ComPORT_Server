import express from 'express';
import {
   createBundle,
   getUserBundles,
   getBundle,
   updateBundle,
   deleteBundle,
} from '../controllers/bundleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.route('/').get(getUserBundles).post(createBundle);

router.route('/:id').get(getBundle).put(updateBundle).delete(deleteBundle);

export default router;
