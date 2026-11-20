# NovaCart — E-commerce Store

**CodeAlpha Full Stack Development Internship — Task 1**

NovaCart is a full-stack online store built with React and Node.js. Customers can browse the product catalogue, search and filter products, manage a cart, and use the checkout page. The admin area provides product and order management.

## Features

- Customer registration and login
- Product catalogue with search and category filters
- Product details and stock information
- Shopping cart with quantity controls
- Checkout form with Card, UPI, and Cash on Delivery options
- Customer order history
- Admin dashboard for product and order management
- Protected routes and role-based access
- Password hashing with bcryptjs and JWT-based authentication

The checkout page is a demonstration flow. It does not connect to a payment gateway or charge a card/UPI account.

## Technology

| Part | Tools |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Authentication | JWT and bcryptjs |

## Project folders

```text
Task-1-Ecommerce/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   └── package.json
└── server/
    ├── src/
    │   ├── config/
    │   ├── middleware/
    │   ├── models/
    │   └── routes/
    └── package.json
```

## Run locally

Make sure Node.js and npm are installed.

### 1. Backend

Open a terminal in the repository folder and run:

```bash
cd Task-1-Ecommerce/server
npm install
```

Create a `.env` file in the `server` folder. Add the port and your database settings:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
ENABLE_IN_MEMORY_FALLBACK=true
```

For the sample-data demo used in this submission, `ENABLE_IN_MEMORY_FALLBACK=true` allows the app to use its built-in sample users, products, and orders when MongoDB is unavailable. This data is kept in server memory, so changes are temporary and reset when the server restarts.

To use MongoDB instead, configure a valid `MONGODB_URI` and set `ENABLE_IN_MEMORY_FALLBACK=false`. Never put real credentials in the repository.

Start the backend:

```bash
npm run dev
```

The API runs on `http://localhost:5000`.

### 2. Frontend

Open another terminal:

```bash
cd Task-1-Ecommerce/client
npm install
npm run dev
```

Open the local address printed by Vite (the project is configured to use port `3000`).

## Demo accounts

When the in-memory demo mode is enabled, the sample accounts are:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@codealpha.com` | `admin123` |
| Customer | `customer@codealpha.com` | `customer123` |

These accounts are for local demonstration only. Change or remove the sample credentials before using a persistent database or deploying the application.

## Main API routes

| Area | Routes |
|---|---|
| Authentication | `/api/auth/register`, `/api/auth/login`, `/api/auth/me` |
| Products | `/api/products`, `/api/products/categories`, `/api/products/:id` |
| Orders | `/api/orders`, `/api/orders/myorders`, `/api/orders/:id` |

The server also provides `GET /api/health` for checking the API and database connection status.

## Notes

- Product, user, and order changes made in in-memory demo mode are not saved after a server restart.
- Payment options are shown as part of the checkout interface; no real payment is processed.
- Keep the `.env` file private and do not commit it to Git.

**CodeAlpha Full Stack Development Internship — November 2026**
