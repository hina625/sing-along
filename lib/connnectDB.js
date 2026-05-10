import mongoose from "mongoose";

// Standard Next.js + Mongoose cached-connection pattern.
// Without this, every API call would await a fresh `mongoose.connect()` —
// fine when the cluster is warm, but brutal during cold starts or when many
// API routes fire on a single page navigation (subscription + workspace +
// dashboard-stats + notifications, etc.).
const MONGODB_URI = process.env.DB_URL;

let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;
  if (!MONGODB_URI) {
    throw new Error("DB_URL is not set");
  }
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m);
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("error while connecting db:", err.message);
    throw err;
  }
  return cached.conn;
};

export default connectDB;
