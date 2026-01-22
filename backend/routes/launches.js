import express from 'express';
import { getUpcomingLaunches, getLaunchById, fetchUpcomingLaunches } from '../services/launchService.js';
import { cleanupOldLaunches, getCleanupStats } from '../services/cleanupService.js';
import LaunchSync from '../models/LaunchSync.js';

const router = express.Router();

// GET /api/launches
// Triggered by user visit. Checks if the 1-hour update window has expired.
router.get('/', async (req, res) => {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = new Date();

  try {
    // 1. Check Global Sync status
    let globalSync = await LaunchSync.findOne({ syncId: 'GLOBAL_LAUNCH_SYNC' });

    // 2. If it's the first time OR 1 hour has passed, sync with external API
    if (!globalSync || (now - new Date(globalSync.lastUpdated)) > ONE_HOUR) {
      console.log("⏱️ [LAZY_SYNC] Hour elapsed. Refreshing launch database...");
      
      // Update the manifest (This also triggers internal stream cleanup for delays)
      await fetchUpcomingLaunches();

      // Update the timestamp so the next user doesn't trigger another API call
      globalSync = await LaunchSync.findOneAndUpdate(
        { syncId: 'GLOBAL_LAUNCH_SYNC' },
        { lastUpdated: now },
        { upsert: true, new: true }
      );
    }

    // 3. Fetch data from local MongoDB
    const limit = parseInt(req.query.limit) || 30;
    const launches = await getUpcomingLaunches(limit);
    
    console.log(`✅ [LAUNCHES] Returning ${launches.length} launches`);
    res.json(launches);
  } catch (error) {
    console.error("❌ [LAUNCH_ROUTE_ERROR]:", error.message);
    // If external API fails, we still serve what we have in the DB
    try {
      const launches = await getUpcomingLaunches(20);
      res.json(launches);
    } catch (dbError) {
      res.status(500).json({ message: 'Failed to fetch launches', error: dbError.message });
    }
  }
});

// GET /api/launches/cleanup/stats
// Get cleanup statistics without deleting
// MUST come before /:id route
router.get('/cleanup/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 48;
    const stats = await getCleanupStats(hours);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/launches/cleanup
//Manual cleanup endpoint - removes old launches - User-triggered (no cron job needed)
router.post('/cleanup', async (req, res) => {
  try {
    const hours = parseInt(req.body.hours) || 48;
    const result = await cleanupOldLaunches(hours);
    res.json({ 
      message: 'Cleanup completed', 
      ...result 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manually trigger stream sync for a specific launch
// MUST come before /:id GET route
router.post('/:id/sync-streams', async (req, res) => {
  try {
    const launchId = req.params.id;
    console.log(`📡 [MANUAL_STREAM_SYNC] Triggered for launch ID: ${launchId}`);
    
    const launch = await getLaunchById(launchId);
    
    if (!launch) {
      console.log(`❌ [NOT_FOUND] Launch with ID ${launchId} not found`);
      return res.status(404).json({ 
        message: 'Launch not found',
        requestedId: launchId 
      });
    }
    
    console.log(`🚀 [SYNCING] ${launch.name}`);
    
    // Import services
    const { matchStreamsToSingleLaunch } = await import('../services/youtubeService.js');
    const Stream = (await import('../models/Stream.js')).default;
    
    // Fetch streams from YouTube
    const streams = await matchStreamsToSingleLaunch(launch);
    
    // Save to database
    if (streams.length > 0) {
      // Delete old streams for this launch first
      await Stream.deleteMany({ launchId: launch.id });
      console.log(`🗑️ [CLEANUP] Removed old streams for launch ${launch.id}`);
      
      // Insert new streams
      const savedStreams = await Stream.insertMany(streams);
      console.log(`💾 [SAVED] ${savedStreams.length} streams saved to database`);
    } else {
      console.log(`ℹ️ [NO_STREAMS] No streams found to save`);
    }
    
    console.log(`✅ [SYNC_COMPLETE] Found and saved ${streams.length} streams`);
    
    res.json({
      message: 'Stream sync completed and saved to database',
      launchId: launch.id,
      launchName: launch.name,
      streamsFound: streams.length,
      streamsSaved: streams.length,
      streams: streams.map(s => ({
        title: s.title,
        channelName: s.channelName,
        url: s.url,
        matchScore: s.matchScore,
        scheduledStartTime: s.scheduledStartTime,
        platform: s.platform
      }))
    });
  } catch (error) {
    console.error('❌ [STREAM_SYNC_ERROR]:', error);
    res.status(500).json({ 
      message: 'Stream sync failed', 
      error: error.message 
    });
  }
});

// Get single launch by ID
// Also checks for last-minute scrubs if launch is imminent
router.get('/:id', async (req, res) => {
  try {
    const launchId = req.params.id;
    console.log(`🔍 [DETAIL_REQUEST] Received request for launch ID: ${launchId}`);
    
    let launch = await getLaunchById(launchId);
    
    if (!launch) {
      console.log(`❌ [NOT_FOUND] Launch with ID ${launchId} not found in database`);
      return res.status(404).json({ 
        message: 'Launch not found',
        requestedId: launchId 
      });
    }
    
    // Check for scrubs if launch is within critical window (T-2h to T+10min)
    const now = new Date();
    const launchDate = new Date(launch.date);
    const hoursUntilLaunch = (launchDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilLaunch >= -0.167 && hoursUntilLaunch <= 2) {
      console.log(`⏰ [CRITICAL] Launch at T-${hoursUntilLaunch.toFixed(2)}h - checking for updates...`);
      const { checkForScrub } = await import('../services/scrubDetectionScheduler.js');
      launch = await checkForScrub(launch);
    }
    
    console.log(`✅ [SUCCESS] Returning launch: ${launch.name}`);
    res.json(launch);
  } catch (error) {
    console.error(`❌ [DETAIL_ERROR] Error fetching launch:`, error);
    res.status(500).json({ 
      message: 'Error fetching launch details', 
      error: error.message 
    });
  }
});

export default router;