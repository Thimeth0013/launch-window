import express from 'express';
import { getOrSyncStreams } from '../services/streamService.js';
import { checkForScrub } from '../services/scrubDetectionScheduler.js';
import Launch from '../models/Launch.js';

const router = express.Router();

/**
 * GET /api/streams/launch/:launchId
 * Fetches or syncs streams for a specific launch
 * Also checks for last-minute scrubs if launch is imminent
 */
router.get('/launch/:launchId', async (req, res) => {
  try {
    const launchId = req.params.launchId;
    console.log(`🎥 [STREAM_REQUEST] Received request for launch ID: ${launchId}`);
    
    // Use findOne with custom 'id' field, NOT MongoDB's _id
    let launch = await Launch.findOne({ id: launchId });
    
    if (!launch) {
      console.log(`❌ [STREAM_NOT_FOUND] Launch with ID ${launchId} not found`);
      return res.status(404).json({ error: "Launch not found" });
    }

    console.log(`✅ [STREAM_FOUND] Found launch: ${launch.name}`);
    
    // Calculate time until launch
    const now = new Date();
    const launchDate = new Date(launch.date);
    const hoursUntilLaunch = (launchDate - now) / (1000 * 60 * 60);
    const daysUntilLaunch = hoursUntilLaunch / 24;
    
    // STEP 1: Check for last-minute scrubs (if launch is within 2 hours)
    if (hoursUntilLaunch >= -0.167 && hoursUntilLaunch <= 2) {
      console.log(`⏰ [CRITICAL_WINDOW] Launch is at T-${hoursUntilLaunch.toFixed(2)}h - checking for scrubs...`);
      launch = await checkForScrub(launch);
      
      // Recalculate time after potential update
      const updatedLaunchDate = new Date(launch.date);
      const updatedHoursUntilLaunch = (updatedLaunchDate - now) / (1000 * 60 * 60);
      
      console.log(`   Updated T-${updatedHoursUntilLaunch.toFixed(2)}h`);
    }
    
    // STEP 2: Check if launch is within 3-day stream window
    const updatedHoursUntilLaunch = (new Date(launch.date) - now) / (1000 * 60 * 60);
    
    if (updatedHoursUntilLaunch > 72) {
      console.log(`⏰ [TOO_EARLY] Launch is ${(updatedHoursUntilLaunch/24).toFixed(1)} days away. Streams typically appear 2-3 days before launch.`);
      return res.json([]);
    }
    
    // If launch has already happened, still try to get streams (for replay value)
    if (updatedHoursUntilLaunch < 0) {
      console.log(`🚀 [PAST_LAUNCH] Launch already occurred ${Math.abs(updatedHoursUntilLaunch/24).toFixed(1)} days ago. Fetching archived streams.`);
    } else {
      console.log(`⏱️ [WITHIN_WINDOW] Launch is ${(updatedHoursUntilLaunch/24).toFixed(1)} days away. Syncing streams...`);
    }
    
    // STEP 3: Get or sync streams (uses 12-hour cache)
    const streams = await getOrSyncStreams(launch);
    
    console.log(`📺 [STREAM_RESULT] Returning ${streams.length} streams for ${launch.name}`);
    res.json(streams);
  } catch (error) {
    console.error(`❌ [STREAM_ERROR] Error fetching streams:`, error);
    res.status(500).json({ error: "INTERNAL_UPLINK_ERROR", message: error.message });
  }
});

export default router;