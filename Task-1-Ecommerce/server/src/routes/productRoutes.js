import express from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import { dbStore } from '../config/dbStore.js';

const router = express.Router();

const ensureDB = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  if (process.env.ENABLE_IN_MEMORY_FALLBACK === 'true') return true;

  res.status(503).json({
    message: 'Database Unavailable: Real MongoDB Atlas connection is not established (readyState !== 1).',
    readyState: mongoose.connection.readyState,
  });
  return false;
};

// @route   GET /api/products
// @desc    Fetch all products with optional search query & category filter
// @access  Public
router.get('/', async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const { keyword, category, featured } = req.query;

    if (mongoose.connection.readyState === 1) {
      let query = {};
      if (keyword) query.name = { $regex: keyword, $options: 'i' };
      if (category && category !== 'All') query.category = category;
      if (featured === 'true') query.isFeatured = true;

      const products = await Product.find(query).sort({ createdAt: -1 });
      return res.json(products);
    }

    const products = dbStore.getProducts({ keyword, category, featured });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/categories
// @desc    Get list of unique categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const categories = await Product.distinct('category');
      return res.json(categories);
    }
    const categories = Array.from(new Set(dbStore.products.map((p) => p.category)));
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/products/:id
// @desc    Fetch single product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.json(product);
    }

    const product = dbStore.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Invalid product ID or product not found' });
  }
});

// @route   POST /api/products
// @desc    Create a product (Admin only)
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const { name, description, price, category, imageUrl, stock, isFeatured } = req.body;

    if (!name || !description || price === undefined || !category || !imageUrl) {
      return res.status(400).json({ message: 'Please provide all required product fields' });
    }

    if (mongoose.connection.readyState === 1) {
      const product = new Product({
        name,
        description,
        price: Number(price),
        category,
        imageUrl,
        stock: Number(stock) || 0,
        isFeatured: Boolean(isFeatured),
        createdBy: req.user._id,
      });

      const savedProduct = await product.save();
      return res.status(201).json(savedProduct);
    }

    const savedProduct = dbStore.createProduct({
      name,
      description,
      price,
      category,
      imageUrl,
      stock,
      isFeatured,
      createdBy: req.user._id,
    });
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product (Admin only)
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      product.name = req.body.name || product.name;
      product.description = req.body.description || product.description;
      product.price = req.body.price !== undefined ? Number(req.body.price) : product.price;
      product.category = req.body.category || product.category;
      product.imageUrl = req.body.imageUrl || product.imageUrl;
      product.stock = req.body.stock !== undefined ? Number(req.body.stock) : product.stock;
      product.isFeatured = req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : product.isFeatured;

      const updatedProduct = await product.save();
      return res.json(updatedProduct);
    }

    const updated = dbStore.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      await Product.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Product removed successfully' });
    }

    const deleted = dbStore.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
