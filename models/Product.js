import mongoose from 'mongoose';

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
      price: {
         type: Number,
         required: [true, 'Price is required'],
         min: 0,
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
      comfortScore: {
         type: Number,
         default: 0,
         min: 0,
         max: 100,
      },
      reviews: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
         },
      ],
      averageRating: {
         type: Number,
         default: 0,
         min: 0,
         max: 5,
      },
      totalReviews: {
         type: Number,
         default: 0,
      },
      inStock: {
         type: Boolean,
         default: true,
      },
   },
   {
      timestamps: true,
      collection: 'mock_products',
   }
);

// Index for searching
productSchema.index({ name: 'text', brand: 'text', model: 'text' });
productSchema.index({ category: 1, price: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
