import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
   {
      user: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },
      product: {
         type: mongoose.Schema.Types.ObjectId,
         ref: 'Product',
         required: true,
      },
      rating: {
         type: Number,
         required: [true, 'Rating is required'],
         min: 1,
         max: 5,
      },
      comment: {
         type: String,
         required: [true, 'Comment is required'],
         maxlength: [500, 'Comment cannot exceed 500 characters'],
      },
      comfortRatings: {
         ease: { type: Number, min: 1, max: 5 },
         performance: { type: Number, min: 1, max: 5 },
      },
      helpful: {
         type: Number,
         default: 0,
      },
   },
   {
      timestamps: true,
      collection: 'mock_reviews',
   }
);

// Compound index to prevent duplicate reviews
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
