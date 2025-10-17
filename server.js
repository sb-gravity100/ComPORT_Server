import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan'; // ✅ Add this line
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
// import productRoutes from './routes/products.js';
// import bundleRoutes from './routes/bundles.js';
import errorHandler from './middleware/errorHandler.js';
import Bundle from './models/Bundle.js';
import Product from './models/Product.js';
import Review from './models/Review.js';
import User from './models/User.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // ✅ Add this line to log requests

// CORS
app.use((req, res, next) => {
   res.header('Access-Control-Allow-Origin', '*');
   res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
   );
   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
   next();
});

// Routes
app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/bundles', bundleRoutes);

// Health check
app.get('/', (req, res) => {
   res.json({
      message: 'ComPORT API is running',
      status: 'OK',
      timestamp: new Date(),
      statusCode: 200,
   });
});

// Error Handler
app.use(errorHandler);

// Connect Database
connectDB().then(async () => {
   app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
   });
});
