import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

dotenv.config();

// Sample review templates for different comfort aspects
const reviewTemplates = {
   highPerformance: {
      rating: 5,
      comment: 'Excellent performance, handles demanding tasks with ease.',
      comfortRatings: { ease: 4, performance: 5, noise: 4, temperature: 4 },
   },
   silent: {
      rating: 5,
      comment: 'Very quiet operation, perfect for quiet environments.',
      comfortRatings: { ease: 4, performance: 4, noise: 5, temperature: 4 },
   },
   cool: {
      rating: 5,
      comment: 'Stays cool even under heavy load, great thermal performance.',
      comfortRatings: { ease: 4, performance: 4, noise: 4, temperature: 5 },
   },
   balanced: {
      rating: 4,
      comment: 'Good balance of performance, noise, and temperature.',
      comfortRatings: { ease: 4, performance: 4, noise: 4, temperature: 4 },
   },
   hot: {
      rating: 3,
      comment: 'Runs quite hot under load, needs good cooling.',
      comfortRatings: { ease: 3, performance: 4, noise: 3, temperature: 2 },
   },
   loud: {
      rating: 3,
      comment: 'Performance is good but fans can get noisy.',
      comfortRatings: { ease: 3, performance: 4, noise: 2, temperature: 3 },
   },
   efficient: {
      rating: 5,
      comment: 'Very efficient, low power consumption and heat.',
      comfortRatings: { ease: 5, performance: 4, noise: 4, temperature: 5 },
   },
};

async function seedReviews() {
   try {
      console.log('Starting review data seeding...');

      await connectDB();

      // Get or create a test user
      let testUser = await User.findOne({ username: 'ml_reviewer' });
      if (!testUser) {
         testUser = await User.create({
            username: 'ml_reviewer',
            email: 'ml@comport.test',
            password: 'password123',
         });
         console.log('Created test user for reviews');
      }

      // Get all products
      const products = await Product.find();
      console.log(`Found ${products.length} products`);

      let created = 0;
      let skipped = 0;

      for (const product of products) {
         // Check if product already has reviews
         const existingReviews = await Review.countDocuments({
            product: product._id,
         });

         if (existingReviews > 0) {
            skipped++;
            continue;
         }

         // Select appropriate review template based on category and specs
         let template = reviewTemplates.balanced;

         const specs = product.specifications || {};

         switch (product.category) {
            case 'CPU':
               const cpuTDP = parseInt(specs.TDP?.replace('W', '')) || 65;
               if (cpuTDP > 150) template = reviewTemplates.hot;
               else if (cpuTDP < 65) template = reviewTemplates.efficient;
               else template = reviewTemplates.highPerformance;
               break;

            case 'GPU':
               const gpuTDP = parseInt(specs.TDP?.replace('W', '')) || 150;
               if (gpuTDP > 300) template = reviewTemplates.hot;
               else if (gpuTDP < 150) template = reviewTemplates.efficient;
               else template = reviewTemplates.highPerformance;
               break;

            case 'Storage':
               if (specs.type?.toLowerCase().includes('ssd')) {
                  template = reviewTemplates.silent;
               } else {
                  template = reviewTemplates.loud;
               }
               break;

            case 'PSU':
               if (
                  specs.efficiency?.includes('Platinum') ||
                  specs.efficiency?.includes('Titanium')
               ) {
                  template = reviewTemplates.efficient;
               } else {
                  template = reviewTemplates.balanced;
               }
               break;

            case 'Case':
               const fans = parseInt(specs.fans) || 2;
               if (fans > 5) template = reviewTemplates.cool;
               else if (fans < 2) template = reviewTemplates.hot;
               else template = reviewTemplates.balanced;
               break;

            default:
               template = reviewTemplates.balanced;
         }

         // Create review with some variation
         const variation = Math.random() * 0.4 - 0.2; // -0.2 to +0.2

         try {
            await Review.create({
               user: testUser._id,
               product: product._id,
               rating: template.rating,
               comment: template.comment,
               comfortRatings: {
                  ease: Math.max(
                     1,
                     Math.min(5, template.comfortRatings.ease + variation)
                  ),
                  performance: Math.max(
                     1,
                     Math.min(
                        5,
                        template.comfortRatings.performance + variation
                     )
                  ),
                  noise: Math.max(
                     1,
                     Math.min(5, template.comfortRatings.noise + variation)
                  ),
                  temperature: Math.max(
                     1,
                     Math.min(
                        5,
                        template.comfortRatings.temperature + variation
                     )
                  ),
               },
            });

            created++;
            console.log(`✓ Created review for: ${product.name}`);
         } catch (error) {
            console.error(`✗ Failed for ${product.name}: ${error.message}`);
         }
      }

      console.log('\n=== Seeding Complete ===');
      console.log(`✓ Created: ${created}`);
      console.log(`⊝ Skipped: ${skipped}`);
      console.log(`Total: ${products.length}`);

      process.exit(0);
   } catch (error) {
      console.error('✗ Seeding failed:', error);
      process.exit(1);
   }
}

seedReviews();
