import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from './config/db.js';
import launchRoutes from './routes/launches.js';
import streamRoutes from './routes/streams.js';
import { startScheduler } from './utils/scheduler.js';
import { fetchUpcomingLaunches } from './services/launchService.js';
import Launch from './models/Launch.js';
import Stream from './models/Stream.js';
import { matchStreamsToLaunches } from './services/youtubeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/launches', launchRoutes);
app.use('/api/streams', streamRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Launch Window API is running' });
});

// ========== TEST ENDPOINTS ==========

// Test YouTube API
app.get('/api/test/youtube', async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey || apiKey === 'your_youtube_api_key_here') {
      return res.json({ 
        error: 'YouTube API key not configured'
      });
    }

    // Test 1: Search for upcoming live streams
    const upcomingResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: 'UCIBaDdAbGlFDeS33shmlD0A', // Everyday Astronaut
        type: 'video',
        eventType: 'upcoming',
        maxResults: 5
      }
    });

    // Test 2: Search for currently live streams
    const liveResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key: apiKey,
        part: 'snippet',
        q: 'SpaceX launch',
        type: 'video',
        eventType: 'live',
        maxResults: 5
      }
    });

    res.json({
      success: true,
      message: 'YouTube API is working!',
      upcoming: {
        count: upcomingResponse.data.items.length,
        videos: upcomingResponse.data.items.map(item => ({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          videoId: item.id.videoId,
          scheduledStart: item.snippet.publishedAt
        }))
      },
      live: {
        count: liveResponse.data.items.length,
        videos: liveResponse.data.items.map(item => ({
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          videoId: item.id.videoId
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'YouTube API test failed',
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data
    });
  }
});

// Manual sync endpoint - USE EXISTING DATA
app.post('/api/test/sync', async (req, res) => {
  try {
    console.log('Manual sync triggered...');
    
    // Don't fetch new launches - just use what's already in DB
    const launches = await Launch.find({
      date: { 
        $gte: new Date(), 
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      }
    });
    
    console.log(`Found ${launches.length} upcoming launches in database`);
    
    if (launches.length === 0) {
      return res.json({
        message: 'No upcoming launches found in database',
        launches: 0,
        streams: 0
      });
    }
    
    // Search for streams
    await matchStreamsToLaunches(launches);
    
    const streams = await Stream.find({});
    
    res.json({ 
      message: 'Sync completed',
      launches: launches.length,
      streams: streams.length,
      launchNames: launches.map(l => l.name)
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test search with different queries
app.get('/api/test/search/:query', async (req, res) => {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    const searchQuery = req.params.query;
    
    console.log(`Testing search for: "${searchQuery}"`);
    
    // Test different search variations
    const searches = [
      { name: 'Original query', q: searchQuery },
      { name: 'With "live"', q: `${searchQuery} live` },
      { name: 'With "launch"', q: `${searchQuery} launch` },
      { name: 'Just "Starlink"', q: 'Starlink launch' },
      { name: 'SpaceX Starlink', q: 'SpaceX Starlink launch' }
    ];
    
    const results = [];
    
    for (const search of searches) {
      try {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            key: apiKey,
            part: 'snippet',
            q: search.q,
            type: 'video',
            eventType: 'upcoming',
            maxResults: 5
          }
        });
        
        results.push({
          searchType: search.name,
          query: search.q,
          count: response.data.items.length,
          videos: response.data.items.map(item => ({
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            videoId: item.id.videoId,
            publishedAt: item.snippet.publishedAt
          }))
        });
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        results.push({
          searchType: search.name,
          query: search.q,
          error: error.response?.data?.error?.message || error.message
        });
      }
    }
    
    res.json({
      originalQuery: searchQuery,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test MongoDB connection
app.get('/api/test/db', async (req, res) => {
  try {
    const mongoose = (await import('mongoose')).default;
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    if (state !== 1) {
      return res.status(500).json({
        status: 'error',
        message: `MongoDB is ${states[state]}`,
        uri: process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@')
      });
    }
    
    // Try a simple operation
    const count = await Launch.countDocuments();
    
    res.json({
      status: 'ok',
      mongoState: states[state],
      launchCount: count
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// ========== END TEST ENDPOINTS ==========

// Initial data fetch - wrapped in try-catch to prevent crashes
(async () => {
  try {
    console.log('Attempting to fetch initial launch data...');
    await fetchUpcomingLaunches();
    console.log('✅ Initial launch data fetched successfully');
  } catch (error) {
    console.log('⚠️  Could not fetch launches on startup (network issue)');
    console.log('   App will use cached data from database');
    console.log(`   Error: ${error.message}`);
  }
})();

// Start scheduler
startScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});