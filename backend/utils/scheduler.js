import { fetchUpcomingLaunches } from '../services/launchService.js';
import LaunchSync from '../models/LaunchSync.js';

//Checks if the global launch database needs an update.
//Triggered by user visit, limited to once per hour.
export const getOrSyncLaunchDatabase = async () => {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = new Date();
  const syncId = 'GLOBAL_LAUNCH_SYNC';

  try {
    let syncRecord = await LaunchSync.findOne({ syncId });

    if (syncRecord) {
      const timeSinceUpdate = now - new Date(syncRecord.lastUpdated);
      if (timeSinceUpdate < ONE_HOUR) {
        return { status: 'FRESH', lastUpdated: syncRecord.lastUpdated };
      }
    }

    console.log('📡 [LAUNCH SYNC] Data stale (>1h). Fetching fresh launch manifest...');
    
    // This updates your existing Launch collection
    await fetchUpcomingLaunches();

    // Update the sync timestamp
    await LaunchSync.findOneAndUpdate(
      { syncId },
      { lastUpdated: now },
      { upsert: true }
    );

    return { status: 'UPDATED', lastUpdated: now };
  } catch (error) {
    console.error('❌ [LAUNCH SYNC] Error:', error.message);
    throw error;
  }
};

// You can keep a minimal startScheduler just for logs or other minor tasks
export const startScheduler = () => {
  console.log('🕐 User-Triggered Sync Active (1-hour window for Launches, 12-hour for Streams)');
};