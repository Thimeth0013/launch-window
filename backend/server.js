import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import connectDB from './config/db.js';
import launchRoutes from './routes/launches.js';
import streamRoutes from './routes/streams.js';
import { startScheduler } from './utils/scheduler.js';
import { startScrubDetectionScheduler } from './services/scrubDetectionScheduler.js';
import { fetchUpcomingLaunches } from './services/launchService.js';
import Launch from './models/Launch.js';
import Stream from './models/Stream.js';
import { matchStreamsToLaunches } from './services/youtubeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'http://localhost:3000',
  process.env.FRONTEND_URL, // Your Vercel frontend URL (add in Railway env vars)
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/launches', launchRoutes);
app.use('/api/streams', streamRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Launch Window API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      launches: '/api/launches',
      streams: '/api/streams'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Launch Window API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ========== TEST ENDPOINTS (Disable in production if needed) ==========

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
        channelId: 'UC6uKrU_WqJ1R2HMTY3LIx5Q', // Everyday Astronaut
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

// Manual scrub detection for a specific launch
app.post('/api/test/check-scrub/:launchId', async (req, res) => {
  try {
    const { launchId } = req.params;
    const mongoose = (await import('mongoose')).default;
    
    console.log(`\n🧪 Manual scrub check for launch: ${launchId}`);
    
    // Find the launch
    const launch = await Launch.findOne({ id: launchId });
    
    if (!launch) {
      return res.status(404).json({
        error: 'Launch not found',
        launchId: launchId
      });
    }
    
    console.log(`Found launch: ${launch.name}`);
    console.log(`Current date: ${launch.date}`);
    console.log(`Current status: ${launch.status}`);
    
    // Import scrub detection functions
    const { fetchLaunchUpdate, classifyAndUpdateStreams, fetchNewStreamsAfterScrub } = await import('./services/scrubDetectionScheduler.js');
    
    // Fetch updated launch data
    const updatedData = await fetchLaunchUpdate(launchId);
    
    if (!updatedData) {
      return res.status(500).json({
        error: 'Could not fetch updated launch data from API',
        possibleReasons: [
          'API rate limit reached (5 calls/hour per launch)',
          'Network error',
          'Invalid launch ID'
        ]
      });
    }
    
    const oldDate = new Date(launch.date);
    const newDate = new Date(updatedData.net);
    const timeDiffHours = (newDate - oldDate) / (1000 * 60 * 60);
    const newStatus = updatedData.status?.name || launch.status;
    
    const response = {
      launchId: launchId,
      launchName: launch.name,
      oldDate: oldDate.toISOString(),
      newDate: newDate.toISOString(),
      oldStatus: launch.status,
      newStatus: newStatus,
      timeDifferenceHours: parseFloat(timeDiffHours.toFixed(2)),
      timeDifferenceDays: parseFloat((timeDiffHours / 24).toFixed(2)),
      actions: []
    };
    
    // Check if launch is complete
    if (newStatus === 'Success' || newStatus === 'Failure' || newStatus === 'Partial Failure') {
      console.log(`✅ Launch complete! Status: ${newStatus}`);
      
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          status: newStatus,
          date: newDate,
          updatedAt: new Date()
        }
      );
      
      await Stream.updateMany(
        { launchId: launch.id },
        { status: 'complete' }
      );
      
      response.actions.push({
        type: 'LAUNCH_COMPLETE',
        message: `Marked launch as ${newStatus}`,
        streamsUpdated: 'All streams marked as complete'
      });
      
      return res.json(response);
    }
    
    // Check for scrub (delay > 1 day = 24 hours)
    if (Math.abs(timeDiffHours) > 24) {
      console.log(`🚨 SCRUB DETECTED! Launch delayed by ${timeDiffHours.toFixed(1)} hours`);
      
      // Update launch data
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        }
      );
      
      response.actions.push({
        type: 'SCRUB_DETECTED',
        message: `Launch delayed by ${timeDiffHours.toFixed(1)} hours`,
        launchUpdated: true
      });
      
      // Get streams before classification
      const streamsBefore = await Stream.find({ launchId: launch.id });
      
      // Classify existing streams
      await classifyAndUpdateStreams(launch, newDate);
      
      // Get classification results
      const scrubbedStreams = await Stream.find({ launchId: launch.id, status: 'scrubbed' });
      const upcomingStreams = await Stream.find({ launchId: launch.id, status: 'upcoming' });
      
      response.actions.push({
        type: 'STREAMS_CLASSIFIED',
        scrubbedCount: scrubbedStreams.length,
        upcomingCount: upcomingStreams.length,
        scrubbedStreams: scrubbedStreams.map(s => ({
          title: s.title,
          channel: s.channelName,
          url: s.url
        })),
        upcomingStreams: upcomingStreams.map(s => ({
          title: s.title,
          channel: s.channelName,
          url: s.url
        }))
      });
      
      // Fetch new streams
      const streamCountBefore = await Stream.countDocuments({ launchId: launch.id });
      await fetchNewStreamsAfterScrub({ ...launch, date: newDate });
      const streamCountAfter = await Stream.countDocuments({ launchId: launch.id });
      
      response.actions.push({
        type: 'NEW_STREAMS_FETCHED',
        newStreamsAdded: streamCountAfter - streamCountBefore,
        totalStreamsNow: streamCountAfter
      });
      
      return res.json(response);
      
    } else if (Math.abs(timeDiffHours) > 0.05) { // More than 3 minutes
      console.log(`⏱️  Minor delay detected (${timeDiffHours.toFixed(2)} hours)`);
      
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        }
      );
      
      response.actions.push({
        type: 'MINOR_DELAY',
        message: 'Launch data updated, streams unchanged',
        launchUpdated: true
      });
      
      return res.json(response);
    } else {
      console.log(`✅ Launch on time, no changes needed`);
      
      response.actions.push({
        type: 'NO_CHANGES',
        message: 'Launch is on schedule'
      });
      
      return res.json(response);
    }
    
  } catch (error) {
    console.error('❌ Manual scrub check error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

// Get all launches to see their IDs
app.get('/api/test/launches', async (req, res) => {
  try {
    const launches = await Launch.find({})
      .sort({ date: 1 })
      .limit(20);
    
    res.json({
      count: launches.length,
      launches: launches.map(l => ({
        id: l.id,
        name: l.name,
        date: l.date,
        status: l.status,
        daysUntilLaunch: ((new Date(l.date) - new Date()) / (1000 * 60 * 60 * 24)).toFixed(2)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== END TEST ENDPOINTS ==========

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

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

// Start schedulers
startScheduler(); // Main scheduler (every 30 mins + stream matching)
startScrubDetectionScheduler(); // T-0 checker (every 5 mins)

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
});