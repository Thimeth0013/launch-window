import StreamSync from '../models/StreamSync.js';
import * as youtubeService from './youtubeService.js';

export const getOrSyncStreams = async (launch) => {
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  const now = new Date();

  try {
    // 1. Check for an existing sync record
    let syncRecord = await StreamSync.findOne({ launchId: launch.id });

    if (syncRecord) {
      const timeSinceUpdate = now - new Date(syncRecord.lastUpdated);
      
      // 2. If data is fresh (< 12 hours old), return it immediately
      if (timeSinceUpdate < TWELVE_HOURS) {
        console.log(`📦 [CACHE] Serving existing streams for: ${launch.name}`);
        return syncRecord.streams;
      }
    }

    // 3. Data is old or missing. Trigger search for the 8 specific channels
    console.log(`📡 [SYNC] Refreshing streams from YouTube for: ${launch.name}`);
    
    // We pass the launch object to your original logic
    const freshStreams = await youtubeService.matchStreamsToSingleLaunch(launch);

    // 4. Update the sync record with new streams and current timestamp
    syncRecord = await StreamSync.findOneAndUpdate(
      { launchId: launch.id },
      { 
        streams: freshStreams, 
        lastUpdated: now 
      },
      { upsert: true, new: true }
    );

    return syncRecord.streams;
  } catch (error) {
    console.error("STREAM_SYNC_ERROR:", error);
    // Fallback: return cached streams even if old if API fails
    return syncRecord ? syncRecord.streams : [];
  }
};