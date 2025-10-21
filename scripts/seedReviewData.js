import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

dotenv.config();

const reviewTemplates = {
   highPerformance: {
      rating: 5,
      comment: 'Excellent performance, handles demanding tasks with ease.',
      comfortRatings: { ease: 4, performance: 5 },
   },
   balanced: {
      rating: 4,
      comment: 'Good balance of performance and usability.',
      comfortRatings: { ease: 4, performance: 4 },
   },
   efficient: {
      rating: 5,
      comment: 'Very efficient, low power consumption and heat.',
      comfortRatings: { ease: 5, performance: 4 },
   },
   poor: {
      rating: 2,
      comment: 'Struggles with basic tasks and lacks responsiveness.',
      comfortRatings: { ease: 2, performance: 2 },
   },
};

async function seedReviews() {
   try {
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║         Seeding Comfort Reviews...         ║');
      console.log('╚════════════════════════════════════════════╝\n');

      await connectDB();

      let testUser = await User.findOne({ username: 'ml_reviewer' });
      if (!testUser) {
         testUser = await User.create({
            username: 'ml_reviewer',
            email: 'ml@comport.test',
            password: 'password123',
         });
         console.log('✓ Created test user for reviews');
      }

      const products = await Product.find();
      console.log(`✓ Found ${products.length} products\n`);

      let created = 0;
      let updated = 0;

      for (const product of products) {
         const specs = product.specifications || {};
         let template = reviewTemplates.balanced;

         switch (product.category) {
            case 'CPU': {
               const tdp = parseInt(specs.tdp) || 65;
               template =
                  tdp < 65
                     ? reviewTemplates.efficient
                     : tdp > 150
                     ? reviewTemplates.poor
                     : reviewTemplates.highPerformance;
               break;
            }
            case 'GPU': {
               const tdp = parseInt(specs.tdp) || 150;
               template =
                  tdp < 150
                     ? reviewTemplates.efficient
                     : tdp > 300
                     ? reviewTemplates.poor
                     : reviewTemplates.highPerformance;
               break;
            }
            case 'Storage': {
               template = specs.type?.toLowerCase().includes('ssd')
                  ? reviewTemplates.efficient
                  : reviewTemplates.poor;
               break;
            }
            case 'PSU': {
               template = specs.efficiencyRating?.includes('Gold')
                  ? reviewTemplates.efficient
                  : reviewTemplates.balanced;
               break;
            }
            case 'Case': {
               const fans = parseInt(specs.fanSupport) || 2;
               template =
                  fans > 5
                     ? reviewTemplates.highPerformance
                     : fans < 2
                     ? reviewTemplates.poor
                     : reviewTemplates.balanced;
               break;
            }
         }

         const variation = Math.random() * 0.4 - 0.2;
         const ease = Math.max(
            1,
            Math.min(5, template.comfortRatings.ease + variation)
         );
         const performance = Math.max(
            1,
            Math.min(5, template.comfortRatings.performance + variation)
         );

         const helpful =
            template.rating >= 5
               ? Math.floor(Math.random() * 6) + 5
               : template.rating === 4
               ? Math.floor(Math.random() * 5) + 2
               : template.rating === 3
               ? Math.floor(Math.random() * 4)
               : Math.floor(Math.random() * 2);

         try {
            const result = await Review.findOneAndUpdate(
               { user: testUser._id, product: product._id },
               {
                  rating: template.rating,
                  comment: template.comment,
                  comfortRatings: { ease, performance },
                  helpful,
               },
               { upsert: true, new: true }
            );

            if (result.wasNew) {
               created++;
               console.log(`✓ Created review for: ${product.name}`);
            } else {
               updated++;
               console.log(`↻ Updated review for: ${product.name}`);
            }
         } catch (error) {
            console.error(`✗ Failed for ${product.name}: ${error.message}`);
         }
      }

      console.log('\n=== Seeding Complete ===');
      console.log(`✓ Created: ${created}`);
      console.log(`↻ Updated: ${updated}`);
      console.log(`Total: ${products.length}`);

      process.exit(0);
   } catch (error) {
      console.error('✗ Seeding failed:', error);
      process.exit(1);
   }
}

seedReviews();
