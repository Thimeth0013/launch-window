import cron from 'node-cron';
import { fetchUpcomingLaunches } from '../services/launchService.js';
import { matchStreamsToLaunches } from '../services/youtubeService.js';
import Launch from '../models/Launch.js';
import Stream from '../models/Stream.js';

// Check if a launch has been significantly delayed or status changed
const checkForLaunchChanges = (oldLaunch, newLaunch) => {
  const oldDate = new Date(oldLaunch.date);
  const newDate = new Date(newLaunch.date);
  const oldStatus = oldLaunch.status;
  const newStatus = newLaunch.status;
  
  // Calculate time difference in hours
  const timeDiffHours = Math.abs((newDate - oldDate) / (1000 * 60 * 60));
  
  // Check if launch was delayed significantly (more than 24 hours)
  const isSignificantDelay = timeDiffHours > 24;
  
  // Check if status changed to uncertain
  const statusChangedToUncertain = 
    (oldStatus === 'Go' || oldStatus === 'Go for Launch') &&
    (newStatus === 'TBD' || newStatus === 'TBC' || newStatus === 'To Be Determined' || newStatus === 'To Be Confirmed');
  
  return {
    isSignificantDelay,
    statusChangedToUncertain,
    timeDiffHours,
    oldDate,
    newDate,
    oldStatus,
    newStatus
  };
};

// Remove streams for a launch that's been delayed or status changed
const removeStreamsForLaunch = async (launchId, reason) => {
  try {
    const result = await Stream.deleteMany({ launchId: launchId });
    if (result.deletedCount > 0) {
      console.log(`   🗑️  Removed ${result.deletedCount} streams for launch ${launchId} (${reason})`);
      return result.deletedCount;
    }
    return 0;
  } catch (error) {
    console.error(`   ❌ Error removing streams for launch ${launchId}:`, error.message);
    return 0;
  }
};

// Update launches and check for changes
const updateLaunchesWithStreamCleanup = async () => {
  try {
    console.log('\n⏰ [LAUNCH UPDATE] Running scheduled launch update with stream cleanup...');
    
    // Get current launches from database BEFORE update
    const oldLaunches = await Launch.find({});
    
    // Create a map of old launches for easy lookup
    const oldLaunchMap = new Map();
    oldLaunches.forEach(launch => {
      oldLaunchMap.set(launch.id, {
        id: launch.id,
        name: launch.name,
        date: launch.date,
        status: launch.status
      });
    });
    
    console.log(`   📋 Cached ${oldLaunches.length} existing launches for comparison`);
    
    // Fetch new launch data from API (this updates the database)
    await fetchUpcomingLaunches();
    
    // Get updated launches from database AFTER update
    const newLaunches = await Launch.find({});
    
    // Check each updated launch for significant changes
    let totalStreamsRemoved = 0;
    let launchesWithChanges = 0;
    
    for (const newLaunch of newLaunches) {
      const oldLaunch = oldLaunchMap.get(newLaunch.id);
      
      // Only check launches that existed before (skip new launches)
      if (oldLaunch) {
        const changes = checkForLaunchChanges(oldLaunch, newLaunch);
        
        // If significant delay or status changed to uncertain, remove streams
        if (changes.isSignificantDelay) {
          console.log(`   ⚠️  Launch "${newLaunch.name}" delayed by ${changes.timeDiffHours.toFixed(1)} hours`);
          console.log(`      Old date: ${changes.oldDate.toISOString()}`);
          console.log(`      New date: ${changes.newDate.toISOString()}`);
          const removed = await removeStreamsForLaunch(newLaunch.id, `delayed ${changes.timeDiffHours.toFixed(1)}h`);
          totalStreamsRemoved += removed;
          launchesWithChanges++;
        } else if (changes.statusChangedToUncertain) {
          console.log(`   ⚠️  Launch "${newLaunch.name}" status changed from "${changes.oldStatus}" to "${changes.newStatus}"`);
          const removed = await removeStreamsForLaunch(newLaunch.id, `status changed to ${changes.newStatus}`);
          totalStreamsRemoved += removed;
          launchesWithChanges++;
        }
      }
    }
    
    console.log(`✅ [LAUNCH UPDATE] Launches updated successfully`);
    if (launchesWithChanges > 0) {
      console.log(`   🧹 Cleaned up ${totalStreamsRemoved} streams from ${launchesWithChanges} delayed/changed launches`);
    } else {
      console.log(`   ℹ️  No significant launch changes detected`);
    }
    
  } catch (error) {
    console.error('❌ [LAUNCH UPDATE] Error updating launches:', error.message);
  }
};

export const startScheduler = () => {
  console.log('🕐 Starting schedulers...');

  // Schedule 1: Update launches every 10 minutes with stream cleanup
  cron.schedule('*/10 * * * *', async () => {
    await updateLaunchesWithStreamCleanup();
  });

  // Schedule 2: Match streams to launches twice a day (12am and 12pm)
  cron.schedule('0 0,12 * * *', async () => {
    console.log('\n🔍 [STREAM MATCHING] Running scheduled stream matching...');
    try {
      // Get launches within 2 days (matching youtubeService filter)
      const launches = await Launch.find({
        date: { 
          $gte: new Date(),
          $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        },
        // Only match streams for launches with confirmed status
        status: { $nin: ['TBD', 'TBC', 'To Be Determined', 'To Be Confirmed'] }
      });
      
      console.log(`   Found ${launches.length} confirmed launches within 2 days`);
      
      if (launches.length > 0) {
        await matchStreamsToLaunches(launches);
        console.log('✅ [STREAM MATCHING] Stream matching completed');
      } else {
        console.log('ℹ️  [STREAM MATCHING] No confirmed launches found within 2 days');
      }
    } catch (error) {
      console.error('❌ [STREAM MATCHING] Error matching streams:', error.message);
    }
  });

  console.log('✅ Schedulers started successfully:');
  console.log('   📅 Launch updates with stream cleanup: Every 30 minutes');
  console.log('   🎥 Stream matching: Twice daily (12am, 12pm) for launches <2 days away');
};