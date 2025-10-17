import mongoose from 'mongoose';

const schema = new mongoose.Schema(
   {
      username: String,
      email: String,
      password: String,
   },
   {
      collection: 'users',
      timestamps: {
         createdAt: true,
         updatedAt: false,
      },
   }
);

const User = mongoose.model(schema);

export default User;
