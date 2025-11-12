import axios from 'axios';
import Stream from '../models/Stream.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels - ONLY SEARCH THESE
const KNOWN_CHANNELS = [
  'UC6uKrU_WqJ1R2HMTY3LIx5Q', // Everyday Astronaut
  'UCSUu1lih2RifWkKtDOJdsBA', // NASASpaceflight
  'UCGCndz0n0NHmLHfd64FRjIA', // The Launch Pad
  'UCoLdERT4-TJ82PJOHSrsZLQ', // Spaceflight Now
  'UCVTomc35agH1SM6kCKzwW_g', // VideoFromSpace
  'UC2_vpnza621Sa0cf_xhqJ8Q', // Raw Space
];

// Build a more specific search query based on mission type
function buildSearchQuery(launchName) {
  const rocketName = getRocketName(launchName);
  const missionInfo = extractMissionInfo(launchName);
  
  // For Starlink missions, include the group number in search
  if (missionInfo.type === 'starlink' && missionInfo.group) {
    return `${rocketName} Starlink ${missionInfo.group}`;
  }
  
  // For Starship missions, include flight number
  if (missionInfo.type === 'starship' && missionInfo.flightNumber) {
    return `Starship Flight ${missionInfo.flightNumber}`;
  }
  
  // For missions with specific payloads
  if (missionInfo.type === 'payload' && missionInfo.payload) {
    return `${rocketName} ${missionInfo.payload}`;
  }
  
  // For high-profile rockets without specific missions
  if (isHighProfile(rocketName)) {
    return rocketName;
  }
  
  // Default: just rocket name
  return rocketName;
}

// Check channel for upcoming streams only
export const checkChannelUpcomingStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    return [];
  }

  try {
    // Use more general search for Everyday Astronaut (they use casual titles)
    const isEverydayAstronaut = channelId === 'UC6uKrU_WqJ1R2HMTY3LIx5Q';
    const searchQuery = isEverydayAstronaut 
      ? getRocketName(launchName)  // Just rocket name for EA
      : buildSearchQuery(launchName);  // Specific query for others
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'upcoming',
        maxResults: 20,
        order: 'date',
        q: searchQuery
      }
    });

    const items = response.data.items || [];
    const filtered = filterMatchingStreams(items, launchName, false);
    
    // Ensure we always return an array
    return Array.isArray(filtered) ? filtered : [];
  } catch (error) {
    console.error(`Error checking channel ${channelId}:`, error.message);
    return []; // Always return empty array on error
  }
};

// Filter streams based on launch details
function filterMatchingStreams(items, launchName, isLive) {
  const rocketName = getRocketName(launchName);
  const missionInfo = extractMissionInfo(launchName);
  const isHighProfileRocket = isHighProfile(rocketName);
  
  return items.filter(item => {
    const title = item.snippet.title.toLowerCase();
    const description = (item.snippet.description || '').toLowerCase();
    const combined = `${title} ${description}`;
    
    // Must mention the rocket name
    if (!combined.includes(rocketName.toLowerCase())) {
      return false;
    }
    
    // HIGH PROFILE ROCKETS: Accept any video mentioning the rocket
    // (Starship, New Glenn, SLS, Falcon Heavy - rare and exciting launches)
    if (isHighProfileRocket) {
      // For Starship, prefer videos mentioning the flight number but accept all
      if (missionInfo.type === 'starship' && missionInfo.flightNumber) {
        const flightRegex = new RegExp(`flight\\s*${missionInfo.flightNumber}`, 'i');
        if (flightRegex.test(combined)) {
          return true; // Exact match is best
        }
      }
      // Accept ANY video with the high-profile rocket name
      // This includes payload missions like "New Glenn | EscaPADE"
      return true;
    }
    
    // MATCHING for Starlink missions (frequent launches - need strict matching)
    if (missionInfo.type === 'starlink' && missionInfo.group) {
      // Must contain "starlink" AND the group number
      if (!combined.includes('starlink')) {
        return false;
      }
      
      // Look for the group number in various formats
      const groupParts = missionInfo.group.split('-');
      if (groupParts.length === 2) {
        // Match patterns like: "6-87", "6 87", "group 6-87", etc.
        const patterns = [
          `${groupParts[0]}-${groupParts[1]}`,     // "6-87"
          `${groupParts[0]} ${groupParts[1]}`,     // "6 87"
          `${groupParts[0]}/${groupParts[1]}`,     // "6/87"
          `group ${groupParts[0]}-${groupParts[1]}`, // "group 6-87"
          `group ${groupParts[0]} ${groupParts[1]}`  // "group 6 87"
        ];
        
        const matched = patterns.some(pattern => combined.includes(pattern.toLowerCase()));
        if (matched) {
          return true;
        }
      }
      
      // Fallback: just check if the group string appears anywhere
      return combined.includes(missionInfo.group.toLowerCase());
    }
    
    // For missions with specific payloads (non-high-profile rockets only)
    if (missionInfo.type === 'payload' && missionInfo.payload) {
      const payloadLower = missionInfo.payload.toLowerCase();
      // Payload name should appear in title or description
      return combined.includes(payloadLower);
    }
    
    // For unknown payloads, just match rocket name
    if (missionInfo.type === 'unknown') {
      // Accept any video with the rocket name
      return true;
    }
    
    return false;
  }).map(item => ({
    streamId: item.id.videoId,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    title: item.snippet.title,
    channelName: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    scheduledStartTime: item.snippet.publishedAt,
    platform: 'youtube',
    isLive: isLive
  }));
}

// Main function to match streams to launches
export const matchStreamsToLaunches = async (launches) => {
  console.log(`\n=== Starting stream matching for ${launches.length} launches ===`);
  console.log(`Only searching ${KNOWN_CHANNELS.length} known channels\n`);
  
  let totalStreamsFound = 0;
  
  for (const launch of launches) {
    const launchDate = new Date(launch.date);
    const now = new Date();
    
    const daysUntilLaunch = (launchDate - now) / (1000 * 60 * 60 * 24);
    
    // Only search for launches within 2 day to conserve API quota
    if (daysUntilLaunch < 0 || daysUntilLaunch > 2) {
      console.log(`⏭️  Skipping "${launch.name}" (${daysUntilLaunch.toFixed(1)} days away)`);
      continue;
    }
    
    const missionInfo = extractMissionInfo(launch.name);
    const rocketName = getRocketName(launch.name);
    const isHighProfileRocket = isHighProfile(rocketName);
    const searchQuery = buildSearchQuery(launch.name);
    
    console.log(`\n🔍 Searching for: ${launch.name}`);
    console.log(`   Rocket: ${rocketName}${isHighProfileRocket ? ' 🌟 (High-profile)' : ''}`);
    console.log(`   Search query: "${searchQuery}"`);
    if (missionInfo.type === 'starlink') {
      console.log(`   Mission: Starlink Group ${missionInfo.group}`);
    } else if (missionInfo.type === 'payload') {
      console.log(`   Mission: ${missionInfo.payload}`);
    } else if (isHighProfileRocket) {
      console.log(`   Mission: Any coverage accepted`);
    }
    console.log(`   Days until launch: ${daysUntilLaunch.toFixed(1)}`);
    
    // Search ONLY in known channels
    const allStreams = [];
    
    for (const channelId of KNOWN_CHANNELS) {
      // Check for upcoming scheduled streams only
      const upcomingStreams = await checkChannelUpcomingStreams(channelId, launch.name);
      
      // Ensure we have an array (in case of errors)
      const streams = Array.isArray(upcomingStreams) ? upcomingStreams : [];
      
      if (streams.length > 0) {
        console.log(`   ✅ Found ${streams.length} streams from channel ${channelId}`);
        streams.forEach(s => console.log(`      📺 "${s.title}"`));
      }
      
      allStreams.push(...streams);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const uniqueStreams = deduplicateStreams(allStreams);
    
    console.log(`   📊 Total unique streams: ${uniqueStreams.length}`);
    totalStreamsFound += uniqueStreams.length;
    
    // Save streams to database
    for (const stream of uniqueStreams) {
      try {
        const matchScore = calculateMatchScore(stream.title, launch.name, missionInfo);
        await Stream.findOneAndUpdate(
          { streamId: stream.streamId },
          {
            ...stream,
            launchId: launch.id,
            matchScore: matchScore
          },
          { upsert: true, new: true }
        );
        console.log(`   💾 Saved: "${stream.title}" (score: ${matchScore.toFixed(2)})`);
      } catch (error) {
        console.error(`   ❌ Error saving stream:`, error.message);
      }
    }
  }
  
  console.log(`\n=== Stream matching completed: ${totalStreamsFound} total streams found ===\n`);
};

// ========== HELPER FUNCTIONS ==========

// Check if this is a high-profile rocket (rare, exciting launches)
function isHighProfile(rocketName) {
  const name = rocketName.toLowerCase();
  
  // Major rockets with infrequent launches
  return (
    name.includes('starship') ||
    name.includes('new glenn') ||
    name.includes('sls') ||
    name.includes('space launch system') ||
    name.includes('falcon heavy') ||
    name.includes('ariane 6') ||
    name.includes('vulcan')
  );
}

// Extract rocket name from launch name
function getRocketName(launchName) {
  const lower = launchName.toLowerCase();
  
  if (lower.includes('new glenn')) return 'New Glenn';
  if (lower.includes('starship')) return 'Starship';
  if (lower.includes('falcon heavy')) return 'Falcon Heavy';
  if (lower.includes('falcon 9')) return 'Falcon 9';
  if (lower.includes('atlas v')) return 'Atlas V';
  if (lower.includes('delta iv')) return 'Delta IV';
  if (lower.includes('electron')) return 'Electron';
  if (lower.includes('long march')) return 'Long March';
  if (lower.includes('ariane')) return 'Ariane';
  if (lower.includes('soyuz')) return 'Soyuz';
  
  // Default: first part before |
  return launchName.split('|')[0].trim();
}

// Extract mission information
function extractMissionInfo(launchName) {
  const lower = launchName.toLowerCase();
  
  // Check for Starlink missions
  if (lower.includes('starlink')) {
    const match = launchName.match(/Starlink Group ([\d-]+)/i);
    if (match) {
      return {
        type: 'starlink',
        group: match[1], // e.g., "6-87"
        payload: null,
        flightNumber: null
      };
    }
  }
  
  // Check for Starship flights
  if (lower.includes('starship')) {
    const match = launchName.match(/Flight (\d+)/i);
    if (match) {
      return {
        type: 'starship',
        group: null,
        payload: null,
        flightNumber: match[1]
      };
    }
  }
  
  // Check for unknown payloads
  if (lower.includes('unknown payload')) {
    return {
      type: 'unknown',
      group: null,
      payload: null,
      flightNumber: null
    };
  }
  
  // Extract named payload
  const parts = launchName.split('|');
  if (parts.length > 1) {
    const payload = parts[1].trim();
    if (payload && !payload.includes('Unknown')) {
      return {
        type: 'payload',
        group: null,
        payload: payload,
        flightNumber: null
      };
    }
  }
  
  return {
    type: 'unknown',
    group: null,
    payload: null,
    flightNumber: null
  };
}

// Deduplicate streams by video ID
function deduplicateStreams(streams) {
  const seen = new Set();
  return streams.filter(stream => {
    if (seen.has(stream.streamId)) {
      return false;
    }
    seen.add(stream.streamId);
    return true;
  });
}

// Calculate match score between stream title and launch details
function calculateMatchScore(streamTitle, launchName, missionInfo) {
  const streamLower = streamTitle.toLowerCase();
  const launchLower = launchName.toLowerCase();
  
  let score = 0;
  
  // Boost for rocket names
  const rocket = getRocketName(launchName).toLowerCase();
  if (streamLower.includes(rocket)) {
    score += 3;
  }
  
  // Boost for exact mission matches
  if (missionInfo.type === 'starlink' && missionInfo.group) {
    if (streamLower.includes(missionInfo.group)) {
      score += 5; // High score for exact Starlink group match
    }
  }
  
  if (missionInfo.type === 'starship' && missionInfo.flightNumber) {
    if (streamLower.includes(`flight ${missionInfo.flightNumber}`)) {
      score += 5;
    }
  }
  
  if (missionInfo.type === 'payload' && missionInfo.payload) {
    if (streamLower.includes(missionInfo.payload.toLowerCase())) {
      score += 4;
    }
  }
  
  // Boost for key terms
  if (streamLower.includes('launch')) {
    score += 1;
  }
  if (streamLower.includes('live')) {
    score += 0.5;
  }
  
  // Normalize to 0-1
  return Math.min(score / 8, 1);
}