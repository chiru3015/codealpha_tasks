const INSECURE_JWT_DEFAULTS = new Set([
  'secret',
  'jwt_secret',
  'pm_tool_jwt_secret_2026',
  'codealpha_pm_tool_jwt_secret_2026',
  'changeme',
  'password',
  '12345678901234567890123456789012',
]);

/**
 * Validates environment variables.
 * Fails fast in production with actionable, safe error messages without leaking secret values.
 * Provides safe fallbacks in development/test.
 */
export const validateEnv = (env = process.env) => {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const port = parseInt(env.PORT, 10) || 5001;
  const clientUrl = typeof env.CLIENT_URL === 'string' && env.CLIENT_URL.trim()
    ? env.CLIENT_URL.trim()
    : (isProduction ? '' : 'http://localhost:3001');
  let mongoUri = typeof env.MONGODB_URI === 'string' ? env.MONGODB_URI.trim() : '';
  let jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';

  const errors = [];

  if (isProduction) {
    // 1. MONGODB_URI validation
    if (!mongoUri) {
      errors.push('MONGODB_URI is required in production.');
    } else if (mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
      errors.push('MONGODB_URI contains unconfigured placeholder credentials.');
    }

    // 2. JWT_SECRET validation
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required in production.');
    } else if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production.');
    } else if (INSECURE_JWT_DEFAULTS.has(jwtSecret.toLowerCase())) {
      errors.push('JWT_SECRET cannot be a default or commonly used placeholder value.');
    }
  } else {
    // Safe development / test fallback
    if (!jwtSecret) {
      jwtSecret = isTest
        ? 'test-isolated-jwt-secret-min-32-chars-long'
        : 'dev-fallback-jwt-secret-min-32-chars-long';
      if (!isTest) {
        console.warn('⚠️ Warning: JWT_SECRET not set. Using local development fallback secret.');
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n - ${errors.join('\n - ')}`);
  }

  return Object.freeze({
    NODE_ENV: nodeEnv,
    isProduction,
    isTest,
    PORT: port,
    CLIENT_URL: clientUrl,
    MONGODB_URI: mongoUri,
    JWT_SECRET: jwtSecret,
  });
};

export const config = validateEnv();
export default config;
