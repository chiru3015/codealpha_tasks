import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
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

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items specified' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address) {
      return res.status(400).json({ message: 'Shipping address is incomplete' });
    }

    // Check stock for all items before placing order
    for (const item of orderItems) {
      let productStock;
      if (mongoose.connection.readyState === 1) {
        const prod = await Product.findById(item.product);
        productStock = prod ? prod.stock : 0;
      } else {
        const prod = dbStore.getProductById(item.product);
        productStock = prod ? prod.stock : 0;
      }

      if (productStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.name}. Available: ${productStock}`,
        });
      }
    }

    if (mongoose.connection.readyState === 1) {
      const order = new Order({
        user: req.user._id,
        orderItems,
        shippingAddress,
        paymentMethod: paymentMethod || 'Card',
        itemsPrice: Number(itemsPrice),
        shippingPrice: Number(shippingPrice) || 0,
        taxPrice: Number(taxPrice) || 0,
        totalPrice: Number(totalPrice),
        isPaid: true,
        paidAt: Date.now(),
        orderStatus: 'Processing',
      });

      const createdOrder = await order.save();

      // Decrement stock for purchased products in MongoDB Atlas
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      return res.status(201).json(createdOrder);
    }

    const createdOrder = dbStore.createOrder({
      user: req.user,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders/myorders
// @desc    Get logged in user's orders
// @access  Private
router.get('/myorders', protect, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
      return res.json(orders);
    }
    const orders = dbStore.getUserOrders(req.user._id);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    let order;
    if (mongoose.connection.readyState === 1) {
      order = await Order.findById(req.params.id).populate('user', 'name email');
    } else {
      order = dbStore.getOrderById(req.params.id);
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderUserId = order.user?._id ? order.user._id.toString() : order.user.toString();
    if (orderUserId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/orders
// @desc    Get all orders (Admin only)
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    if (mongoose.connection.readyState === 1) {
      const orders = await Order.find({})
        .populate('user', 'name email')
        .sort({ createdAt: -1 });
      return res.json(orders);
    }
    const orders = dbStore.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status (Admin only)
// @access  Private/Admin
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    if (!ensureDB(res)) return;

    const { orderStatus } = req.body;

    if (!orderStatus) {
      return res.status(400).json({ message: 'orderStatus is required' });
    }

    if (mongoose.connection.readyState === 1) {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.orderStatus = orderStatus;
      if (orderStatus === 'Delivered') {
        order.deliveredAt = Date.now();
      }

      const updatedOrder = await order.save();
      return res.json(updatedOrder);
    }

    const updated = dbStore.updateOrderStatus(req.params.id, orderStatus);
    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
