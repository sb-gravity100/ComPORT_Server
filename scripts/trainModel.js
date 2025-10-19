// scripts/trainModel.js
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import comfortRatingService from '../services/comfortRatingService.js';

dotenv.config();

async function trainModel() {
   try {
      console.log('Starting model training...');

      // Connect to database
      await connectDB();

      // Initialize model
      await comfortRatingService.initializeModel();

      // Train with current data
      await comfortRatingService.trainModel();

      console.log('✓ Training completed successfully');
      process.exit(0);
   } catch (error) {
      console.error('✗ Training failed:', error);
      process.exit(1);
   }
}

trainModel();
