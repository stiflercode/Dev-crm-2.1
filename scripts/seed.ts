import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import connectDB from '../lib/db';
import User from '../lib/models/User';

async function seed() {
  // Load .env.local manually
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^MONGODB_URI=(.*)$/m);
      if (match && match[1]) {
        process.env.MONGODB_URI = match[1].trim();
      }
    }
  } catch (err) {
    console.warn('⚠️ Could not load .env.local manually:', err);
  }

  await connectDB();

  console.log('🌱 Seeding database...');

  // Create default L3 admin
  const existing = await User.findOne({ username: 'admin' });
  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@1930', 12);
    await User.create({
      name: 'System Administrator',
      username: 'admin',
      passwordHash,
      role: 'L3',
      extension: '9000',
      isActive: true,
    });
    console.log('✅ Created L3 admin — username: admin, password: Admin@1930');
  } else {
    console.log('⏭  Admin already exists, skipping.');
  }

  // Create sample L2 officer
  const l2Exists = await User.findOne({ username: 'officer.sharma' });
  if (!l2Exists) {
    const passwordHash = await bcrypt.hash('Officer@123', 12);
    await User.create({
      name: 'Amit Sharma',
      username: 'officer.sharma',
      passwordHash,
      role: 'L2',
      extension: '2001',
      isActive: true,
    });
    console.log('✅ Created L2 officer — username: officer.sharma, password: Officer@123');
  }

  // Create sample L1 analyst
  const l1Exists = await User.findOne({ username: 'analyst.priya' });
  if (!l1Exists) {
    const passwordHash = await bcrypt.hash('Analyst@123', 12);
    await User.create({
      name: 'Priya Kulkarni',
      username: 'analyst.priya',
      passwordHash,
      role: 'L1',
      extension: '1001',
      isActive: true,
    });
    console.log('✅ Created L1 analyst — username: analyst.priya, password: Analyst@123');
  }

  console.log('🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
