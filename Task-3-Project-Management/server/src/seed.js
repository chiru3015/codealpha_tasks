import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Project from './models/Project.js';
import Task from './models/Task.js';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (_) {}

dotenv.config();

const normalizeMongoUri = (rawUri) => {
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

const seedData = async () => {
  const rawUri = process.env.MONGODB_URI || '';
  if (!rawUri || rawUri.includes('<username>') || rawUri.includes('<password>')) {
    console.error('❌ MONGODB_URI is not configured in server/.env');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas for seeding...');
    const conn = await mongoose.connect(normalizeMongoUri(rawUri), { serverSelectionTimeoutMS: 8000 });
    console.log(`✅ MongoDB Connected for Seeding: ${conn.connection.host}`);

    // 1. Demo Lead Account
    let leadUser = await User.findOne({ email: 'lead@codealpha.com' });
    if (!leadUser) {
      leadUser = await User.create({
        name: 'Alex Morgan (Project Lead)',
        email: 'lead@codealpha.com',
        password: 'lead123',
        role: 'admin',
      });
      console.log('👤 Created Lead Account: lead@codealpha.com');
    } else {
      console.log('👤 Lead account already exists (skipping creation)');
    }

    // 2. Demo Developer Account
    let devUser = await User.findOne({ email: 'dev@codealpha.com' });
    if (!devUser) {
      devUser = await User.create({
        name: 'Sarah Chen (Senior Dev)',
        email: 'dev@codealpha.com',
        password: 'dev123',
        role: 'user',
      });
      console.log('👤 Created Developer Account: dev@codealpha.com');
    } else {
      console.log('👤 Developer account already exists (skipping creation)');
    }

    // 3. Demo Project
    let project = await Project.findOne({ name: 'NovaCart Mobile App' });
    if (!project) {
      project = await Project.create({
        name: 'NovaCart Mobile App',
        description: 'Cross-platform mobile application for the NovaCart e-commerce marketplace.',
        color: '#6366f1',
        owner: leadUser._id,
        members: [
          { user: leadUser._id, role: 'owner' },
          { user: devUser._id, role: 'member' },
        ],
        status: 'active',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });
      console.log('📁 Created Demo Project: NovaCart Mobile App');
    } else {
      console.log('📁 Project already exists (skipping creation)');
    }

    // 4. Demo Tasks across Kanban columns
    const taskCount = await Task.countDocuments({ project: project._id });
    if (taskCount === 0) {
      const sampleTasks = [
        {
          title: 'Design OAuth2 Google & Apple Sign-In screens',
          description: 'Create Figma wireframes and high-fidelity mockups for federated login flows.',
          project: project._id,
          assignees: [devUser._id],
          status: 'todo',
          priority: 'high',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          order: 0,
          tags: ['Design', 'Auth'],
          createdBy: leadUser._id,
          comments: [
            {
              author: leadUser._id,
              text: 'Please align with the Linear typography style guide.',
            },
          ],
        },
        {
          title: 'Set up Push Notification service with FCM',
          description: 'Configure Firebase Cloud Messaging tokens and background notification handlers.',
          project: project._id,
          assignees: [devUser._id],
          status: 'inprogress',
          priority: 'urgent',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          order: 0,
          tags: ['Backend', 'FCM'],
          createdBy: leadUser._id,
        },
        {
          title: 'Audit MongoDB index performance on cart queries',
          description: 'Benchmark aggregation pipelines for customer active carts under high concurrency.',
          project: project._id,
          assignees: [leadUser._id],
          status: 'review',
          priority: 'medium',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          order: 0,
          tags: ['Database', 'Optimization'],
          createdBy: devUser._id,
        },
        {
          title: 'Implement REST API JWT Bearer authentication',
          description: 'JWT middleware, password hashing with bcrypt, and token refresh verification.',
          project: project._id,
          assignees: [leadUser._id, devUser._id],
          status: 'completed',
          priority: 'high',
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          order: 0,
          tags: ['Security', 'API'],
          createdBy: leadUser._id,
        },
      ];

      await Task.insertMany(sampleTasks);
      console.log(`📋 Seeded ${sampleTasks.length} demo tasks across Kanban columns.`);
    } else {
      console.log(`📋 Project already contains ${taskCount} tasks (skipping task creation).`);
    }

    console.log('🎉 Seeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Seeding failed: ${err.message}`);
    process.exit(1);
  }
};

seedData();
