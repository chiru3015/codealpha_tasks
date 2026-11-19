import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { app, httpServer } from '../src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');
const indexHtmlPath = path.join(clientDist, 'index.html');

test('Deployment Integration: Root path GET / serves production index.html', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('text/html'), 'Root should return text/html');

    const html = await res.text();
    assert.ok(html.includes('<div id="root">') || html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'));

    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl, 'Cache-Control header should be set');
    assert.ok(cacheControl.includes('must-revalidate') || cacheControl.includes('no-cache') || cacheControl.includes('max-age=0'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: SPA routes (GET /login, GET /projects) serve index.html for client routing', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // 1. Direct navigation / browser refresh on /login
    const resLogin = await fetch(`http://127.0.0.1:${port}/login`);
    assert.equal(resLogin.status, 200, 'Direct navigation to /login must return 200');
    const loginHtml = await resLogin.text();
    assert.ok(loginHtml.includes('<div id="root">') || loginHtml.includes('<!DOCTYPE html>') || loginHtml.includes('<!doctype html>'));

    // 2. Direct navigation / browser refresh on /projects
    const resProjects = await fetch(`http://127.0.0.1:${port}/projects`);
    assert.equal(resProjects.status, 200, 'Direct navigation to /projects must return 200');
    const projectsHtml = await resProjects.text();
    assert.ok(projectsHtml.includes('<div id="root">') || projectsHtml.includes('<!DOCTYPE html>') || projectsHtml.includes('<!doctype html>'));

    // 3. Direct navigation / browser refresh on /register
    const resRegister = await fetch(`http://127.0.0.1:${port}/register`);
    assert.equal(resRegister.status, 200, 'Direct navigation to /register must return 200');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: GET /api/health returns JSON status and uptime', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.ok([200, 503].includes(res.status), 'Health check returns 200 (connected) or 503 (degraded)');
    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('application/json'));

    const data = await res.json();
    assert.ok(data.service);
    assert.equal(typeof data.database.connected, 'boolean');
    assert.equal(typeof data.uptime, 'number');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: Unknown API routes GET /api/nonexistent return JSON 404, never index.html', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/nonexistent`);
    assert.equal(res.status, 404, 'Unknown API routes must return 404');
    const contentType = res.headers.get('content-type');
    assert.ok(contentType.includes('application/json'), 'Unknown API routes must return JSON, not HTML');

    const data = await res.json();
    assert.equal(data.message, 'API route /api/nonexistent not found.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: Missing static assets return 404 rather than index.html', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // 1. Missing JS asset under /assets/
    const resAsset = await fetch(`http://127.0.0.1:${port}/assets/nonexistent-bundle.js`);
    assert.equal(resAsset.status, 404, 'Missing asset in /assets/ must return 404');
    const assetData = await resAsset.json();
    assert.ok(assetData.message.includes('not found'));

    // 2. Missing image/icon with file extension
    const resImage = await fetch(`http://127.0.0.1:${port}/missing-avatar.png`);
    assert.equal(resImage.status, 404, 'Missing file with extension must return 404');
    const imageData = await resImage.json();
    assert.ok(imageData.message.includes('not found'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: Fingerprinted assets in /assets/ have immutable caching', async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const assetsDir = path.join(clientDist, 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      const jsFile = files.find((f) => f.endsWith('.js') || f.endsWith('.css'));
      if (jsFile) {
        const res = await fetch(`http://127.0.0.1:${port}/assets/${jsFile}`);
        assert.equal(res.status, 200);
        const cacheControl = res.headers.get('cache-control');
        assert.ok(cacheControl, 'Cache-Control header must be set');
        assert.ok(cacheControl.includes('immutable'), 'Fingerprinted assets should have immutable caching');
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Deployment Integration: Socket.io handshake endpoint is reachable on same-origin', async () => {
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const port = httpServer.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/socket.io/?EIO=4&transport=polling`);
    // Socket.io polling handshake responds with status 200 or 400 (if unauthenticated without token)
    assert.ok([200, 400].includes(res.status), 'Socket.io polling handshake endpoint responds correctly');
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
  }
});

test('Deployment Integration: Production build validation fails in production if index.html is missing', async () => {
  const { validateProductionBuild } = await import('../src/server.js');

  // When in production and build path does not exist, it throws descriptive error
  assert.throws(
    () => validateProductionBuild('/nonexistent/path/to/dist/index.html', true),
    /Production React build not found/
  );

  // In non-production mode, missing build does not throw
  assert.equal(validateProductionBuild('/nonexistent/path/to/dist/index.html', false), true);
});
