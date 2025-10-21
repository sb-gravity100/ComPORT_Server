// server.js
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import bundleRoutes from './routes/bundles.js';
import mlRoutes from './routes/ml.js';
import errorHandler from './middleware/errorHandler.js';
import comfortRatingService from './services/comfortRatingService.js';
import path from 'path';
import { mergeDuplicateProducts } from './utils/mergeProducts.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
app.use('/static', express.static(path.resolve('./static')));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bundles', bundleRoutes);
app.use('/api/ml', mlRoutes);

// Health check
app.get('/', (req, res) => {
   res.json({
      message: 'ComPORT API is running',
      status: 'OK',
      timestamp: new Date(),
      statusCode: 200,
      mlStatus: comfortRatingService.isModelReady ? 'Ready' : 'Initializing',
   });
});

// Error Handler
app.use(errorHandler);

// Connect Database and Initialize ML Model
connectDB().then(async () => {
   // Initialize the ML model
   try {
      console.log('Initializing ML Comfort Rating System...');
      await comfortRatingService.initializeModel();
      await mergeDuplicateProducts();
      console.log('✓ ML System Ready');
   } catch (error) {
      console.error('✗ ML System initialization failed:', error);
   }

   app.listen(PORT, () => {
      console.log(path.resolve('./static'));
      console.log(`Server running on http://localhost:${PORT}`);
   });
});
