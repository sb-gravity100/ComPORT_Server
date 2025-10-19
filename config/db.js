import mongoose, { Mongoose } from 'mongoose';

const connectDB = async () => {
   try {
      const uri = process.env.MONGO_URI;
      console.log(uri);
      const con = await mongoose.connect(uri, {
         dbName: 'main',
      });
      console.log(con.connection.db.databaseName);
      console.log('MongoDB Connected');
   } catch (err) {
      console.error('MongoDB connection error:', err);
      process.exit(1);
   }
};

export default connectDB;
