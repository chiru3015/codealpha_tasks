import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import User from './models/User.js';
import { normalizeMongoUri } from './config/db.js';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {}

const products = [
  // Mobiles
  ['Samsung Galaxy M35 5G', 'Mobiles', 17999],
  ['Redmi Note 14 5G', 'Mobiles', 18999],
  ['Realme Narzo 70 5G', 'Mobiles', 14499],
  ['Motorola Edge 50 Fusion', 'Mobiles', 22999],

  // Computers and accessories
  ['HP 15s Laptop', 'Computers & Accessories', 52990],
  ['Lenovo IdeaPad Slim 3', 'Computers & Accessories', 49990],
  ['Logitech Wireless Keyboard', 'Computers & Accessories', 1499],
  ['Portable 1TB SSD', 'Computers & Accessories', 6499],

  // Fashion
  ['Mens Cotton Casual Shirt', 'Fashion', 899],
  ['Womens Printed Kurti', 'Fashion', 1199],
  ['Mens Slim Fit Jeans', 'Fashion', 1499],
  ['Womens Everyday Handbag', 'Fashion', 1799],

  // Home and kitchen
  ['Nonstick Cookware Set', 'Home & Kitchen', 2499],
  ['Stainless Steel Pressure Cooker', 'Home & Kitchen', 1899],
  ['750W Mixer Grinder', 'Home & Kitchen', 2999],
  ['Insulated Water Bottle', 'Home & Kitchen', 699],

  // Home appliances
  ['Digital Air Fryer', 'Home Appliances', 4999],
  ['Portable Room Heater', 'Home Appliances', 2299],
  ['Automatic Electric Kettle', 'Home Appliances', 1199],
  ['Tabletop Induction Cooktop', 'Home Appliances', 2199],

  // Footwear
  ['Mens Running Shoes', 'Footwear', 1999],
  ['Womens Everyday Sandals', 'Footwear', 799],

  // Beauty and personal care
  ['Daily Skincare Combo', 'Beauty & Personal Care', 899],
  ['Professional Hair Dryer', 'Beauty & Personal Care', 1499],

  // Grocery
  ['Premium Basmati Rice 5kg', 'Grocery', 699],
  ['Mixed Dry Fruits Gift Pack', 'Grocery', 999],

  // Books
  ['Python Programming Handbook', 'Books', 599],
  ['Productivity Journal', 'Books', 299],

  // Toys and games
  ['Creative Building Blocks Set', 'Toys & Games', 799],
  ['Remote Control Racing Car', 'Toys & Games', 1299],

  // Baby products
  ['Cotton Baby Clothing Set', 'Baby Products', 699],
  ['Baby Care Essentials Kit', 'Baby Products', 899],

  // Sports and fitness
  ['Anti-Slip Yoga Mat', 'Sports & Fitness', 599],
  ['Adjustable Dumbbell Set', 'Sports & Fitness', 2999],

  // Automotive
  ['Portable Car Vacuum Cleaner', 'Automotive', 1999],
  ['Digital Tyre Inflator', 'Automotive', 1799],

  // Pet supplies
  ['Premium Dog Food Pack', 'Pet Supplies', 799],
  ['Pet Grooming Brush', 'Pet Supplies', 349],

  // Furniture
  ['Ergonomic Office Chair', 'Furniture', 6999],
  ['Modern Wooden Side Table', 'Furniture', 1499],

  // Jewellery
  ['Silver Plated Necklace', 'Jewellery', 999],
  ['Traditional Fashion Earrings', 'Jewellery', 499],

  // Watches
  ['Classic Analog Wrist Watch', 'Watches', 1799],
  ['Fitness Smart Band', 'Watches', 1299],

  // Luggage
  ['Cabin Size Trolley Bag', 'Luggage & Bags', 2999],
  ['Travel Laptop Backpack', 'Luggage & Bags', 1299],

  // Office and stationery
  ['Premium Notebook Pack', 'Office & Stationery', 249],
  ['Desktop Organizer', 'Office & Stationery', 399],

  // Musical instruments
  ['Acoustic Guitar', 'Musical Instruments', 5999],
  ['Electronic Music Keyboard', 'Musical Instruments', 3999],

  // Garden and outdoors
  ['Gardening Tool Kit', 'Garden & Outdoors', 799],
  ['Decorative Planter Set', 'Garden & Outdoors', 599],

  // Health and wellness
  ['Digital Thermometer', 'Health & Wellness', 399],
  ['Electric Heating Pad', 'Health & Wellness', 799],

  // Video games
  ['Wireless Gaming Controller', 'Video Games', 2499],
  ['Gaming Headset with Microphone', 'Video Games', 2999],

  // Tools and hardware
  ['Cordless Power Drill', 'Tools & Hardware', 3499],
  ['Precision Screwdriver Kit', 'Tools & Hardware', 499],
];

const categoryImages = {
  Mobiles: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
  'Computers & Accessories': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
  Fashion: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800',
  'Home & Kitchen': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800',
  'Home Appliances': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
  Footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
  'Beauty & Personal Care': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800',
  Grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
  Books: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
  'Toys & Games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=800',
  'Baby Products': 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800',
  'Sports & Fitness': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800',
  Automotive: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800',
  'Pet Supplies': 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800',
  Furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
  Jewellery: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800',
  Watches: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
  'Luggage & Bags': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
  'Office & Stationery': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
  'Musical Instruments': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
  'Garden & Outdoors': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
  'Health & Wellness': 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
  'Video Games': 'https://images.unsplash.com/photo-1486572788966-cfd3df1f5b42?w=800',
  'Tools & Hardware': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800',
};

const runImport = async () => {
  const rawUri = process.env.MONGODB_URI || '';

  if (!rawUri || rawUri.includes('<username>') || rawUri.includes('<password>')) {
    throw new Error('MONGODB_URI is not configured in server/.env');
  }

  await mongoose.connect(normalizeMongoUri(rawUri), {
    serverSelectionTimeoutMS: 10000,
  });

  console.log('Connected to MongoDB Atlas.');

  // Correct the two existing sample products to INR.
  await Product.updateOne(
    { name: 'Atlas Persistent Gaming Headset' },
    { $set: { price: 2499 } }
  );

  await Product.updateOne(
    { name: 'Wireless Mouse' },
    {
      $set: {
        price: 599,
        imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
      },
    }
  );

  const admin = await User.findOne({ email: 'admin@codealpha.com' }).select('_id');

  const existing = await Product.find({}, 'name category').lean();
  const existingKeys = new Set(
    existing.map((p) => `${p.category}::${p.name}`.toLowerCase())
  );

  const newProducts = products
    .filter(([name, category]) =>
      !existingKeys.has(`${category}::${name}`.toLowerCase())
    )
    .map(([name, category, price], index) => ({
      name,
      category,
      price,
      description: `${name} is designed for everyday use, combining practical features, quality materials and convenient performance.`,
      imageUrl: categoryImages[category],
      stock: 10 + (index % 41),
      rating: Number((4.1 + (index % 9) * 0.1).toFixed(1)),
      numReviews: 15 + index * 3,
      isFeatured: index % 12 === 0,
      ...(admin ? { createdBy: admin._id } : {}),
    }));

  if (newProducts.length > 0) {
    const inserted = await Product.insertMany(newProducts);
    console.log(`Added ${inserted.length} new products.`);
  } else {
    console.log('All catalogue products already exist. No duplicates added.');
  }

  const total = await Product.countDocuments();
  const categories = await Product.distinct('category');

  console.log(`Total products in database: ${total}`);
  console.log(`Total categories in database: ${categories.length}`);
  console.log('Catalogue import completed.');

  await mongoose.disconnect();
};

runImport().catch(async (error) => {
  console.error('Catalogue import failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
