import cron from 'node-cron';
import axios from 'axios';
import Launch from '../models/Launch.js';
import Stream from '../models/Stream.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';

// Track API calls per launch to respect rate limits (5 calls per launch per hour)
const apiCallTracker = new Map(); // { launchId: [timestamps] }

// Check if we can make an API call for this launch
function canMakeApiCall(launchId) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  if (!apiCallTracker.has(launchId)) {
    apiCallTracker.set(launchId, []);
  }
  
  // Clean up old timestamps (older than 1 hour)
  const timestamps = apiCallTracker.get(launchId).filter(ts => ts > oneHourAgo);
  apiCallTracker.set(launchId, timestamps);
  
  // Check if we've made less than 5 calls in the last hour
  return timestamps.length < 5;
}

// Record an API call
function recordApiCall(launchId) {
  if (!apiCallTracker.has(launchId)) {
    apiCallTracker.set(launchId, []);
  }
  apiCallTracker.get(launchId).push(Date.now());
}

// Fetch updated launch data from API
export async function fetchLaunchUpdate(launchId) {
  if (!canMakeApiCall(launchId)) {
    console.log(`⚠️  Rate limit: Cannot fetch launch ${launchId} (5 calls/hour limit)`);
    return null;
  }
  
  try {
    console.log(`📡 Fetching updated data for launch ${launchId}...`);
    const response = await axios.get(`${LAUNCH_LIBRARY_API}/launch/${launchId}/`, {
      timeout: 30000
    });
    
    recordApiCall(launchId);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching launch ${launchId}:`, error.message);
    return null;
  }
}

// Mark streams as scrubbed or complete based on launch status
async function updateStreamStatus(launchId, status) {
  try {
    const result = await Stream.updateMany(
      { launchId: launchId },
      { 
        status: status,
        updatedAt: new Date()
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`   📺 Updated ${result.modifiedCount} streams to status: ${status}`);
    }
  } catch (error) {
    console.error(`   ❌ Error updating streams:`, error.message);
  }
}

// Main function to check launches at T-0
export const checkLaunchesAtT0 = async () => {
  const now = new Date();
  
  // Find launches within ±10 minutes of scheduled time
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const tenMinutesAhead = new Date(now.getTime() + 10 * 60 * 1000);
  
  const launchesAtT0 = await Launch.find({
    date: { 
      $gte: tenMinutesAgo,
      $lte: tenMinutesAhead
    },
    status: { 
      $nin: ['Success', 'Failure', 'Partial Failure'] // Don't check completed launches
    }
  });
  
  if (launchesAtT0.length === 0) {
    return; // No launches at T-0
  }
  
  console.log(`\n🚀 === Checking ${launchesAtT0.length} launch(es) at T-0 ===`);
  
  for (const launch of launchesAtT0) {
    console.log(`\n⏰ Launch at T-0: ${launch.name}`);
    console.log(`   Scheduled: ${launch.date}`);
    
    // Fetch updated launch data
    const updatedData = await fetchLaunchUpdate(launch.id);
    
    if (!updatedData) {
      console.log(`   ⚠️  Could not fetch update, will retry later`);
      continue;
    }
    
    const oldDate = new Date(launch.date);
    const newDate = new Date(updatedData.net);
    const timeDiffHours = (newDate - oldDate) / (1000 * 60 * 60);
    const newStatus = updatedData.status?.name || launch.status;
    
    console.log(`   Old status: ${launch.status} → New status: ${newStatus}`);
    console.log(`   Old date: ${oldDate.toISOString()}`);
    console.log(`   New date: ${newDate.toISOString()}`);
    console.log(`   Time difference: ${timeDiffHours.toFixed(2)} hours`);
    
    // Check if launch is complete (Success/Failure)
    if (newStatus === 'Success' || newStatus === 'Failure' || newStatus === 'Partial Failure') {
      console.log(`   ✅ Launch complete! Status: ${newStatus}`);
      
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          status: newStatus,
          date: newDate,
          updatedAt: new Date()
        }
      );
      
      // Mark all streams as complete
      await updateStreamStatus(launch.id, 'complete');
      
      console.log(`   📋 Marked launch and streams as complete`);
      continue;
    }
    
    // Check for last-minute scrub (delay > 1 hour at T-0)
    if (Math.abs(timeDiffHours) > 1) {
      console.log(`   🚨 LAST-MINUTE SCRUB! Launch delayed by ${timeDiffHours.toFixed(1)} hours`);
      
      // Update launch data
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        }
      );
      
      // Mark streams as scrubbed (the main scheduler will clean them up and find new ones)
      await updateStreamStatus(launch.id, 'scrubbed');
      
      console.log(`   ✅ Scrub recorded - main scheduler will clean up and find new streams`);
      
    } else if (Math.abs(timeDiffHours) > 0.05) { // More than 3 minutes
      console.log(`   ⏱️  Minor delay detected (${timeDiffHours.toFixed(2)} hours)`);
      
      // Just update launch data
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        }
      );
      
      console.log(`   ✅ Launch data updated`);
    } else {
      console.log(`   ✅ Launch on time, no changes needed`);
    }
  }
  
  console.log(`\n=== T-0 check completed ===\n`);
};

// Start the scrub detection scheduler
export const startScrubDetectionScheduler = () => {
  // Check every 5 minutes for launches at T-0 (less aggressive than every minute)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await checkLaunchesAtT0();
    } catch (error) {
      console.error('❌ Scrub detection error:', error.message);
    }
  });
  
  console.log('🔍 Scrub detection scheduler started (checking every 5 minutes at T-0)');
};