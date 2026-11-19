import bcrypt from 'bcryptjs';

// Realistic In-Memory Database Store used when MongoDB Atlas connection is awaiting credentials
// This enables full end-to-end testing of real password hashing, JWTs, orders, stock decrements, and RBAC!

class DBStore {
  constructor() {
    this.users = [];
    this.products = [];
    this.orders = [];
    this.init();
  }

  async init() {
    // Hash default admin and customer passwords using real bcrypt
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const customerPasswordHash = await bcrypt.hash('customer123', 10);

    const adminUser = {
      _id: '673752e2579b908480e600a1',
      name: 'Store Administrator',
      email: 'admin@codealpha.com',
      password: adminPasswordHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    const customerUser = {
      _id: '673752e2579b908480e600c1',
      name: 'Jane Doe',
      email: 'customer@codealpha.com',
      password: customerPasswordHash,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    this.users = [adminUser, customerUser];

    this.products = [
      {
        _id: '673752e2579b908480e60001',
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
        createdAt: new Date().toISOString(),
      },
      {
        _id: '673752e2579b908480e60002',
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
        createdAt: new Date().toISOString(),
      },
      {
        _id: '673752e2579b908480e60003',
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
        createdAt: new Date().toISOString(),
      },
      {
        _id: '673752e2579b908480e60004',
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
        createdAt: new Date().toISOString(),
      },
      {
        _id: '673752e2579b908480e60005',
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
        createdAt: new Date().toISOString(),
      },
      {
        _id: '673752e2579b908480e60006',
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
        createdAt: new Date().toISOString(),
      },
    ];

    // Seed initial order for Jane Doe
    this.orders = [
      {
        _id: '673752e2579b908480e600d1',
        user: { _id: customerUser._id, name: customerUser.name, email: customerUser.email },
        orderItems: [
          {
            product: this.products[0]._id,
            name: this.products[0].name,
            quantity: 1,
            price: this.products[0].price,
            imageUrl: this.products[0].imageUrl,
          },
        ],
        shippingAddress: {
          fullName: 'Jane Doe',
          address: '123 Innovation Drive',
          city: 'Bengaluru',
          postalCode: '560001',
          country: 'India',
          phone: '+91 9876543210',
        },
        paymentMethod: 'Card',
        itemsPrice: 199.99,
        shippingPrice: 0,
        taxPrice: 20.0,
        totalPrice: 219.99,
        isPaid: true,
        paidAt: new Date().toISOString(),
        orderStatus: 'Delivered',
        deliveredAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  // User Methods
  async findUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async findUserById(id) {
    return this.users.find((u) => u._id.toString() === id.toString());
  }

  async createUser({ name, email, password, role = 'customer' }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
      _id: 'usr_' + Date.now().toString(16),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  // Product Methods
  getProducts({ keyword, category, featured }) {
    let result = [...this.products];
    if (keyword) {
      const q = keyword.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    if (category && category !== 'All') {
      result = result.filter((p) => p.category === category);
    }
    if (featured === 'true' || featured === true) {
      result = result.filter((p) => p.isFeatured);
    }
    return result;
  }

  getProductById(id) {
    return this.products.find((p) => p._id.toString() === id.toString());
  }

  createProduct({ name, description, price, category, imageUrl, stock, isFeatured, createdBy }) {
    const newProd = {
      _id: 'prd_' + Date.now().toString(16),
      name,
      description,
      price: Number(price),
      category,
      imageUrl,
      stock: Number(stock) || 0,
      rating: 4.5,
      numReviews: 0,
      isFeatured: Boolean(isFeatured),
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.products.unshift(newProd);
    return newProd;
  }

  updateProduct(id, updates) {
    const index = this.products.findIndex((p) => p._id.toString() === id.toString());
    if (index === -1) return null;
    this.products[index] = {
      ...this.products[index],
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : this.products[index].price,
      stock: updates.stock !== undefined ? Number(updates.stock) : this.products[index].stock,
    };
    return this.products[index];
  }

  deleteProduct(id) {
    const index = this.products.findIndex((p) => p._id.toString() === id.toString());
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }

  decrementStock(productId, quantity) {
    const product = this.getProductById(productId);
    if (product) {
      product.stock = Math.max(0, product.stock - quantity);
      return product.stock;
    }
    return null;
  }

  // Order Methods
  createOrder({ user, orderItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, taxPrice, totalPrice }) {
    const newOrder = {
      _id: 'ord_' + Date.now().toString(16),
      user: { _id: user._id, name: user.name, email: user.email },
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: Number(itemsPrice),
      shippingPrice: Number(shippingPrice),
      taxPrice: Number(taxPrice),
      totalPrice: Number(totalPrice),
      isPaid: true,
      paidAt: new Date().toISOString(),
      orderStatus: 'Processing',
      createdAt: new Date().toISOString(),
    };

    // Decrement stock in store
    for (const item of orderItems) {
      this.decrementStock(item.product, item.quantity);
    }

    this.orders.unshift(newOrder);
    return newOrder;
  }

  getUserOrders(userId) {
    return this.orders.filter(
      (o) => o.user._id.toString() === userId.toString()
    );
  }

  getOrderById(id) {
    return this.orders.find((o) => o._id.toString() === id.toString());
  }

  getAllOrders() {
    return [...this.orders];
  }

  updateOrderStatus(id, newStatus) {
    const order = this.getOrderById(id);
    if (!order) return null;
    order.orderStatus = newStatus;
    if (newStatus === 'Delivered') {
      order.deliveredAt = new Date().toISOString();
    }
    return order;
  }
}

export const dbStore = new DBStore();
