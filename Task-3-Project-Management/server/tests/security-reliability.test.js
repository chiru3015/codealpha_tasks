import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { validateEnv } from '../src/config/env.js';
import requestLogger from '../src/middleware/requestLogger.js';
import { globalLimiter, loginLimiter, registerLimiter } from '../src/middleware/rateLimiter.js';
import { app } from '../src/server.js';

// ==========================================
// 1. ENVIRONMENT VALIDATION TESTS
// ==========================================
test('Environment Validation: production requires valid MONGODB_URI and strong JWT_SECRET', () => {
  // Test missing MONGODB_URI
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: '',
        JWT_SECRET: 'a_very_long_production_secret_32_characters_minimum',
      });
    },
    /MONGODB_URI is required in production/
  );

  // Test placeholder MONGODB_URI
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/pmtool',
        JWT_SECRET: 'a_very_long_production_secret_32_characters_minimum',
      });
    },
    /MONGODB_URI contains unconfigured placeholder credentials/
  );

  // Test missing JWT_SECRET
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://admin:securepass@cluster0.mongodb.net/pmtool',
        JWT_SECRET: '',
      });
    },
    /JWT_SECRET is required in production/
  );

  // Test short JWT_SECRET (< 32 chars)
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://admin:securepass@cluster0.mongodb.net/pmtool',
        JWT_SECRET: 'short_secret_under_32_chars',
      });
    },
    /JWT_SECRET must be at least 32 characters long in production/
  );

  // Test insecure default JWT_SECRET
  assert.throws(
    () => {
      validateEnv({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb+srv://admin:securepass@cluster0.mongodb.net/pmtool',
        JWT_SECRET: 'codealpha_pm_tool_jwt_secret_2026',
      });
    },
    /JWT_SECRET cannot be a default or commonly used placeholder value/
  );

  // Test valid production environment
  const validProd = validateEnv({
    NODE_ENV: 'production',
    PORT: '5002',
    CLIENT_URL: 'https://pmtool.example.com',
    MONGODB_URI: 'mongodb+srv://user:pass@cluster0.mongodb.net/pmtool?retryWrites=true',
    JWT_SECRET: 'super_secure_production_secret_key_exceeding_32_chars_12345',
  });

  assert.equal(validProd.isProduction, true);
  assert.equal(validProd.PORT, 5002);
  assert.equal(validProd.CLIENT_URL, 'https://pmtool.example.com');
  assert.equal(validProd.JWT_SECRET, 'super_secure_production_secret_key_exceeding_32_chars_12345');
});

test('Environment Validation: development and test provide safe fallbacks', () => {
  const devConfig = validateEnv({
    NODE_ENV: 'development',
    PORT: '5001',
  });

  assert.equal(devConfig.isProduction, false);
  assert.ok(devConfig.JWT_SECRET.length >= 32);

  const testConfig = validateEnv({
    NODE_ENV: 'test',
  });

  assert.equal(testConfig.isTest, true);
  assert.ok(testConfig.JWT_SECRET.length >= 32);
});

// ==========================================
// 2. REQUEST LOGGER PRIVACY TESTS
// ==========================================
test('Request Logger: strips query string and avoids logging bodies or credentials', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const testApp = express();
    testApp.use(requestLogger);
    testApp.get('/test-endpoint', (req, res) => res.json({ ok: true }));

    const server = http.createServer(testApp);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}/test-endpoint?token=supersecret123&password=secretpassword`);
    assert.equal(res.status, 200);

    // Wait a tick for res.on('finish')
    await new Promise((resolve) => setTimeout(resolve, 50));
    await new Promise((resolve) => server.close(resolve));

    assert.ok(logs.length > 0);
    const loggedLine = logs.find((l) => l.includes('/test-endpoint'));
    assert.ok(loggedLine, 'Log should record the path /test-endpoint');
    assert.ok(!loggedLine.includes('token='), 'Log MUST NOT contain query parameters');
    assert.ok(!loggedLine.includes('supersecret123'), 'Log MUST NOT contain secrets');
    assert.ok(!loggedLine.includes('secretpassword'), 'Log MUST NOT contain passwords');
  } finally {
    console.log = originalLog;
  }
});

// ==========================================
// 3. SECURITY HEADERS & HELMET TESTS
// ==========================================
test('Security Headers: X-Powered-By is disabled and Helmet headers are present', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By should not be present');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(['SAMEORIGIN', 'DENY'].includes(res.headers.get('x-frame-options')));

    const csp = res.headers.get('content-security-policy');
    assert.ok(csp, 'CSP header should be present');
    assert.ok(csp.includes("default-src 'self'"), 'CSP should include default-src self');
    assert.ok(csp.includes("connect-src 'self' ws: wss:"), 'CSP connect-src should allow websockets');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 4. PAYLOAD SIZE & MALFORMED JSON LIMITS
// ==========================================
test('Payload Handling: rejects oversized body (>100kb) with 413 and malformed JSON with 400', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // 1. Oversized body test (>100kb)
    const largeData = 'a'.repeat(105 * 1024); // 105 KB
    const resOversized = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', payload: largeData }),
    });

    assert.equal(resOversized.status, 413, 'Should reject payload > 100kb with 413 Payload Too Large');
    const oversizedBody = await resOversized.json();
    assert.ok(oversizedBody.message.includes('100kb'));

    // 2. Malformed JSON test
    const resMalformed = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": "broken_json',
    });

    assert.equal(resMalformed.status, 400, 'Should reject malformed JSON with 400 Bad Request');
    const malformedBody = await resMalformed.json();
    assert.equal(malformedBody.message, 'Invalid JSON payload');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 5. HEALTH CHECK ACCURACY & SECRET ISOLATION
// ==========================================
test('Health Check: accurate status codes and zero secret leaks', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    const data = await res.json();

    if (mongoose.connection.readyState === 1) {
      assert.equal(res.status, 200);
      assert.equal(data.status, 'ok');
      assert.equal(data.database.connected, true);
    } else {
      assert.equal(res.status, 503);
      assert.equal(data.status, 'degraded');
      assert.equal(data.database.connected, false);
    }

    assert.equal(typeof data.uptime, 'number');
    assert.ok(data.service);
    assert.ok(data.timestamp);

    // Verify zero secrets leaked
    const jsonStr = JSON.stringify(data);
    assert.ok(!jsonStr.toLowerCase().includes('mongodb+srv'));
    assert.ok(!jsonStr.toLowerCase().includes('password'));
    assert.ok(!jsonStr.toLowerCase().includes('secret'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 6. RATE LIMITING TESTS
// ==========================================
test('Rate Limiter: skips health check and limits excessive requests', async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);

  // Mount global limiter
  testApp.use(globalLimiter);
  testApp.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  testApp.get('/api/resource', (req, res) => res.json({ data: 'resource' }));

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Health check should never be blocked by rate limiter
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      assert.equal(res.status, 200, 'Health check must not be rate limited');
    }

    // Normal endpoint returns 200
    const res = await fetch(`http://127.0.0.1:${port}/api/resource`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('ratelimit-limit'), 'Standard rate limit headers should be set');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Login Rate Limiter: blocks excessive login attempts (max 10)', async () => {
  const testApp = express();
  testApp.set('trust proxy', 1);
  testApp.use(loginLimiter);
  testApp.post('/api/auth/login', (req, res) => res.status(401).json({ message: 'Invalid credentials' }));

  const server = http.createServer(testApp);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Perform 10 attempts
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST' });
      assert.equal(res.status, 401);
    }

    // 11th attempt must be throttled with 429 Too Many Requests
    const resBlocked = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST' });
    assert.equal(resBlocked.status, 429);
    const body = await resBlocked.json();
    assert.ok(body.message.includes('Too many login attempts'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ==========================================
// 7. URI ENCODING & 404 SANITIZATION
// ==========================================
test('Database URI Normalization: safely URL encodes credentials without exposing them', async () => {
  const { normalizeMongoUri } = await import('../src/config/db.js');

  const rawUri = 'mongodb+srv://admin:pass#123@cluster0.abcde.mongodb.net/pmtool?retryWrites=true';
  const normalized = normalizeMongoUri(rawUri);

  assert.ok(normalized.includes('pass%23123'), 'Special characters in password should be URL encoded');
  assert.ok(normalized.startsWith('mongodb+srv://admin:'));
});

test('404 Handler: strips query string from not found responses', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/unknown-route?token=mysecrettoken&user=test`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.message, 'API route /api/unknown-route not found.');
    assert.ok(!JSON.stringify(body).includes('mysecrettoken'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

