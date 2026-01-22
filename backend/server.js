// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import launchRoutes from './routes/launches.js';
import streamRoutes from './routes/streams.js';
import chatRoutes from './routes/chat.js';
import { fetchUpcomingLaunches } from './services/launchService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/launches', launchRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Launch Window API - User-Triggered Architecture',
    status: 'online',
    mode: process.env.NODE_ENV || 'development'
  });
});

// Initialize app
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initial data load
    console.log('🔄 Fetching initial launch data...');
    await fetchUpcomingLaunches();
    console.log('✅ App initialized with latest launch data');
    
    // NOTE: No cron jobs! Everything is user-triggered:
    // - Launch updates: Triggered when user visits homepage (1h window)
    // - Stream syncs: Triggered when user visits detail page (12h window, 3-day filter)
    // - Scrub checks: Triggered when user visits detail page (if T-2h to T+10min)
    console.log('🕐 User-Triggered Sync Active (1-hour window for Launches, 12-hour for Streams)');
    console.log('🚨 Scrub Detection Active (checked on detail page visits for T-2h launches)');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Mode: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();