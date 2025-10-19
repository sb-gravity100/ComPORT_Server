import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import comfortRatingService from '../services/comfortRatingService.js';
import Product from '../models/Product.js';

dotenv.config();

async function updateAllScores() {
   try {
      console.log('Starting comfort score updates...');

      // Connect to database
      await connectDB();

      // Initialize model
      await comfortRatingService.initializeModel();

      // Get all products
      const products = await Product.find();
      console.log(`Found ${products.length} products`);

      let updated = 0;
      let failed = 0;

      for (let i = 0; i < products.length; i++) {
         const product = products[i];
         try {
            console.log(
               `Processing ${i + 1}/${products.length}: ${product.name}`
            );

            const comfortScore =
               await comfortRatingService.calculateProductComfortRating(
                  product._id
               );

            await Product.findByIdAndUpdate(product._id, {
               comfortScore: comfortScore.overall,
            });

            console.log(`  ✓ Score: ${comfortScore.overall}/100`);
            updated++;
         } catch (error) {
            console.error(`  ✗ Failed: ${error.message}`);
            failed++;
         }
      }

      console.log('\n=== Update Complete ===');
      console.log(`✓ Updated: ${updated}`);
      console.log(`✗ Failed: ${failed}`);
      console.log(`Total: ${products.length}`);

      process.exit(0);
   } catch (error) {
      console.error('✗ Update failed:', error);
      process.exit(1);
   }
}

updateAllScores();
