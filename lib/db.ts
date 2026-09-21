import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

/**
 * Returns the MongoDB URI to connect to.
 * In development, if MONGODB_URI is not configured (or is a placeholder),
 * falls back to an in-memory MongoDB instance via mongodb-memory-server.
 */
async function getMongoUri(): Promise<string> {
  const uri = process.env.MONGODB_URI;
  const isPlaceholder = !uri || uri.includes('CHANGE_ME');

  if (isPlaceholder && process.env.NODE_ENV !== 'production') {
    // Use in-memory MongoDB for local dev without Atlas
    const { MongoMemoryServer } = await import('mongodb-memory-server');

    // Reuse existing in-memory server if already started
    if (!global._memoryMongoUri) {
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: 'crm1930' },
      });
      global._memoryMongoUri = mongod.getUri();
      console.log('\n🚀 [DEV] Using in-memory MongoDB:', global._memoryMongoUri);
      console.log('📝 To use Atlas, update MONGODB_URI in .env.local\n');
    }

    return global._memoryMongoUri;
  }

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set in .env.local');
  }

  return uri;
}

declare global {
  // eslint-disable-next-line no-var
  var _memoryMongoUri: string;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  try {
    if (cached.promise) {
      cached.conn = await cached.promise;
      return cached.conn;
    }
  } catch (err) {
    console.warn('⚠️ Cached database connection promise was rejected. Resetting cache...');
    cached.promise = null;
    cached.conn = null;
  }

  if (!cached.promise) {
    const uri = await getMongoUri();
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // 5s timeout to fail fast
    }).catch(async (err) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`⚠️ MongoDB connection to Atlas failed (${err.message}). Falling back to local in-memory DB...`);
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        if (!global._memoryMongoUri) {
          const mongod = await MongoMemoryServer.create({
            instance: { dbName: 'crm1930' },
          });
          global._memoryMongoUri = mongod.getUri();
        }
        console.log('🚀 Connecting to fallback in-memory MongoDB:', global._memoryMongoUri);
        return mongoose.connect(global._memoryMongoUri, {
          bufferCommands: false,
        });
      }
      throw err;
    });
  }

  cached.conn = await cached.promise;

  // Auto-seed if the database is empty
  try {
    const User = (await import('./models/User')).default;
    const count = await User.countDocuments();
    if (count === 0) {
      console.log('🌱 Database is empty. Auto-seeding default testing accounts...');
      const bcrypt = (await import('bcryptjs')).default;

      // L3 Admin
      await User.create({
        name: 'System Administrator',
        username: 'admin',
        passwordHash: await bcrypt.hash('Admin@1930', 12),
        role: 'L3',
        extension: '9000',
        isActive: true,
      });

      // L2 Officer
      await User.create({
        name: 'Amit Sharma',
        username: 'officer.sharma',
        passwordHash: await bcrypt.hash('Officer@123', 12),
        role: 'L2',
        extension: '2001',
        isActive: true,
      });

      // L1 Analyst
      await User.create({
        name: 'Priya Kulkarni',
        username: 'analyst.priya',
        passwordHash: await bcrypt.hash('Analyst@123', 12),
        role: 'L1',
        extension: '1001',
        isActive: true,
      });

      console.log('✅ Auto-seeding complete.');
    }
  } catch (err) {
    console.error('⚠️ Auto-seeding failed:', err);
  }

  return cached.conn;
}

export default connectDB;
