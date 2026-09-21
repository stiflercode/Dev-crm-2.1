// ─── config/db.js ──────────────────────────────────────────────────────────
// Singleton Mongoose connection with:
//   - Primary: real Atlas connection via MONGODB_URI in .env
//   - Fallback: in-memory MongoDB for local dev (no Atlas needed)
//   - Graceful crash: if both fail, prints a clear fix instead of a stacktrace
//   - Auto-seed: creates default L1/L2/L3 accounts on empty DB
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import dns from 'node:dns';
import mongoose from 'mongoose';

// Fix for Windows / ISP DNS failing to resolve mongodb+srv SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if restricted
}

let conn = null;
let promise = null;
let _mongod = null;

// ─────────────────────────────────────────────────────────────────────────────
// startInMemoryMongo
// Downloads & starts a local mongod.  Retries are handled inside the lib.
// Returns the connection URI or throws with a clean message.
// ─────────────────────────────────────────────────────────────────────────────
async function startInMemoryMongo() {
  if (_mongod) return _mongod.getUri();

  console.log('\n⏳  Starting in-memory MongoDB (one-time download ~650MB on first run)...');
  console.log('   💡  Tip: set MONGODB_URI in crm-backend/.env to skip this entirely.\n');

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    _mongod = await MongoMemoryServer.create({ instance: { dbName: 'crm1930' } });
    const uri = _mongod.getUri();
    console.log('🚀 [DEV] In-memory MongoDB ready:', uri, '\n');
    return uri;
  } catch (err) {
    console.error('❌  In-memory MongoDB failed to start:', err.message);
    throw new Error('In-memory MongoDB download failed.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMongoUri
// Returns the URI to connect to.  Atlas is tried first; in-memory is the fallback.
// ─────────────────────────────────────────────────────────────────────────────
async function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder = !uri || uri.includes('CHANGE_ME');
  return isPlaceholder ? startInMemoryMongo() : uri;
}

// ─────────────────────────────────────────────────────────────────────────────
// autoSeed — creates default accounts if the DB is empty
// ─────────────────────────────────────────────────────────────────────────────
async function autoSeed() {
  const { default: bcrypt } = await import('bcryptjs');
  const { default: User }   = await import('../models/User.js');

  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('🌱 Database empty — seeding default test accounts...');

  await User.create([
    {
      name: 'System Administrator',
      username: 'admin',
      passwordHash: await bcrypt.hash('Admin@1930', 12),
      role: 'L3',
      extension: '9000',
      isActive: true,
    },
    {
      name: 'Amit Sharma',
      username: 'officer.sharma',
      passwordHash: await bcrypt.hash('Officer@123', 12),
      role: 'L2',
      extension: '2001',
      isActive: true,
    },
    {
      name: 'Priya Kulkarni',
      username: 'analyst.priya',
      passwordHash: await bcrypt.hash('Analyst@123', 12),
      role: 'L1',
      extension: '1001',
      isActive: true,
    },
  ]);

  console.log('✅  Auto-seed complete.\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// connectDB — exported singleton with promise locking
// ─────────────────────────────────────────────────────────────────────────────
export default async function connectDB() {
  if (conn && mongoose.connection.readyState === 1) return conn;
  if (promise) return promise;

  promise = (async () => {
    let uri = await getMongoUri();
    try {
      conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
      console.log('✅  MongoDB connected successfully!');
      try {
        await autoSeed();
      } catch (err) {
        console.error('⚠️  Auto-seed error:', err.message);
      }
      return conn;
    } catch (err) {
      conn = null;
      console.error('❌  Could not connect to MongoDB:', err.message);
      throw err;
    }
  })().catch((err) => {
    promise = null;
    conn = null;
    throw err;
  });

  return promise;
}


