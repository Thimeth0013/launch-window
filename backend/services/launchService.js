import axios from 'axios';
import Launch from '../models/Launch.js';
import StreamSync from '../models/StreamSync.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';

// --- HELPER: Logic to detect significant mission changes ---
const detectSignificantChanges = (oldLaunch, apiLaunch) => {
  const oldDate = new Date(oldLaunch.date);
  const newDate = new Date(apiLaunch.net);
  
  // Calculate delay in hours
  const delayHours = (newDate - oldDate) / (1000 * 60 * 60);
  
  // Rule 1: Launch delayed by more than 24 hours
  const isSignificantDelay = delayHours > 24;
  
  // Rule 2: Status changed from "Go" to "TBD/TBC"
  const oldStatus = oldLaunch.status;
  const newStatus = apiLaunch.status?.name || 'Unknown';
  const statusLost = (oldStatus.includes('Go') && (newStatus.includes('TBD') || newStatus.includes('TBC')));

  return isSignificantDelay || statusLost;
};

const fetchWithRetry = async (url, config, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      lastError = error;
      if (error.response && error.response.status >= 400 && error.response.status < 500) throw error;
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
};

export const fetchUpcomingLaunches = async () => {
  try {
    const response = await fetchWithRetry(
      `${LAUNCH_LIBRARY_API}/launch/upcoming/`,
      { params: { limit: 30, mode: 'detailed' }, timeout: 30000 }
    );

    const apiLaunches = response.data.results;
    if (!apiLaunches) return [];

    console.log(`📡 [SYNC] Processing ${apiLaunches.length} launches from API...`);

    for (const apiLaunch of apiLaunches) {
      // 1. Find existing record in DB
      const existingLaunch = await Launch.findOne({ id: apiLaunch.id });

      if (existingLaunch) {
        // 2. Compare for significant delays
        const needsStreamCleanup = detectSignificantChanges(existingLaunch, apiLaunch);
        
        if (needsStreamCleanup) {
          console.log(`🗑️ [CLEANUP] Launch "${apiLaunch.name}" delayed/changed. Wiping stale streams.`);
          await StreamSync.deleteOne({ launchId: apiLaunch.id });
        }
      }

      // 3. Update the Launch record
      await Launch.findOneAndUpdate(
        { id: apiLaunch.id },
        {
          id: apiLaunch.id,
          name: apiLaunch.name,
          date: new Date(apiLaunch.net),
          status: apiLaunch.status?.name || 'Unknown',
          rocket: {
            name: apiLaunch.rocket?.configuration?.name || 'Unknown',
            configuration: apiLaunch.rocket?.configuration?.full_name || 'Unknown',
            spacecraft_stage: apiLaunch.rocket?.spacecraft_stage || null
          },
          launcher_stage: apiLaunch.rocket?.launcher_stage || [],
          mission: {
            name: apiLaunch.mission?.name || null,
            description: apiLaunch.mission?.description || null,
            type: apiLaunch.mission?.type || null,
            orbit: apiLaunch.mission?.orbit || null
          },
          pad: {
            name: apiLaunch.pad?.name || 'Unknown',
            location: apiLaunch.pad?.location?.name || 'Unknown'
          },
          image: apiLaunch.image || null,
          webcast_live: apiLaunch.webcast_live || false,
          provider: apiLaunch.launch_service_provider?.name || 'Unknown'
        },
        { upsert: true }
      );
    }

    return apiLaunches;
  } catch (error) {
    console.error('❌ Sync Error:', error.message);
    throw error;
  }
};

export const getUpcomingLaunches = async (limit = 30) => {
  const now = new Date();
  const launches = await Launch.find({
    date: { $gte: now }
  })
    .sort({ date: 1 })
    .limit(limit);
  
  return launches;
};

export const getLaunchById = async (id) => {
  // Convert id to string to ensure type matching
  const launchId = String(id);
  
  console.log(`🔍 [QUERY] Searching for launch with ID: ${launchId}`);
  
  const launch = await Launch.findOne({ id: launchId });
  
  if (!launch) {
    console.log(`❌ [NOT_FOUND] No launch found with ID: ${launchId}`);
  } else {
    console.log(`✅ [FOUND] Launch "${launch.name}" retrieved successfully`);
  }
  
  return launch;
};