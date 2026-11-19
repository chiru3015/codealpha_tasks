import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import { normalizeMongoUri } from './config/db.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

dotenv.config();

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
  },
];

const seedData = async () => {
  const rawUri = process.env.MONGODB_URI || '';
  if (!rawUri || rawUri.includes('<username>') || rawUri.includes('<password>')) {
    console.error('❌ Cannot seed: MONGODB_URI is not configured in server/.env.');
    process.exit(1);
  }

  const sanitizedUri = normalizeMongoUri(rawUri);

  try {
    console.log('Connecting to MongoDB Atlas for seeding...');
    const conn = await mongoose.connect(sanitizedUri, { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB Connected for Seeding: ${conn.connection.host}`);

    // Avoid duplicate users
    let adminUser = await User.findOne({ email: 'admin@codealpha.com' });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Store Administrator',
        email: 'admin@codealpha.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('👤 Created Admin Account: admin@codealpha.com');
    } else {
      console.log('👤 Admin account already exists (skipping creation)');
    }

    let customerUser = await User.findOne({ email: 'customer@codealpha.com' });
    if (!customerUser) {
      customerUser = await User.create({
        name: 'Jane Doe',
        email: 'customer@codealpha.com',
        password: 'customer123',
        role: 'customer',
      });
      console.log('👤 Created Customer Account: customer@codealpha.com');
    } else {
      console.log('👤 Customer account already exists (skipping creation)');
    }

    // Check existing products to avoid duplicates
    const existingCount = await Product.countDocuments();
    if (existingCount === 0) {
      const productsWithAdmin = sampleProducts.map((p) => ({
        ...p,
        createdBy: adminUser._id,
      }));
      const createdProducts = await Product.insertMany(productsWithAdmin);
      console.log(`📦 Seeded ${createdProducts.length} products into MongoDB Atlas.`);
    } else {
      console.log(`📦 Catalog already contains ${existingCount} products in MongoDB Atlas (skipping product seeding).`);
    }

    console.log('🎉 Seeding check complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
