import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import { connectDB } from './config/db.js';
import requestLogger from './middleware/requestLogger.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import { registerSocketHandlers } from './socket/socketHandlers.js';

const app = express();
const httpServer = createServer(app);

// Resolve static paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const indexHtmlPath = path.join(clientDistPath, 'index.html');

// CORS configuration supporting same-origin architecture and local dev
const allowedOrigins = new Set(
  [
    config.CLIENT_URL,
    !config.isProduction && 'http://localhost:3001',
    !config.isProduction && 'http://127.0.0.1:3001',
  ].filter(Boolean)
);

const corsOriginHandler = (origin, callback) => {
  // Allow requests without Origin header (e.g. same-origin GET/fetch, curl, server-to-server)
  if (!origin) return callback(null, true);
  // Allow explicitly configured client origins
  if (allowedOrigins.has(origin)) return callback(null, true);
  // In production same-origin deployment without separate CLIENT_URL:
  if (config.isProduction && !config.CLIENT_URL) return callback(null, true);

  return callback(null, false);
};

// Configure Socket.io with allowed origins
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so routes/controllers can emit events
app.set('io', io);

// 1. Trust proxy: Required for hosting platforms (Render, Railway, etc.) behind reverse proxies
// Enables accurate client IP detection for rate limiting without insecure open trusts.
app.set('trust proxy', 1);

// 2. Security headers: Remove fingerprinting header
app.disable('x-powered-by');

// 3. Helmet & Content Security Policy (CSP):
// Configured to support both development and production (same-origin React static hosting and Socket.io)
// - default-src 'self': Restricts non-explicitly declared resource fetches to same-origin.
// - script-src 'self': Permits bundled React scripts from same origin.
// - style-src 'self' 'unsafe-inline': Required for dynamic UI styling (Tailwind CSS-in-JS).
// - img-src 'self' data: https:: Supports local images, data URIs, and external avatars.
// - connect-src 'self' ws: wss: [config.CLIENT_URL]: Allows REST API calls and Socket.io WebSocket connections.
// - font-src 'self' https: data:: Allows typography icons and web fonts.
// - object-src 'none' & frame-ancestors 'none': Prevents Flash/plugin exploits and iframe clickjacking.
// - crossOriginEmbedderPolicy: false: Avoids breaking cross-origin resources.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'ws:',
          'wss:',
          ...(config.CLIENT_URL ? [config.CLIENT_URL] : []),
        ],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// 4. CORS configuration
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  })
);

// 5. Request logging: Logs HTTP method, URL pathname, status, and duration without sensitive data
app.use(requestLogger);

// 6. Body parsing with strict payload size limit (100kb max)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 7. Payload validation error handlers (413 for oversized payloads, 400 for malformed JSON)
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ message: 'Payload too large. Maximum size is 100kb.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON payload' });
  }
  next(err);
});

// 8. Health check: Responds 200 when readyState === 1, 503 otherwise (probes & Navbar status)
app.get(['/api/health', '/health'], (req, res) => {
  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1;
  const statusCode = isConnected ? 200 : 503;

  res.status(statusCode).json({
    status: isConnected ? 'ok' : 'degraded',
    service: 'CodeAlpha Project Management Tool API',
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    database: {
      readyState,
      connected: isConnected,
    },
    timestamp: new Date().toISOString(),
  });
});

// 9. Global rate limiting on API endpoints (skips health check via limiter definition)
app.use('/api', globalLimiter);

// 10. Application API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// 11. API 404 Handler - Any unmatched /api/* route strictly returns JSON 404
app.all('/api/*', (req, res) => {
  const pathname = (req.originalUrl || req.url || '').split('?')[0];
  res.status(404).json({ message: `API route ${pathname} not found.` });
});

// 12. Static Assets Serving with fingerprinted cache headers
const isHashedAsset = (filePath) =>
  /\.[a-f0-9]{8,}\./i.test(filePath) || filePath.includes(`${path.sep}assets${path.sep}`);

if (fs.existsSync(clientDistPath)) {
  app.use(
    express.static(clientDistPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (isHashedAsset(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
      },
    })
  );
}

// 13. Missing static assets 404 handler (never return index.html for missing .js, .css, images, etc.)
app.use((req, res, next) => {
  const pathname = (req.originalUrl || req.url || '').split('?')[0];
  const ext = path.extname(pathname);
  if (ext || pathname.startsWith('/assets/')) {
    return res.status(404).json({ message: `Asset ${pathname} not found.` });
  }
  next();
});

// 14. React SPA Wildcard Fallback for client-side navigation (/login, /register, /projects, etc.)
app.get('*', (req, res) => {
  if (fs.existsSync(indexHtmlPath)) {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.sendFile(indexHtmlPath);
  } else {
    const pathname = (req.originalUrl || req.url || '').split('?')[0];
    res.status(404).json({ message: `Route ${pathname} not found.` });
  }
});

// 15. Centralized error handling
app.use((err, req, res, _next) => {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid request data.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid identifier.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Resource already exists.' });
  }

  // Safe error logging: Never log credentials or leak stack traces in production
  if (!config.isProduction) {
    console.error(err?.stack || err);
  } else {
    console.error(`[Error] ${err?.message || 'Internal server error'}`);
  }

  res.status(500).json({ message: 'Internal server error.' });
});

// Register real-time Socket.io handlers
registerSocketHandlers(io);

const PORT = config.PORT;

let serverInstance = null;
let isShuttingDown = false;

/**
 * Coordinated Graceful Shutdown
 * Safely stops Socket.io, terminates HTTP listener, and closes MongoDB connection.
 */
export const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);

  // 10-second fail-safe timeout
  const forceExitTimeout = setTimeout(() => {
    console.error('⚠️ Forcefully terminating process due to shutdown timeout (10s).');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    // 1. Close Socket.io connections
    if (io) {
      console.log('Closing Socket.io engine...');
      await new Promise((resolve) => io.close(resolve));
    }

    // 2. Stop accepting new HTTP requests and close listening sockets
    if (httpServer && httpServer.listening) {
      console.log('Closing HTTP server...');
      await new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    }

    // 3. Disconnect MongoDB connection safely
    if (mongoose.connection.readyState !== 0) {
      console.log('Disconnecting MongoDB...');
      await mongoose.disconnect();
    }

    console.log('✅ Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export const validateProductionBuild = (distPath = indexHtmlPath, isProduction = config.isProduction) => {
  if (isProduction && !fs.existsSync(distPath)) {
    throw new Error(
      'Production React build not found at client/dist/index.html. Run "npm run build --prefix client" before starting the server in production.'
    );
  }
  return true;
};

export const start = async () => {
  // Validate production build exists when in production mode
  try {
    validateProductionBuild();
  } catch (err) {
    console.error(`❌ Fatal: ${err.message}`);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    if (config.isProduction) {
      console.error('❌ Fatal: MongoDB connection required in production mode. Exiting.');
      process.exit(1);
    }
  }

  return new Promise((resolve) => {
    serverInstance = httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 PM Tool API running on port ${PORT} [${config.NODE_ENV}]`);
      resolve(serverInstance);
    });
  });
};

const isDirectExecution = () => {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const entryFile = path.resolve(process.argv[1]);
    return currentFile.toLowerCase() === entryFile.toLowerCase();
  } catch {
    return false;
  }
};

// Auto-start server only when executed directly (not when imported in test suites)
if (isDirectExecution() && process.env.NODE_ENV !== 'test' && !process.env.TEST_MODE) {
  start();
}

export { app, httpServer, io };
