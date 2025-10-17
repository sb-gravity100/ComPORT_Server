import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
   {
      username: {
         type: String,
         required: [true, 'Username is required'],
         unique: true,
         trim: true,
         minlength: [3, 'Username must be at least 3 characters'],
         maxlength: [30, 'Username cannot exceed 30 characters'],
      },
      email: {
         type: String,
         required: [true, 'Email is required'],
         unique: true,
         lowercase: true,
         trim: true,
         match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      },
      password: {
         type: String,
         required: [true, 'Password is required'],
         minlength: [6, 'Password must be at least 6 characters'],
         select: false,
      },
      savedBundles: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Bundle',
         },
      ],
      reviews: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
         },
      ],
   },
   {
      timestamps: true,
      collection: 'users',
   }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
   if (!this.isModified('password')) return next();
   this.password = await bcrypt.hash(this.password, 12);
   next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
   return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
