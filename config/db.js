import mongoose, { Mongoose } from 'mongoose';

const connectDB = async () => {
   try {
      const uri =
         process.env.MONGO_URI &&
         process.env.MONGO_URI.replace('<db_password>', process.env.MONGO_PASS);
      const con = await mongoose.connect(uri, {
         dbName: 'main',
      });
      console.log(con.connection.db.databaseName);
      console.log('MongoDB Connected');
   } catch (err) {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
   }
};

export default connectDB;
