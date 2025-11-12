import cron from 'node-cron';
import axios from 'axios';
import Launch from '../models/Launch.js';
import Stream from '../models/Stream.js';
import { checkChannelUpcomingStreams } from './youtubeService.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';
const KNOWN_CHANNELS = [
  'UC6uKrU_WqJ1R2HMTY3LIx5Q', // Everyday Astronaut
  'UCSUu1lih2RifWkKtDOJdsBA', // NASASpaceflight
  'UCGCndz0n0NHmLHfd64FRjIA', // The Launch Pad
  'UCoLdERT4-TJ82PJOHSrsZLQ', // Spaceflight Now
  'UCVTomc35agH1SM6kCKzwW_g', // VideoFromSpace
  'UC2_vpnza621Sa0cf_xhqJ8Q', // Raw Space
];

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

// Classify streams as SCRUBBED or UPCOMING
async function classifyAndUpdateStreams(launch, newLaunchDate) {
  console.log(`🔍 Classifying streams for scrubbed launch: ${launch.name}`);
  
  const streams = await Stream.find({ launchId: launch.id });
  const newDate = new Date(newLaunchDate);
  
  let scrubbedCount = 0;
  let upcomingCount = 0;
  
  for (const stream of streams) {
    const streamDate = new Date(stream.scheduledStartTime);
    const titleLower = stream.title.toLowerCase();
    
    // Check if stream is about the scrub
    const isScrubbed = streamDate < newDate || 
                       titleLower.includes('scrub') || 
                       titleLower.includes('scrubbed') ||
                       titleLower.includes('delay') ||
                       titleLower.includes('postpone');
    
    await Stream.findOneAndUpdate(
      { streamId: stream.streamId },
      { 
        status: isScrubbed ? 'scrubbed' : 'upcoming',
        updatedAt: new Date()
      }
    );
    
    if (isScrubbed) {
      scrubbedCount++;
      console.log(`   🚫 SCRUBBED: "${stream.title}"`);
    } else {
      upcomingCount++;
      console.log(`   ✅ UPCOMING: "${stream.title}"`);
    }
  }
  
  console.log(`   📊 ${scrubbedCount} scrubbed, ${upcomingCount} upcoming`);
}

// Fetch new streams after scrub detection
async function fetchNewStreamsAfterScrub(launch) {
  console.log(`🔍 Searching for new streams after scrub for: ${launch.name}`);
  
  const allStreams = [];
  
  for (const channelId of KNOWN_CHANNELS) {
    const upcomingStreams = await checkChannelUpcomingStreams(channelId, launch.name);
    const liveStreams = await checkChannelLiveStreams(channelId, launch.name);
    
    allStreams.push(...upcomingStreams, ...liveStreams);
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  const newLaunchDate = new Date(launch.date);
  let newStreamCount = 0;
  
  for (const stream of allStreams) {
    // Check if this stream already exists
    const existing = await Stream.findOne({ streamId: stream.streamId });
    
    if (!existing) {
      // New stream found
      const streamDate = new Date(stream.scheduledStartTime);
      const titleLower = stream.title.toLowerCase();
      
      const isScrubbed = streamDate < newLaunchDate || 
                         titleLower.includes('scrub') || 
                         titleLower.includes('scrubbed');
      
      await Stream.create({
        ...stream,
        launchId: launch.id,
        status: isScrubbed ? 'scrubbed' : 'upcoming',
        matchScore: 0.8
      });
      
      newStreamCount++;
      console.log(`   ➕ NEW: "${stream.title}" (${isScrubbed ? 'SCRUBBED' : 'UPCOMING'})`);
    }
  }
  
  console.log(`   📊 Added ${newStreamCount} new streams`);
}

// Main function to check launches at T-0
export const checkLaunchesAtT0 = async () => {
  const now = new Date();
  
  // Find launches where countdown should be at or past zero
  // (within 5 minutes of scheduled time to account for timing)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesAhead = new Date(now.getTime() + 5 * 60 * 1000);
  
  const launchesAtT0 = await Launch.find({
    date: { 
      $gte: fiveMinutesAgo,
      $lte: fiveMinutesAhead
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
    
    console.log(`   New status: ${newStatus}`);
    console.log(`   New date: ${newDate}`);
    console.log(`   Time difference: ${timeDiffHours.toFixed(2)} hours`);
    
    // Check if launch is complete
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
      await Stream.updateMany(
        { launchId: launch.id },
        { status: 'complete' }
      );
      
      console.log(`   📋 Marked launch and streams as complete`);
      continue;
    }
    
    // Check for scrub (delay > 1 day = 24 hours)
    if (Math.abs(timeDiffHours) > 24) {
      console.log(`   🚨 SCRUB DETECTED! Launch delayed by ${timeDiffHours.toFixed(1)} hours`);
      
      // Update launch data
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        }
      );
      
      // Classify existing streams
      await classifyAndUpdateStreams(launch, newDate);
      
      // Fetch new streams
      await fetchNewStreamsAfterScrub({ ...launch, date: newDate });
      
      console.log(`   ✅ Scrub handling complete`);
      
    } else if (Math.abs(timeDiffHours) > 0.05) { // More than 3 minutes
      console.log(`   ⏱️  Minor delay detected (${timeDiffHours.toFixed(2)} hours)`);
      
      // Just update launch data, don't touch streams
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
  // Check every minute for launches at T-0
  cron.schedule('* * * * *', async () => {
    try {
      await checkLaunchesAtT0();
    } catch (error) {
      console.error('❌ Scrub detection error:', error.message);
    }
  });
  
  console.log('🔍 Scrub detection scheduler started (checking every minute)');
};