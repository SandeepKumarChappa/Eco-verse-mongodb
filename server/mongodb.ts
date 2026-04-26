import mongoose from 'mongoose';

let isReconnecting = false;

/**
 * Connect to MongoDB using Mongoose with automatic reconnection handling.
 * This is called at server startup in server/index.ts.
 */
export async function connectToMongoDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  try {
    // Attempt connection with optimized timeouts for responsiveness
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected');
    isReconnecting = false;
  } catch (error) {
    console.error('❌ Mongo Error:', error);
    throw error;
  }

  // Handle successful connection
  mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
    isReconnecting = false;
  });

  // Handle disconnection with automatic reconnection
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected (likely due to inactivity)');
    
    // Prevent multiple simultaneous reconnection attempts
    if (isReconnecting) {
      console.log('Reconnection already in progress, skipping...');
      return;
    }
    
    isReconnecting = true;
    console.log('Attempting to reconnect to MongoDB in 5 seconds...');
    
    setTimeout(async () => {
      try {
        if (!process.env.MONGODB_URI) {
          console.error('❌ MONGODB_URI is not set, cannot reconnect');
          isReconnecting = false;
          return;
        }
        
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB reconnected successfully');
        isReconnecting = false;
      } catch (error) {
        console.error('❌ MongoDB reconnection failed:', error);
        isReconnecting = false;
        // Connection will attempt again on next disconnection
      }
    }, 5000);
  });

  // Handle runtime errors
  mongoose.connection.on('error', (err) => {
    console.error('❌ Mongo Runtime Error:', err);
  });
}
