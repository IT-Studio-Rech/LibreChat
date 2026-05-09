import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable is not set');

  const isDev = process.env.NODE_ENV !== 'production';

  await mongoose.connect(uri, { autoIndex: isDev });
  logger.info({ uri }, 'MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
