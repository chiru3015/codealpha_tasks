# 🛒 NovaCart — Full Stack E-Commerce Platform

> **CodeAlpha Full Stack Development Internship — Project 1**

NovaCart is a production-quality, full-stack e-commerce web application built with the MERN stack. It features real MongoDB Atlas cloud persistence, role-based JWT authentication, an interactive product catalog, a shopping cart, full order processing with live inventory management, and an administrative control panel.

---

## ✨ Features

| Area | Features |
|:---|:---|
| **Authentication** | JWT Bearer tokens, bcryptjs password hashing, protected & admin-only routes |
| **Product Catalog** | Keyword search, category filters, price/rating sorting, featured products, stock indicators |
| **Shopping Cart** | Persistent cart (localStorage), quantity controls, automatic subtotal, free-shipping threshold |
| **Checkout** | Delivery address form, payment method selector (Card / UPI / Cash on Delivery), order summary |
| **Order Management** | Customer order history, order detail view, real-time status badges (Processing / Shipped / Delivered) |
| **Admin Dashboard** | Revenue, order count, product count & user count metrics; order status updater; full product CRUD |
| **Database** | MongoDB Atlas cloud persistence — users, products, orders and inventory survive server restarts |
| **Security** | No credential exposure in source code; `.env` excluded from Git; strict 503 when DB is unavailable |

---

## 🛠️ Technology Stack

| Layer | Technology |
|:---|:---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, React Router v7, Axios |
| **Backend** | Node.js, Express.js (REST API, CORS) |
| **Database** | MongoDB Atlas (Mongoose ODM v8) |
| **Authentication** | JSON Web Tokens (JWT) + bcryptjs |
| **Build Tool** | Vite v8 |

---

## 📁 Project Structure

```text
01-ecommerce-store/
├── client/                         # React Frontend (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/             # Navbar, Footer, ProductCard
│   │   ├── context/                # AuthContext, CartContext
│   │   ├── pages/                  # Home, Products, ProductDetail, Cart,
│   │   │                           # Checkout, Orders, Login, Register, Admin
│   │   ├── services/api.js         # Axios client with JWT interceptor
│   │   ├── App.jsx                 # Route definitions
│   │   └── main.jsx
│   ├── vite.config.js              # API proxy :3000 → :5000, Tailwind plugin
│   └── package.json
│
├── server/                         # Express.js REST API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               # MongoDB Atlas connection with URI normalizer
│   │   │   └── dbStore.js          # In-memory fallback (disabled by default)
│   │   ├── middleware/auth.js      # protect & admin JWT middlewares
│   │   ├── models/                 # User, Product, Order (Mongoose schemas)
│   │   ├── routes/                 # /api/auth, /api/products, /api/orders
│   │   ├── seed.js                 # Idempotent seed script
│   │   └── server.js               # Express app entrypoint
│   ├── .env.example                # Safe environment variable template
│   ├── .gitignore
│   └── package.json
│
├── .gitattributes
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **MongoDB Atlas** account with a cluster (free M0 tier is sufficient)

---

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/novacart-ecommerce.git
cd novacart-ecommerce
```

---

### 2. Configure the Backend Environment

```bash
cd server
cp .env.example .env
```

Open `server/.env` and fill in your values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=your_strong_random_jwt_secret_here
NODE_ENV=development
```

> **Important:** Never commit `server/.env`. It is listed in `.gitignore`.

#### How to get your MongoDB Atlas URI

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Go to **Database** → **Connect** → **Connect your application**
3. Select **Node.js / Mongoose**, copy the connection string
4. Replace `<username>` and `<password>` with your Atlas database user credentials
5. Replace `<dbname>` with a name such as `novacart`

---

### 3. Install & Start the Backend

```bash
# From the server/ directory
npm install
npm run dev        # Development (nodemon, auto-reload)
# or
npm start          # Production
```

The API will run at **http://localhost:5000**. You will see:

```
✅ MongoDB Atlas Connected Successfully!
   Cluster Host: <your-cluster>.mongodb.net
   Database: novacart
   Connection State: readyState = 1 (Connected)
🚀 Server running on port 5000 in development mode
```

---

### 4. Seed Demo Data

After the server is running and Atlas is connected, seed demo accounts and a sample product catalog:

```bash
# From the server/ directory
npm run seed
```

This creates the following demo accounts **only if they do not already exist**:

| Role | Email | Notes |
|:---|:---|:---|
| Admin | `admin@codealpha.com` | Set your own password in `seed.js` before first run |
| Customer | `customer@codealpha.com` | Set your own password in `seed.js` before first run |

> **Security note:** The seed script uses placeholder passwords. Set strong passwords before deploying.

---

### 5. Install & Start the Frontend

Open a **new terminal**:

```bash
cd client
npm install
npm run dev        # Development server on http://localhost:3000
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:5000`.

---

### 6. Production Frontend Build

```bash
cd client
npm run build      # Outputs optimized static files to client/dist/
```

---

## 📡 REST API Reference

### Health Check

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Server and database connection status |

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Public | Register a new customer account |
| `POST` | `/api/auth/login` | Public | Authenticate and receive JWT |
| `GET` | `/api/auth/me` | 🔒 Protected | Get authenticated user profile |
| `GET` | `/api/auth/users` | 🔑 Admin | List all registered users |

### Products (`/api/products`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `GET` | `/api/products` | Public | Get all products (supports `?keyword=`, `?category=`, `?featured=true`) |
| `GET` | `/api/products/categories` | Public | Get distinct category list |
| `GET` | `/api/products/:id` | Public | Get single product details |
| `POST` | `/api/products` | 🔑 Admin | Create a new product |
| `PUT` | `/api/products/:id` | 🔑 Admin | Update a product |
| `DELETE` | `/api/products/:id` | 🔑 Admin | Delete a product |

### Orders (`/api/orders`)

| Method | Endpoint | Auth | Description |
|:---|:---|:---|:---|
| `POST` | `/api/orders` | 🔒 Protected | Submit a new order (decrements stock automatically) |
| `GET` | `/api/orders/myorders` | 🔒 Protected | Get authenticated customer's order history |
| `GET` | `/api/orders/:id` | 🔒 Protected | Get order details (owner or admin only) |
| `GET` | `/api/orders` | 🔑 Admin | Get all orders |
| `PUT` | `/api/orders/:id/status` | 🔑 Admin | Update order status |

---

## 🧪 Testing the Application

### Quick Test via API (Node.js)

```js
// Register a new customer
const http = require("http");
const data = JSON.stringify({
  name: "Test User",
  email: "test@example.com",
  password: "SecurePass123!"
});
const req = http.request("http://localhost:5000/api/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
}, (res) => { /* handle response */ });
req.write(data);
req.end();
```

### Verifying Atlas Persistence

1. Register a user → note the `_id` returned.
2. Stop the backend (`Ctrl+C`).
3. Restart the backend (`npm start`).
4. Log in with the same credentials — a JWT should be issued from the persisted record.

If the backend cannot connect to Atlas, all data routes return **HTTP 503** immediately. No silent fallback to memory occurs.

---

## 🔐 Security Checklist

- [x] Passwords hashed with bcryptjs (salt rounds: 12)
- [x] JWT tokens expire (30 days) and are verified on every protected request
- [x] `server/.env` is in `.gitignore` — never committed
- [x] No credentials or connection strings in source code
- [x] Admin-only routes protected by role-based middleware
- [x] Database connection fails loudly (HTTP 503) when Atlas is unreachable

---

## 👨‍💻 Author

**CodeAlpha Full Stack Development Internship — November 2026**

---

## 📄 License

This project was developed for educational purposes as part of the CodeAlpha Internship programme.
