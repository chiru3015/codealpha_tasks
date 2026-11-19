import dns from 'dns';
import mongoose from 'mongoose';

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows/local networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  // If setting custom DNS fails, continue with system DNS
}

/**
 * Safely normalizes connection URI handling special characters in credentials
 * without leaking credentials in logs.
 */
export const normalizeMongoUri = (rawUri) => {
  if (!rawUri) return '';
  const protoIndex = rawUri.indexOf('://');
  if (protoIndex === -1) return rawUri;

  const prefix = rawUri.substring(0, protoIndex + 3);
  const rest = rawUri.substring(protoIndex + 3);

  // If there are multiple '@' symbols (e.g. password contains '@'), encode the password portion
  const lastAtIndex = rest.lastIndexOf('@');
  if (lastAtIndex !== -1) {
    const userPassPart = rest.substring(0, lastAtIndex);
    const hostPart = rest.substring(lastAtIndex + 1);
    const colonIndex = userPassPart.indexOf(':');

    if (colonIndex !== -1) {
      const username = userPassPart.substring(0, colonIndex);
      const rawPassword = userPassPart.substring(colonIndex + 1);

      // Safe encode username and password
      const encodedUser = encodeURIComponent(decodeURIComponent(username));
      const encodedPass = encodeURIComponent(decodeURIComponent(rawPassword));

      // Ensure database name or default options exist
      return `${prefix}${encodedUser}:${encodedPass}@${hostPart}`;
    }
  }

  return rawUri;
};

export const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI || '';

  if (!rawUri || rawUri.includes('<username>') || rawUri.includes('<password>')) {
    console.error('❌ MongoDB Atlas Error: MONGODB_URI is not set or contains placeholder credentials in server/.env.');
    return { success: false, error: 'MONGODB_URI contains placeholder or empty credentials' };
  }

  const sanitizedUri = normalizeMongoUri(rawUri);

  try {
    const conn = await mongoose.connect(sanitizedUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅ MongoDB Atlas Connected Successfully!`);
    console.log(`   Cluster Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    console.log(`   Connection State: readyState = ${conn.connection.readyState} (Connected)`);
    return { success: true, host: conn.connection.host, name: conn.connection.name };
  } catch (error) {
    console.error(`❌ MongoDB Atlas Connection Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};
