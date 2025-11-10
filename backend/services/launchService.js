import axios from 'axios';
import Launch from '../models/Launch.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';

// Helper function to retry failed requests
const fetchWithRetry = async (url, config, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching launches (attempt ${attempt}/${maxRetries})...`);
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      lastError = error;
      console.log(`⚠️  Attempt ${attempt} failed: ${error.message}`);
      
      // Don't retry on 4xx errors (client errors)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`   Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

export const fetchUpcomingLaunches = async () => {
  try {
    const response = await fetchWithRetry(
      `${LAUNCH_LIBRARY_API}/launch/upcoming/`,
      {
        params: {
          limit: 50,
          mode: 'detailed'
        },
        timeout: 30000,  // 30 second timeout
        headers: {
          'User-Agent': 'LaunchWindow/1.0'  // Good practice to identify your app
        }
      }
    );

    const launches = response.data.results;
    
    if (!launches || launches.length === 0) {
      console.log('⚠️  No launches returned from API');
      return [];
    }
    
    console.log(`Processing ${launches.length} launches...`);
    let updatedCount = 0;
    
    for (const launch of launches) {
      try {
        await Launch.findOneAndUpdate(
          { id: launch.id },
          {
            id: launch.id,
            name: launch.name,
            date: new Date(launch.net),
            status: launch.status?.name || 'Unknown',
            rocket: {
              name: launch.rocket?.configuration?.name || 'Unknown',
              configuration: launch.rocket?.configuration?.full_name || 'Unknown'
            },
            mission: {
              name: launch.mission?.name || null,
              description: launch.mission?.description || null,
              type: launch.mission?.type || null
            },
            pad: {
              name: launch.pad?.name || 'Unknown',
              location: launch.pad?.location?.name || 'Unknown'
            },
            image: launch.image || null,
            webcast_live: launch.webcast_live || false,
            provider: launch.launch_service_provider?.name || 'Unknown'
          },
          { upsert: true, new: true }
        );
        updatedCount++;
      } catch (dbError) {
        console.error(`❌ Error updating launch ${launch.id}:`, dbError.message);
        // Continue processing other launches
      }
    }

    console.log(`✅ Successfully updated ${updatedCount}/${launches.length} launches`);
    return launches;
  } catch (error) {
    // Log detailed error info
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.error('❌ Request timeout - API took too long to respond');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot reach API - check your internet connection');
    } else if (error.response) {
      console.error(`❌ API returned error ${error.response.status}: ${error.response.statusText}`);
    } else {
      console.error('❌ Error fetching launches:', error.message);
    }
    
    throw error;
  }
};

export const getUpcomingLaunches = async (limit = 20) => {
  const now = new Date();
  const launches = await Launch.find({
    date: { $gte: now }
  })
    .sort({ date: 1 })
    .limit(limit);
  
  return launches;
};

export const getLaunchById = async (id) => {
  return await Launch.findOne({ id });
};