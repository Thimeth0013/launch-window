import axios from 'axios';
import Launch from '../models/Launch.js';
import StreamSync from '../models/StreamSync.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';

//Check if a specific launch needs a scrub check (called on user visit)
export const checkForScrub = async (launch) => {
  // Early return if launch is null/undefined
  if (!launch) {
    console.log('⚠️  [SCRUB_CHECK] Launch is null, skipping check');
    return null;
  }

  const now = new Date();
  const launchDate = new Date(launch.date);
  const hoursUntilLaunch = (launchDate - now) / (1000 * 60 * 60);
  
  // REDUCED WINDOW: Only check 1h before to 10min after
  // Since global sync runs every hour, this catches last-minute changes
  if (hoursUntilLaunch < -0.167 || hoursUntilLaunch > 1) {
    return launch; // Outside critical window, return as-is
  }
  
  console.log(`🚨 [SCRUB_CHECK] Launch "${launch.name}" is at T-${hoursUntilLaunch.toFixed(1)}h - checking for updates...`);
  
  try {
    // Fetch fresh data from SpaceDevs API for this specific launch
    const response = await axios.get(
      `${LAUNCH_LIBRARY_API}/launch/${launch.id}/`,
      { 
        timeout: 10000,
        validateStatus: (status) => status < 500 // Don't throw on 4xx
      }
    );

    // Handle API errors gracefully
    if (response.status === 404) {
      console.log(`   ⚠️  Launch not found in API (ID: ${launch.id})`);
      return launch; // Return cached version if API doesn't have it
    }

    if (response.status !== 200) {
      console.log(`   ⚠️  API returned ${response.status}, using cached data`);
      return launch;
    }
    
    const apiData = response.data;
    const oldDate = new Date(launch.date);
    const newDate = new Date(apiData.net);
    const delayMinutes = (newDate - oldDate) / (1000 * 60);
    const newStatus = apiData.status?.name || launch.status;
    
    // CASE 1: Launch Completed
    if (newStatus === 'Success' || newStatus === 'Failure' || newStatus === 'Partial Failure') {
      console.log(`   ✅ Launch completed with status: ${newStatus}`);
      
      const updatedLaunch = await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          status: newStatus,
          date: newDate,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      return updatedLaunch || launch; // Fallback to original if update fails
    }
    
    // CASE 2: Scrub/Delay Detected
    if (Math.abs(delayMinutes) > 5) {
      const delayType = delayMinutes > 0 ? 'delayed' : 'moved earlier';
      console.log(`   ⚠️  Launch ${delayType} by ${Math.abs(delayMinutes).toFixed(1)} minutes`);
      console.log(`   Old: ${oldDate.toLocaleString()}`);
      console.log(`   New: ${newDate.toLocaleString()}`);
      
      // Update launch time
      const updatedLaunch = await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          date: newDate,
          status: newStatus,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      // Determine if we need to clear streams
      const oldDay = oldDate.toISOString().split('T')[0];
      const newDay = newDate.toISOString().split('T')[0];
      const dateDayChanged = oldDay !== newDay;
      const significantDelay = Math.abs(delayMinutes) > 60;
      
      if (dateDayChanged || significantDelay) {
        console.log(`   🗑️  Clearing stream cache (${dateDayChanged ? 'date changed' : 'delay > 1h'})`);
        await StreamSync.deleteOne({ launchId: launch.id });
      } else {
        console.log(`   ℹ️  Minor delay - keeping streams (already live or same day)`);
      }
      
      return updatedLaunch || launch;
    }
    
    // CASE 3: Status changed but time same
    if (newStatus !== launch.status) {
      console.log(`   📊 Status changed: ${launch.status} → ${newStatus}`);
      
      const updatedLaunch = await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          status: newStatus,
          date: newDate,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      return updatedLaunch || launch;
    }
    
    // No changes detected
    console.log(`   ✅ Launch on schedule`);
    return launch;
    
  } catch (error) {
    // CRITICAL: Never throw errors, always return original launch
    // This prevents 500 errors on the detail page
    console.error(`   ❌ Scrub check failed:`, error.message);
    console.log(`   ↩️  Returning cached launch data`);
    
    // Return original launch data if API fails
    return launch;
  }
};

// Lightweight check - just updates launch time without YouTube search
// Used for minor delays during imminent launches
export const quickUpdateLaunchTime = async (launchId) => {
  try {
    const response = await axios.get(
      `${LAUNCH_LIBRARY_API}/launch/${launchId}/`,
      { 
        timeout: 5000,
        validateStatus: (status) => status < 500
      }
    );

    if (response.status !== 200) {
      console.log(`Quick update skipped: API returned ${response.status}`);
      return false;
    }
    
    const apiData = response.data;
    
    await Launch.findOneAndUpdate(
      { id: launchId },
      {
        date: new Date(apiData.net),
        status: apiData.status?.name || 'Unknown',
        updatedAt: new Date()
      }
    );
    
    return true;
  } catch (error) {
    console.error('Quick update failed:', error.message);
    return false;
  }
};