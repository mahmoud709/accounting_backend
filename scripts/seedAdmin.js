/**
 * One-time bootstrap script to create the initial Admin user.
 * Usage: node scripts/seedAdmin.js
 */
require('dotenv').config();
const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const seedAdmin = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || 'admin@omega.local';
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin user already exists: ${existing.code} (${existing.email})`);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'System Administrator',
    email,
    password: process.env.ADMIN_PASSWORD || 'Admin@1234',
    role: 'Admin',
  });

  console.log(`Admin user created: ${admin.code} (${admin.email})`);
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
