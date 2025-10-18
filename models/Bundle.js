import mongoose from 'mongoose';

const bundleSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },
      name: {
         type: String,
         required: [true, 'Bundle name is required'],
         trim: true,
      },
      products: [
         {
            product: {
               type: mongoose.Schema.Types.ObjectId,
               ref: 'Product',
               required: true,
            },
            category: {
               type: String,
               required: true,
            },
            selectedSource: {
               shopName: {
                  type: String,
                  required: true,
               },
               price: {
                  type: Number,
                  required: true,
                  min: 0,
               },
               productUrl: {
                  type: String,
                  required: true,
               },
               shipping: {
                  available: { type: Boolean, default: true },
                  cost: { type: Number, default: 0 },
                  estimatedDays: { type: String },
               },
            },
         },
      ],
      totalPrice: {
         type: Number,
         required: true,
         min: 0,
      },
      compatibilityScore: {
         type: Number,
         min: 0,
         max: 100,
         default: 0,
      },
      comfortProfile: {
         overall: { type: Number, default: 0 },
         ease: { type: Number, default: 0 },
         performance: { type: Number, default: 0 },
         noise: { type: Number, default: 0 },
         temperature: { type: Number, default: 0 },
      },
      isPublic: {
         type: Boolean,
         default: false,
      },
      notes: {
         type: String,
         maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      },
   },
   {
      timestamps: true,
      collection: 'mock_bundles',
   }
);

bundleSchema.index({ user: 1, createdAt: -1 });

const Bundle = mongoose.model('Bundle', bundleSchema);

export default Bundle;
