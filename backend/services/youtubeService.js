import axios from 'axios';
import Stream from '../models/Stream.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels - ONLY SEARCH THESE
const KNOWN_CHANNELS = [
  'UC6uKrU_WqJ1R2HMTY3LIx5Q', // Everyday Astronaut
  'UCSUu1lih2RifWkKtDOJdsBA', // NASASpaceflight
  'UCGCndz0n0NHmLHfd64FRjIA', // The Launch Pad
  'UCoLdERT4-TJ82PJOHSrsZLQ', // Spaceflight Now
];

// Check channel for upcoming scheduled streams
export const checkChannelUpcomingStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    return [];
  }

  try {
    const rocketName = getRocketName(launchName);
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'upcoming',
        maxResults: 20,
        order: 'date',
        q: rocketName
      }
    });

    const items = response.data.items || [];
    
    return filterMatchingStreams(items, launchName, false);
  } catch (error) {
    console.error(`Error checking channel ${channelId}:`, error.message);
    return [];
  }
};

// Check channel for currently LIVE streams
export const checkChannelLiveStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    return [];
  }

  try {
    const rocketName = getRocketName(launchName);
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'live',
        maxResults: 20,
        order: 'date',
        q: rocketName
      }
    });

    const items = response.data.items || [];
    
    return filterMatchingStreams(items, launchName, true);
  } catch (error) {
    console.error(`Error checking live streams for channel ${channelId}:`, error.message);
    return [];
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
      return true;
    }
    
    // STRICT MATCHING for Starlink missions (frequent launches)
    if (missionInfo.type === 'starlink' && missionInfo.group) {
      // Must contain the EXACT group number (e.g., "6-87")
      const groupRegex = new RegExp(`\\b${missionInfo.group.replace('-', '[-\\s]?')}\\b`, 'i');
      return groupRegex.test(title) || groupRegex.test(description);
    }
    
    // For missions with specific payloads (non-high-profile)
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
    
    // Only search for launches within 3 days
    if (daysUntilLaunch < 0 || daysUntilLaunch > 3) {
      console.log(`⏭️  Skipping "${launch.name}" (${daysUntilLaunch.toFixed(1)} days away)`);
      continue;
    }
    
    const missionInfo = extractMissionInfo(launch.name);
    const rocketName = getRocketName(launch.name);
    const isHighProfileRocket = isHighProfile(rocketName);
    
    console.log(`\n🔍 Searching for: ${launch.name}`);
    console.log(`   Rocket: ${rocketName}${isHighProfileRocket ? ' 🌟 (High-profile)' : ''}`);
    if (missionInfo.type === 'starlink') {
      console.log(`   Mission: Starlink Group ${missionInfo.group} (strict matching)`);
    } else if (missionInfo.type === 'payload') {
      console.log(`   Mission: ${missionInfo.payload}`);
    } else if (isHighProfileRocket) {
      console.log(`   Mission: Any coverage accepted`);
    }
    console.log(`   Days until launch: ${daysUntilLaunch.toFixed(1)}`);
    
    // Search ONLY in known channels
    const allStreams = [];
    
    for (const channelId of KNOWN_CHANNELS) {
      // Check for upcoming scheduled streams
      const upcomingStreams = await checkChannelUpcomingStreams(channelId, launch.name);
      
      // Check for currently live streams
      const liveStreams = await checkChannelLiveStreams(channelId, launch.name);
      
      const channelTotal = upcomingStreams.length + liveStreams.length;
      if (channelTotal > 0) {
        console.log(`   ✅ Found ${channelTotal} streams from channel ${channelId}`);
        upcomingStreams.forEach(s => console.log(`      📺 "${s.title}"`));
        liveStreams.forEach(s => console.log(`      🔴 "${s.title}"`));
      }
      
      allStreams.push(...upcomingStreams, ...liveStreams);
      
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