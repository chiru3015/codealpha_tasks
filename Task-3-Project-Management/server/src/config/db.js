import mongoose from 'mongoose';
import config from './env.js';

export const normalizeMongoUri = (rawUri) => {
  if (!rawUri) return '';
  const protoIdx = rawUri.indexOf('://');
  if (protoIdx === -1) return rawUri;
  const prefix = rawUri.substring(0, protoIdx + 3);
  const rest = rawUri.substring(protoIdx + 3);
  const lastAt = rest.lastIndexOf('@');
  if (lastAt !== -1) {
    const userPass = rest.substring(0, lastAt);
    const host = rest.substring(lastAt + 1);
    const colon = userPass.indexOf(':');
    if (colon !== -1) {
      const user = encodeURIComponent(decodeURIComponent(userPass.substring(0, colon)));
      const pass = encodeURIComponent(decodeURIComponent(userPass.substring(colon + 1)));
      return `${prefix}${user}:${pass}@${host}`;
    }
  }
  return rawUri;
};

export const connectDB = async (uriOverride) => {
  const rawUri = uriOverride || config.MONGODB_URI || '';
  if (!rawUri || rawUri.includes('<username>') || rawUri.includes('<password>')) {
    const errorMsg = 'MONGODB_URI is not set or contains placeholder credentials.';
    if (config.isProduction) {
      throw new Error(errorMsg);
    }
    console.error(`❌ ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  try {
    const conn = await mongoose.connect(normalizeMongoUri(rawUri), {
      serverSelectionTimeoutMS: config.isProduction ? 5000 : 8000,
    });
    console.log('✅ MongoDB Connected Successfully!');
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Connection State: readyState = ${conn.connection.readyState} (Connected)`);
    return { success: true, host: conn.connection.host, name: conn.connection.name };
  } catch (err) {
    console.error(`❌ MongoDB Connection Failed: ${err.message}`);
    if (config.isProduction) {
      throw err;
    }
    return { success: false, error: err.message };
  }
};
