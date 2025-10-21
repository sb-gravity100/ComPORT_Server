import Product from '../models/Product';

export async function mergeDuplicateProducts() {
   const products = await Product.find();

   // Group by brand + model
   const groups = {};

   products.forEach((product) => {
      const key = `${product.brand.toLowerCase()}_${product.model.toLowerCase()}`;
      if (!groups[key]) {
         groups[key] = [];
      }
      groups[key].push(product);
   });

   let merged = 0;
   let kept = 0;

   // Process each group
   for (const [key, duplicates] of Object.entries(groups)) {
      if (duplicates.length <= 1) {
         kept++;
         continue;
      }

      // Keep the first product, merge others into it
      const [primary, ...others] = duplicates;

      // Merge sources (avoid duplicates by shopName)
      const allSources = [...primary.sources];
      const existingShops = new Set(primary.sources.map((s) => s.shopName));

      others.forEach((dup) => {
         dup.sources.forEach((source) => {
            if (!existingShops.has(source.shopName)) {
               allSources.push(source);
               existingShops.add(source.shopName);
            }
         });
      });

      // Merge ratings by source
      const allRatingsBySource = [...(primary.ratings?.bySource || [])];
      const existingRatingShops = new Set(
         allRatingsBySource.map((r) => r.shopName)
      );

      others.forEach((dup) => {
         (dup.ratings?.bySource || []).forEach((rating) => {
            if (!existingRatingShops.has(rating.shopName)) {
               allRatingsBySource.push(rating);
               existingRatingShops.add(rating.shopName);
            }
         });
      });

      // Merge platform reviews (prevent duplicate user reviews)
      const allReviews = [...primary.platformReviews];
      const existingUserIds = new Set(
         primary.platformReviews.map((r) => r.toString())
      );

      others.forEach((dup) => {
         dup.platformReviews.forEach((reviewId) => {
            const reviewIdStr = reviewId.toString();
            if (!existingUserIds.has(reviewIdStr)) {
               allReviews.push(reviewId);
               existingUserIds.add(reviewIdStr);
            }
         });
      });

      // Update primary product
      primary.sources = allSources;
      primary.ratings.bySource = allRatingsBySource;
      primary.platformReviews = allReviews;

      // Recalculate price range and ratings
      primary.updatePriceRange();
      primary.updateRatings();

      await primary.save();

      // Clean up duplicate reviews by same user (keep newest)
      const Review = (await import('../models/Review.js')).default;
      const reviews = await Review.find({
         _id: { $in: allReviews },
      }).sort('-createdAt');

      const seenUsers = new Set();
      const toDelete = [];

      reviews.forEach((review) => {
         const userId = review.user.toString();
         if (seenUsers.has(userId)) {
            toDelete.push(review._id);
         } else {
            seenUsers.add(userId);
         }
      });

      if (toDelete.length > 0) {
         await Review.deleteMany({ _id: { $in: toDelete } });
         primary.platformReviews = primary.platformReviews.filter(
            (id) => !toDelete.some((delId) => delId.equals(id))
         );
         await primary.save();
      }

      // Delete duplicates
      await Product.deleteMany({
         _id: { $in: others.map((o) => o._id) },
      });

      merged += others.length;
      kept++;
   }

   return {
      totalGroups: Object.keys(groups).length,
      merged,
      kept,
   };
}
