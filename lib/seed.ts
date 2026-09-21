/**
 * Auto-seeds the database with default users if they don't exist.
 * Called on first DB connection in development.
 */
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

const DEFAULT_USERS = [
  { name: 'System Administrator', username: 'admin', password: 'Admin@1930', role: 'L3' as const, extension: '9000' },
  { name: 'Amit Sharma', username: 'officer.sharma', password: 'Officer@123', role: 'L2' as const, extension: '2001' },
  { name: 'Priya Kulkarni', username: 'analyst.priya', password: 'Analyst@123', role: 'L1' as const, extension: '1001' },
];

let seeded = false;

export async function autoSeed() {
  if (seeded) return;
  seeded = true;

  try {
    const count = await User.countDocuments();
    if (count > 0) return; // Already seeded

    console.log('🌱 [DEV] Auto-seeding database with default users...');
    for (const u of DEFAULT_USERS) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await User.create({ name: u.name, username: u.username, passwordHash, role: u.role, extension: u.extension, isActive: true });
      console.log(`   ✓ Created ${u.role}: ${u.username} / ${u.password}`);
    }
    console.log('🎉 [DEV] Auto-seed complete!\n');
  } catch (err) {
    console.error('[DEV] Auto-seed failed:', err);
  }
}
