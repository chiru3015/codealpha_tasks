/**
 * Lightweight, production-safe request logger.
 * Logs ONLY the HTTP method, URL pathname, status code, and response time.
 * Strictly guarantees that query parameters, headers, cookies, request bodies,
 * tokens, and credentials are NEVER inspected or printed.
 */
export const requestLogger = (req, res, next) => {
  const start = process.hrtime();

  // Extract pathname only; strip any query string completely
  const rawUrl = req.originalUrl || req.url || '/';
  const pathname = rawUrl.split('?')[0] || '/';

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const method = req.method;
    const status = res.statusCode;

    // Output: [2026-11-19T10:00:00.000Z] GET /api/tasks 200 - 14.20ms
    console.log(`[${new Date().toISOString()}] ${method} ${pathname} ${status} - ${durationMs}ms`);
  });

  next();
};

export default requestLogger;
