import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import Product from './models/Product.js';
import User from './models/User.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

let dbConnectionStatus = {
  connected: false,
  readyState: 0,
  error: null,
  host: null,
};

// Connect to MongoDB Atlas
const initDatabase = async () => {
  const result = await connectDB();
  dbConnectionStatus.readyState = mongoose.connection.readyState;

  if (result.success) {
    dbConnectionStatus.connected = true;
    dbConnectionStatus.host = result.host;
    dbConnectionStatus.error = null;

    // Seed database only after verified MongoDB Atlas connection & avoid duplicates
    try {
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        console.log('🌱 MongoDB Atlas database is empty. Seeding initial catalog & demo accounts...');

        let adminUser = await User.findOne({ email: 'admin@codealpha.com' });
        if (!adminUser) {
          adminUser = await User.create({
            name: 'Store Administrator',
            email: 'admin@codealpha.com',
            password: 'admin123',
            role: 'admin',
          });
        }

        let customerUser = await User.findOne({ email: 'customer@codealpha.com' });
        if (!customerUser) {
          customerUser = await User.create({
            name: 'Jane Doe',
            email: 'customer@codealpha.com',
            password: 'customer123',
            role: 'customer',
          });
        }

        const sampleProducts = [
          {
            name: 'Wireless Noise-Cancelling Headphones',
            description: 'Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and crystal-clear high fidelity sound.',
            price: 199.99,
            category: 'Audio',
            imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
            stock: 25,
            rating: 4.8,
            numReviews: 124,
            isFeatured: true,
            createdBy: adminUser._id,
          },
          {
            name: 'Smart Fitness Watch Series 5',
            description: 'Track your health metrics, heart rate, sleep quality, and daily workouts with an ultra-bright AMOLED always-on display.',
            price: 149.50,
            category: 'Wearables',
            imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
            stock: 40,
            rating: 4.6,
            numReviews: 89,
            isFeatured: true,
            createdBy: adminUser._id,
          },
          {
            name: 'Minimalist Mechanical Keyboard',
            description: 'Compact 75% hot-swappable mechanical keyboard featuring tactile brown switches, per-key RGB backlighting, and aluminum frame.',
            price: 89.99,
            category: 'Electronics',
            imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
            stock: 18,
            rating: 4.9,
            numReviews: 215,
            isFeatured: true,
            createdBy: adminUser._id,
          },
          {
            name: 'Ergonomic Vertical Wireless Mouse',
            description: 'Promotes natural wrist posture with 57-degree vertical angle, silent clicks, adjustable 4000 DPI sensor, and multi-device pairing.',
            price: 49.99,
            category: 'Electronics',
            imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
            stock: 35,
            rating: 4.5,
            numReviews: 67,
            isFeatured: false,
            createdBy: adminUser._id,
          },
          {
            name: 'Ultra-Clear 4K Streaming Webcam',
            description: 'High-definition 4K webcam with dual stereo noise-reducing microphones, autofocus, and privacy shutter for streaming and conferencing.',
            price: 79.99,
            category: 'Electronics',
            imageUrl: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=80',
            stock: 15,
            rating: 4.4,
            numReviews: 42,
            isFeatured: false,
            createdBy: adminUser._id,
          },
          {
            name: 'Vintage Leather Travel Backpack',
            description: 'Handcrafted water-resistant canvas and full-grain leather laptop backpack with padded compartment for up to 16-inch laptops.',
            price: 119.00,
            category: 'Accessories',
            imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
            stock: 20,
            rating: 4.7,
            numReviews: 98,
            isFeatured: true,
            createdBy: adminUser._id,
          },
        ];

        await Product.insertMany(sampleProducts);
        console.log(`✅ Successfully seeded ${sampleProducts.length} initial products into MongoDB Atlas.`);
      }
    } catch (seedErr) {
      console.warn('⚠️ Seeding note:', seedErr.message);
    }
  } else {
    dbConnectionStatus.connected = false;
    dbConnectionStatus.error = result.error;
    console.error('⚠️  CRITICAL: Real MongoDB Atlas database is not connected.');
    console.error(`   Reason: ${result.error}`);
    console.error('   Database-dependent operations will be halted or return 503.');
  }
};

initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Database Status Gate Middleware
export const checkDatabaseConnected = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // Check if explicit fallback is enabled by developer
  if (process.env.ENABLE_IN_MEMORY_FALLBACK === 'true') {
    res.setHeader('X-Database-Mode', 'explicit-in-memory-fallback');
    return next();
  }

  // Strict mode: Fail clearly without silent fallback
  return res.status(503).json({
    message: 'Database Service Unavailable: MongoDB Atlas is not connected.',
    readyState: mongoose.connection.readyState,
    error: dbConnectionStatus.error || 'Connection failed',
  });
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CodeAlpha E-Commerce API',
    database: {
      connected: ready,
      readyState: mongoose.connection.readyState,
      status: ready ? 'CONNECTED_TO_MONGODB_ATLAS' : 'FAILED_OR_DISCONNECTED',
      error: ready ? null : dbConnectionStatus.error,
      clusterHost: ready ? dbConnectionStatus.host : null,
    },
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('CodeAlpha E-commerce Backend API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
