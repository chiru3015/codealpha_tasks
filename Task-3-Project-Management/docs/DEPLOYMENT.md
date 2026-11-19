# 🚀 NovaTask — Production Deployment Guide

This guide details the complete process for deploying **NovaTask** to production using **Render** and **MongoDB Atlas** under a single-service, same-origin architecture.

---

## 🏗️ Architecture Overview

NovaTask utilizes a unified, single-service deployment model on Render:
- **Single Web Service**: A single Node.js instance builds the React 19 frontend and serves both the compiled static assets (`client/dist`) and the Express REST API / Socket.io server from the exact same origin.
- **Same-Origin Networking**: The frontend uses relative paths (`baseURL: '/api'` for Axios and `io('/')` for Socket.io). This eliminates CORS configuration overhead, cross-origin WebSocket handshake drops, and third-party cookie restrictions.
- **Node.js 22.x LTS**: Both frontend build and backend execution run on Node.js 22.x.
- **Cloud Persistence**: Backed by MongoDB Atlas with TLS 1.3 encrypted connections and authenticated access control.

```
       Browser Client (React SPA)
                  │
                  ▼ https://novatask.onrender.com
   ┌─────────────────────────────────────────────┐
   │            Render Web Service               │
   │  ┌───────────────────────────────────────┐  │
   │  │   Express.js + Socket.io Server       │  │
   │  │                                       │  │
   │  │  • Static Assets: /assets/*           │  │
   │  │  • SPA Navigation: /, /login, etc.   │  │
   │  │  • REST API: /api/*                   │  │
   │  │  • WebSockets: /socket.io/*           │  │
   │  └───────────────────┬───────────────────┘  │
   └──────────────────────┼──────────────────────┘
                          │ TLS 1.3
                          ▼
              MongoDB Atlas Database
```

---

## 📦 Prerequisites

1. A [Render Account](https://render.com/).
2. A [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas).
3. Git repository containing NovaTask source code.

---

## 🗄️ Step 1: MongoDB Atlas Configuration

### 1. Create Cluster
1. Log in to **MongoDB Atlas**.
2. Create a new cluster (the free `M0 Sandbox` or higher).
3. Select a cloud provider and region geographically close to your Render deployment region (e.g., AWS `us-west-2` (Oregon) matches Render's `oregon` region).

### 2. Create Dedicated Database User
Do not use your Atlas administrative login for application traffic. Create a dedicated user with least-privilege permissions:
1. Navigate to **Database Access** under Security.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Set **Username**: e.g. `novatask_app`.
5. Set **Password**: Generate a strong password (minimum 24 characters).
6. Under **Database User Privileges**:
   - Select **Built-in Role** > **Read and write to any database**, OR
   - Under **Specific Privileges**, assign `readWrite` strictly to the target database: `novatask` (recommended).
7. Save the user.

### 3. Configure Network Access (IP Allowlist) & Security Tradeoffs
Render's standard and free web services run on dynamic cloud containers with rotating IP addresses without static egress gateways.
1. Navigate to **Network Access** under Security.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere** (`0.0.0.0/0`).
4. Enter description: `Render Cloud Web Service`.
5. Click **Confirm**.

> [!IMPORTANT]
> **Network Security Tradeoffs & Mitigations:**
> - Opening network access to `0.0.0.0/0` means network perimeter defense is decentralized.
> - **Compensating Controls Implemented:**
>   1. **Encrypted Transit**: Mongoose enforces TLS 1.3 cryptographic transport over TLS/SSL.
>   2. **Authentication Scoping**: Database users are restricted via SCRAM authentication and limited strictly to `readWrite` privileges on the `novatask` database.
>   3. **Secret Isolation**: Secrets are injected solely through Render encrypted environment variables (`sync: false`) and never committed to version control.
>   4. **Application Hardening**: Server enforces Helmet headers, rate limiting (global + login), request payload limits (100kb), and query-free privacy logging.

### 4. Obtain Atlas Connection String
1. Navigate to **Database** > **Clusters**.
2. Click **Connect** on your cluster.
3. Select **Drivers** (Node.js).
4. Copy the connection string format:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/novatask?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials. Special characters in passwords are automatically handled by the server's URI normalizer.

---

## 🌐 Step 2: Render Web Service Deployment

### Option A: Blueprint Deployment (Recommended)
The repository includes a root `render.yaml` specification for automated setup:
1. In the **Render Dashboard**, click **New +** > **Blueprint**.
2. Connect your Git repository (`02-project-management-tool`).
3. Render automatically reads `render.yaml`:
   - Service Type: `Web Service`
   - Node Version: `22`
   - Build Command: `npm ci --prefix server && npm ci --include=dev --prefix client && npm run build --prefix client`
   - Start Command: `node server/src/server.js`
   - Health Check: `/api/health`
4. In the Environment configuration screen, provide the secret values:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI.
   - `JWT_SECRET`: A secure random string (minimum 32 characters).
5. Click **Apply**.

### Option B: Manual Web Service Setup
1. In **Render Dashboard**, click **New +** > **Web Service**.
2. Connect your repository.
3. Configure the following fields:
   - **Name**: `novatask`
   - **Region**: `Oregon` (or region matching your Atlas cluster)
   - **Branch**: `master`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm ci --prefix server && npm ci --include=dev --prefix client && npm run build --prefix client
     ```
   - **Start Command**:
     ```bash
     node server/src/server.js
     ```
   - **Plan**: `Free`
4. Expand **Advanced** and set:
   - **Health Check Path**: `/api/health`
   - **Auto-Deploy**: `Yes`

---

## 🔑 Environment Variables Reference

Configure these in the Render Dashboard under **Environment**:

| Variable Name | Required | Default / Example | Purpose |
|:---|:---:|:---|:---|
| `NODE_ENV` | **Yes** | `production` | Enables production optimizations, fail-fast checks, and error redaction |
| `NODE_VERSION` | **Yes** | `22` | Pins the Node.js runtime version to Node 22.x LTS on Render |
| `MONGODB_URI` | **Yes** | `mongodb+srv://...` | Connection URI to MongoDB Atlas database |
| `JWT_SECRET` | **Yes** | *(32+ character random string)* | Cryptographic key used to sign and verify user JWTs |
| `PORT` | Auto | Render assigns automatically | Web service port (defaults to 10000 on Render; 5002 locally) |
| `CLIENT_URL` | Optional | *(Omit for same-origin)* | Additional CORS origin if external clients access the API |

> [!NOTE]
> No client environment variables (`client/.env`) are required. The frontend utilizes relative paths (`/api` and `/`), eliminating bundle credential exposure risks.

---

## ⚡ Static Asset Caching & SPA Routing

The Express server implements production-grade static serving rules:

1. **Fingerprinted Assets (`/assets/*.js`, `/assets/*.css`)**:
   - Vite compiles production assets with content hashes.
   - Served with: `Cache-Control: public, max-age=31536000, immutable`.
2. **HTML Entrypoint (`index.html`)**:
   - Served with: `Cache-Control: public, max-age=0, must-revalidate`.
   - Ensures users always load the latest JavaScript/CSS hashes immediately after a deployment.
3. **API Route Protection**:
   - Any unhandled `/api/*` request immediately returns a JSON `404 Not Found`.
   - Unhandled API calls never fall through to the React HTML fallback.
4. **Missing Assets Protection**:
   - Requests with file extensions (`.js`, `.css`, `.png`, `.ico`, etc.) or under `/assets/` return a `404 Not Found` if missing from disk, rather than serving `index.html`.
5. **SPA Wildcard Navigation**:
   - Valid browser URL paths (`/login`, `/register`, `/projects/:id`) correctly return `index.html` with HTTP 200, enabling seamless browser refreshes.

---

## ✅ Post-Deployment Verification Checklist

Once Render reports that deployment is live, verify the service:

- [ ] **1. Health Probe**: Visit `https://your-app.onrender.com/api/health`. Confirm HTTP 200 and:
  ```json
  {
    "status": "ok",
    "service": "CodeAlpha Project Management Tool API",
    "database": { "connected": true, "readyState": 1 }
  }
  ```
- [ ] **2. React Application Root**: Visit `https://your-app.onrender.com/`. Verify React UI loads without console errors.
- [ ] **3. Direct Navigation / Refresh**: Refresh the page on `/login` and `/register`. Confirm it renders the view (not a 404).
- [ ] **4. API 404 Isolation**: Visit `https://your-app.onrender.com/api/nonexistent`. Confirm a JSON 404 is returned:
  ```json
  { "message": "API route /api/nonexistent not found." }
  ```
- [ ] **5. Missing Asset 404**: Visit `https://your-app.onrender.com/assets/nonexistent.js`. Confirm HTTP 404 (not HTML).
- [ ] **6. User Registration & Login**: Register a test user. Verify successful redirection and persistent session in Navbar.
- [ ] **7. Project Creation**: Create a new project with title, description, and color.
- [ ] **8. Kanban Board Drag-and-Drop**: Create tasks and move cards across columns (`To Do`, `In Progress`, `Review`, `Done`). Refresh to verify database order persistence.
- [ ] **9. Real-Time Sync**: Open the project board in two different browser tabs/windows. Move or create a task in one window and confirm immediate real-time update in the other via Socket.io.
- [ ] **10. Secret Audit**: Open Browser DevTools > Network tab. Verify no sensitive strings (`mongodb+srv`, `JWT_SECRET`, or passwords) appear in asset payloads or headers.

---

## 🔧 Troubleshooting Guide

| Issue | Root Cause | Solution |
|:---|:---|:---|
| **Build fails with "Production React build not found"** | Client build did not execute or output directory missing | Ensure Render build command includes: `npm run build --prefix client`. |
| **Health check returns 503 Service Unavailable** | MongoDB Atlas connection failed | Verify Atlas user credentials and confirm IP allowlist includes `0.0.0.0/0`. |
| **API returns "JWT_SECRET must be at least 32 characters"** | Insecure or short secret configured | Generate a secret with 32+ random characters and update `JWT_SECRET` in Render. |
| **Render free tier initial request takes 45 seconds** | Instance spun down due to 15-minute inactivity | Normal behavior on free tier; instance will resume automatically on incoming traffic. |
| **CORS errors in browser console** | Accessing the API from an unconfigured external host | If accessing outside Render same-origin domain, add domain to `CLIENT_URL` in Render. |
| **Browser refresh on `/projects` returns 404** | Missing SPA wildcard route | Ensure `server.js` contains wildcard `app.get('*', ...)` serving `client/dist/index.html`. |
