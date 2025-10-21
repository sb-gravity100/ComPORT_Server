import fs from 'fs';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { create } from 'domain';

// Load user and product IDs
const users = [
   '68f2838362d3fcbe0eb2f643',
   '68f2c663d516e48003e2e117',
   '68f780a0c8780da851c2c55c',
   '68f78b3f67cd7722b40abbae',
];

const products = [
   '68f78a8bcbd59b222927e6e7',
   '68f78a8bcbd59b222927e6ea',
   '68f78a8bcbd59b222927e6ed',
   '68f78a8bcbd59b222927e6f7',
   '68f78a92cbd59b222927e700',
   '68f78a92cbd59b222927e701',
   '68f78a92cbd59b222927e702',
   '68f78a92cbd59b222927e704',
   '68f78a92cbd59b222927e705',
   '68f78a92cbd59b222927e706',
   '68f78a92cbd59b222927e707',
   '68f78a92cbd59b222927e70a',
   '68f78a92cbd59b222927e70f',
   '68f78a92cbd59b222927e712',
   '68f78a92cbd59b222927e715',
   '68f78aa1cbd59b222927e719',
   '68f78aa1cbd59b222927e71a',
   '68f78aa1cbd59b222927e71b',
   '68f78aa1cbd59b222927e71c',
   '68f78aa1cbd59b222927e71d',
   '68f78aa1cbd59b222927e71f',
   '68f78aa1cbd59b222927e720',
   '68f78aa1cbd59b222927e721',
   '68f78aa1cbd59b222927e722',
   '68f78aa1cbd59b222927e723',
   '68f78aa1cbd59b222927e727',
   '68f78aa1cbd59b222927e729',
   '68f78aa1cbd59b222927e72d',
   '68f78aa1cbd59b222927e730',
   '68f78aa1cbd59b222927e731',
];

// Track used user-product pairs
const usedPairs = new Set();

const reviews = [];

for (const user of users) {
   // Each user reviews 3–6 unique products
   const productCount = faker.number.int({ min: 20, max: 20 });
   const shuffledProducts = faker.helpers.shuffle(products);

   for (let i = 0; i < productCount; i++) {
      const product = shuffledProducts[i];
      const pairKey = `${user}_${product}`;
      if (usedPairs.has(pairKey)) continue;

      usedPairs.add(pairKey);

      reviews.push({
         user: {
            $oid: user,
         },
         product: {
            $oid: product,
         },
         rating: faker.number.int({ min: 1, max: 5 }),
         comment: faker.lorem.sentence({ min: 10, max: 50 }),
         comfortRatings: {
            ease: faker.number.int({ min: 1, max: 5 }),
            performance: faker.number.int({ min: 1, max: 5 }),
         },
         helpful: faker.number.int({ min: 0, max: 10 }),
         createdAt: { $date: faker.date.past({ years: 1 }) },
         updatedAt: { $date: faker.date.recent({ days: 30 }) },
      });
   }
}

// Save to file
fs.writeFileSync('mock_reviews.json', JSON.stringify(reviews, null, 2));
console.log(`✅ Generated ${reviews.length} reviews`);
