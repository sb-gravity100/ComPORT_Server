import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
   shopName: {
      type: String,
      required: true,
   },
   shopUrl: {
      type: String,
      required: true,
   },
   productUrl: {
      type: String,
      required: true,
   },
   price: {
      type: Number,
      required: true,
      min: 0,
   },
   inStock: {
      type: Boolean,
      default: true,
   },
   lastUpdated: {
      type: Date,
      default: Date.now,
   },
   shipping: {
      available: { type: Boolean, default: true },
      cost: { type: Number, default: 0 },
      estimatedDays: { type: String },
   },
});

const productSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: [true, 'Product name is required'],
         trim: true,
      },
      category: {
         type: String,
         required: [true, 'Category is required'],
         enum: ['CPU', 'GPU', 'RAM', 'Motherboard', 'Storage', 'PSU', 'Case'],
      },
      brand: {
         type: String,
         required: true,
      },
      model: {
         type: String,
         required: true,
      },
      // Price aggregation
      priceRange: {
         min: {
            type: Number,
            required: true,
            min: 0,
         },
         max: {
            type: Number,
            required: true,
            min: 0,
         },
         average: {
            type: Number,
            required: true,
            min: 0,
         },
      },
      // Multiple sources
      sources: [sourceSchema],

      // Aggregate availability
      availableAt: {
         type: Number,
         default: 0, // Number of shops that have it in stock
      },
      totalSources: {
         type: Number,
         default: 0,
      },

      specifications: {
         type: Map,
         of: String,
      },
      compatibilityTags: [
         {
            type: String,
         },
      ],
      imageUrl: {
         type: String,
      },

      // Collective ratings from all sources
      ratings: {
         overall: {
            average: { type: Number, default: 0, min: 0, max: 5 },
            count: { type: Number, default: 0 },
         },
         bySource: [
            {
               shopName: String,
               average: { type: Number, min: 0, max: 5 },
               count: { type: Number, default: 0 },
            },
         ],
      },

      // User reviews on our platform
      platformReviews: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
         },
      ],

      comfortScore: {
         type: Number,
         default: 0,
         min: 0,
         max: 100,
      },

      // For grouping similar products
      groupKey: {
         type: String,
         index: true,
      },
   },
   {
      timestamps: true,
      collection: 'mock_products',
   }
);

// Indexes for searching and filtering
productSchema.index({ name: 'text', brand: 'text', model: 'text' });
productSchema.index({ category: 1, 'priceRange.average': 1 });
productSchema.index({ 'sources.shopName': 1 });

// Generate groupKey before saving
productSchema.pre('save', function (next) {
   if (!this.groupKey) {
      // Create a normalized key for grouping similar products
      const normalized = `${this.brand}_${this.model}`
         .toLowerCase()
         .replace(/[^a-z0-9]/g, '_');
      this.groupKey = normalized;
   }
   next();
});

// Method to update price range
productSchema.methods.updatePriceRange = function () {
   if (this.sources.length === 0) return;

   const prices = this.sources.map((s) => s.price);
   this.priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
   };

   this.availableAt = this.sources.filter((s) => s.inStock).length;
   this.totalSources = this.sources.length;
};

// Method to update collective ratings
productSchema.methods.updateRatings = function () {
   if (this.ratings.bySource.length === 0) return;

   let totalRating = 0;
   let totalCount = 0;

   this.ratings.bySource.forEach((source) => {
      totalRating += source.average * source.count;
      totalCount += source.count;
   });

   this.ratings.overall = {
      average: totalCount > 0 ? totalRating / totalCount : 0,
      count: totalCount,
   };
};

const Product = mongoose.model('Product', productSchema);

export default Product;
