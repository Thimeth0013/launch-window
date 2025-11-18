import axios from 'axios';
import Stream from '../models/Stream.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels with their search behavior
const CHANNEL_CONFIGS = {
  'UC6uKrU_WqJ1R2HMTY3LIx5Q': { // Everyday Astronaut
    name: 'Everyday Astronaut',
    searchStyle: 'casual',
    strictness: 'moderate',
  },
  'UCSUu1lih2RifWkKtDOJdsBA': { // NASASpaceflight
    name: 'NASASpaceflight',
    searchStyle: 'formal',
    strictness: 'moderate',
  },
  'UCGCndz0n0NHmLHfd64FRjIA': { // The Launch Pad
    name: 'The Launch Pad',
    searchStyle: 'standard',
    strictness: 'moderate',
  },
  'UCoLdERT4-TJ82PJOHSrsZLQ': { // Spaceflight Now
    name: 'Spaceflight Now',
    searchStyle: 'descriptive',
    strictness: 'moderate',
  },
  'UCVTomc35agH1SM6kCKzwW_g': { // VideoFromSpace
    name: 'VideoFromSpace',
    searchStyle: 'standard',
    strictness: 'moderate',
  },
  'UC2_vpnza621Sa0cf_xhqJ8Q': { // Raw Space
    name: 'Raw Space',
    searchStyle: 'standard',
    strictness: 'moderate',
  },
  'UC9T3XwCjQdzpSp7IzGkbtJA': { // International Rocket Launches
    name: 'International Rocket Launches',
    searchStyle: 'standard',
    strictness: 'strict',
  },
  'UCLA_DiR1FfKNvjuUpBHmylQ': { // NASA
    name: 'NASA',
    searchStyle: 'official',
    strictness: 'moderate',
  },
};

// API Quota Management
// YouTube API: 10,000 units/day
// search.list cost: 100 units per call
// Running twice daily (noon & midnight), with 8 channels and launches within 2 days
// Estimated: ~2-5 launches per run × 8 channels × 2 runs = 320-800 units/day (well within limit)
const API_QUOTA_TRACKER = {
  callsThisRun: 0,
  maxCallsPerRun: 50, // Safety limit per run
};

// HELPER FUNCTIONS

// Check if this is a high-profile rocket (rare launches - use WIDE search)
function isHighProfile(rocketName) {
  const name = rocketName.toLowerCase();
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

// Extract rocket name with FULL variant for precise matching
function getRocketName(launchName) {
  const lower = launchName.toLowerCase();
  
  if (lower.includes('new glenn')) return 'New Glenn';
  if (lower.includes('starship')) return 'Starship';
  if (lower.includes('falcon heavy')) return 'Falcon Heavy';
  if (lower.includes('falcon 9')) return 'Falcon 9';
  if (lower.includes('atlas v')) return 'Atlas V';
  if (lower.includes('delta iv')) return 'Delta IV';
  if (lower.includes('electron')) return 'Electron';
  
  if (lower.includes('long march')) {
    const match = launchName.match(/Long March [\w/-]+/i);
    if (match) return match[0]; // e.g., "Long March 2C/YZ-1S" or "Long March 2F/G"
  }
  
  if (lower.includes('ariane')) {
    const match = launchName.match(/Ariane [\w]+/i);
    if (match) return match[0]; // e.g., "Ariane 5", "Ariane 6"
  }
  
  if (lower.includes('soyuz')) {
    const match = launchName.match(/Soyuz [\w/-]+/i);
    if (match) return match[0]; // e.g., "Soyuz 2.1a"
  }
  
  if (lower.includes('vulcan')) return 'Vulcan';
  
  // Default: first part before |
  return launchName.split('|')[0].trim();
}

// Extract mission information
function extractMissionInfo(launchName) {
  const lower = launchName.toLowerCase();
  
  // Check for Starlink missions - NEEDS STRICT MATCHING
  if (lower.includes('starlink')) {
    const match = launchName.match(/Starlink Group ([\d-]+)/i);
    if (match) {
      return {
        type: 'starlink',
        group: match[1], // e.g., "6-87"
        isFrequent: true, // Frequent launches need strict matching
      };
    }
  }
  
  // Check for Starship flights - WIDE SEARCH (rare launches)
  if (lower.includes('starship')) {
    const match = launchName.match(/Flight (\d+)/i);
    return {
      type: 'starship',
      flightNumber: match ? match[1] : null,
      isFrequent: false, // Rare launches allow wide matching
    };
  }
  
  // Check for New Glenn - WIDE SEARCH (rare launches)
  if (lower.includes('new glenn')) {
    return {
      type: 'new-glenn',
      isFrequent: false,
    };
  }
  
  // Check for unknown payloads
  if (lower.includes('unknown payload')) {
    return {
      type: 'unknown',
      isFrequent: false,
    };
  }
  
  // Extract named payload
  const parts = launchName.split('|');
  if (parts.length > 1) {
    const payload = parts[1].trim();
    if (payload && !payload.includes('Unknown')) {
      return {
        type: 'payload',
        payload: payload,
        isFrequent: false,
      };
    }
  }
  
  return {
    type: 'unknown',
    isFrequent: false,
  };
}

// Build search query based on rocket type and channel
function buildSearchQuery(launchName, channelId) {
  const rocketName = getRocketName(launchName);
  const missionInfo = extractMissionInfo(launchName);
  const channelConfig = CHANNEL_CONFIGS[channelId];
  const isHighProfileRocket = isHighProfile(rocketName);
  
  // HIGH-PROFILE ROCKETS (Starship, New Glenn, etc.) - WIDE SEARCH
  if (isHighProfileRocket) {
    // Just search for the rocket name - accept all matches
    return rocketName;
  }
  
  // FREQUENT LAUNCHES (Falcon 9 Starlink) - STRICT SEARCH
  if (missionInfo.type === 'starlink' && missionInfo.group) {
    // Search for "Starlink" - we'll filter by exact group number later
    return `${rocketName} Starlink`;
  }
  
  // PAYLOAD MISSIONS - MODERATE STRICTNESS
  if (missionInfo.type === 'payload' && missionInfo.payload) {
    // For strict channels, include payload in search
    if (channelConfig?.strictness === 'strict') {
      return `${rocketName} ${missionInfo.payload}`;
    }
    return `${rocketName} ${missionInfo.payload}`;
  }
  
  // DEFAULT - Just rocket name (including full variant for Long March, Soyuz, etc.)
  return rocketName;
}

// Check if stream matches launch with appropriate strictness
function isStreamMatch(item, launchName, missionInfo, isHighProfileRocket, channelId) {
  const title = item.snippet.title.toLowerCase();
  const description = (item.snippet.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  const rocketName = getRocketName(launchName).toLowerCase();
  const channelConfig = CHANNEL_CONFIGS[channelId];
  
  // Get strictness level
  const isStrictChannel = channelConfig?.strictness === 'strict';
  
  // HIGH-PROFILE ROCKETS: Accept ANY video mentioning the rocket
  // (Starship, New Glenn, SLS, Falcon Heavy, Vulcan - rare launches)
  if (isHighProfileRocket) {
    if (!combined.includes(rocketName.toLowerCase())) {
      return false;
    }
    
    // For Starship, prefer videos with flight number but accept all
    if (missionInfo.type === 'starship' && missionInfo.flightNumber) {
      const flightRegex = new RegExp(`flight\\s*${missionInfo.flightNumber}`, 'i');
      if (flightRegex.test(combined)) {
        return true; // Perfect match
      }
    }
    // Accept ANY video with the high-profile rocket name
    return true;
  }
  
  // STARLINK MISSIONS: STRICT MATCHING by group number
  if (missionInfo.type === 'starlink' && missionInfo.group) {
    // Must contain "starlink"
    if (!combined.includes('starlink')) {
      return false;
    }
    
    // EXACT group number match required
    const groupParts = missionInfo.group.split('-');
    if (groupParts.length === 2) {
      // Check for exact group number in various formats
      const patterns = [
        `${groupParts[0]}-${groupParts[1]}`,           // "6-87"
        `${groupParts[0]} ${groupParts[1]}`,           // "6 87"
        `${groupParts[0]}/${groupParts[1]}`,           // "6/87"
        `group ${groupParts[0]}-${groupParts[1]}`,     // "group 6-87"
        `group ${groupParts[0]} ${groupParts[1]}`,     // "group 6 87"
        `group ${groupParts[0]}/${groupParts[1]}`,     // "group 6/87"
        `g${groupParts[0]}-${groupParts[1]}`,          // "g6-87"
        `: ${groupParts[0]}-${groupParts[1]}`,         // ": 6-87" (NASASpaceflight style)
      ];
      
      return patterns.some(pattern => combined.includes(pattern.toLowerCase()));
    }
    
    // Fallback: check if group string appears
    return combined.includes(missionInfo.group.toLowerCase());
  }
  
  // ROCKET VARIANT MATCHING (Long March, Soyuz, etc.)
  // For strict channels like International Rocket Launches
  if (isStrictChannel) {
    // Extract base rocket variant (e.g., "long march 2c" from "Long March 2C/YZ-1S")
    const baseRocket = rocketName.split('/')[0].toLowerCase();
    
    // Must contain exact base rocket variant
    if (!combined.includes(baseRocket)) {
      return false;
    }
    
    // Additional check: If launch has named payload, stream must mention it
    if (missionInfo.type === 'payload' && missionInfo.payload) {
      const payloadLower = missionInfo.payload.toLowerCase();
      // For "Unknown Payload", we can't match payload, so rely on rocket variant only
      if (!payloadLower.includes('unknown') && !combined.includes(payloadLower)) {
        return false;
      }
    }
    
    return true;
  }
  
  // MODERATE STRICTNESS: Check if rocket name appears (with some flexibility)
  // For rockets with variants, check base rocket family
  const baseRocketFamily = rocketName.split(/[\s\/]/)[0].toLowerCase(); // "long" from "long march 2c"
  const fullRocketBase = rocketName.split('/')[0].toLowerCase(); // "long march 2c" from "long march 2c/yz-1s"
  
  if (!combined.includes(baseRocketFamily)) {
    return false;
  }
  
  // PAYLOAD MISSIONS: Match payload name if available
  if (missionInfo.type === 'payload' && missionInfo.payload) {
    const payloadLower = missionInfo.payload.toLowerCase();
    if (!payloadLower.includes('unknown')) {
      return combined.includes(payloadLower);
    }
  }
  
  // UNKNOWN MISSIONS: Accept any video with rocket family name
  return true;
}

// Filter and format matching streams
function filterAndFormatStreams(items, launchName, missionInfo, isHighProfileRocket, channelId) {
  return items
    .filter(item => isStreamMatch(item, launchName, missionInfo, isHighProfileRocket, channelId))
    .map(item => ({
      streamId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      scheduledStartTime: item.snippet.publishedAt,
      platform: 'youtube',
      isLive: false, // We only fetch upcoming
    }));
}

// Check channel for UPCOMING streams only
export const checkChannelUpcomingStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    console.error('❌ YouTube API key not configured');
    return [];
  }

  // Check quota limit
  if (API_QUOTA_TRACKER.callsThisRun >= API_QUOTA_TRACKER.maxCallsPerRun) {
    console.warn('⚠️  API quota limit reached for this run');
    return [];
  }

  try {
    const searchQuery = buildSearchQuery(launchName, channelId);
    const channelConfig = CHANNEL_CONFIGS[channelId];
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'upcoming', // ONLY UPCOMING VIDEOS
        maxResults: 20,
        order: 'date',
        q: searchQuery,
      },
      timeout: 10000, // 10 second timeout
    });

    API_QUOTA_TRACKER.callsThisRun++;

    const items = response.data.items || [];
    const missionInfo = extractMissionInfo(launchName);
    const isHighProfileRocket = isHighProfile(getRocketName(launchName));
    
    const filtered = filterAndFormatStreams(items, launchName, missionInfo, isHighProfileRocket, channelId);
    
    return filtered;
  } catch (error) {
    if (error.response?.status === 403) {
      console.error(`❌ YouTube API quota exceeded or invalid key`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`❌ Request timeout for channel ${channelId}`);
    } else {
      console.error(`❌ Error checking channel ${channelId}:`, error.message);
    }
    return [];
  }
};

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

// Calculate match score
function calculateMatchScore(streamTitle, launchName, missionInfo) {
  const streamLower = streamTitle.toLowerCase();
  let score = 0;
  
  const rocket = getRocketName(launchName).toLowerCase();
  const baseRocket = rocket.split('/')[0]; // Get base variant without modifiers
  
  // Exact rocket variant match
  if (streamLower.includes(baseRocket)) {
    score += 3;
  }
  
  // Exact mission matches get highest scores
  if (missionInfo.type === 'starlink' && missionInfo.group) {
    if (streamLower.includes(missionInfo.group.toLowerCase())) {
      score += 5;
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
  
  // Bonus for launch-related keywords
  if (streamLower.includes('launch')) score += 1;
  if (streamLower.includes('live')) score += 0.5;
  if (streamLower.includes('coverage')) score += 0.5;
  
  return Math.min(score / 10, 1);
}

// Main function to match streams to launches
export const matchStreamsToLaunches = async (launches) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Starting stream matching for ${launches.length} launches`);
  console.log(`📺 Searching ${Object.keys(CHANNEL_CONFIGS).length} known channels`);
  console.log(`⏰ Run time: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Reset quota tracker
  API_QUOTA_TRACKER.callsThisRun = 0;
  
  let totalStreamsFound = 0;
  let launchesProcessed = 0;
  
  for (const launch of launches) {
    const launchDate = new Date(launch.date);
    const now = new Date();
    const daysUntilLaunch = (launchDate - now) / (1000 * 60 * 60 * 24);
    
    // Only search for launches within 2 days (conserve API quota)
    if (daysUntilLaunch < 0 || daysUntilLaunch > 2) {
      console.log(`⏭️  Skipping "${launch.name}" (${daysUntilLaunch.toFixed(1)} days away)`);
      continue;
    }
    
    launchesProcessed++;
    const missionInfo = extractMissionInfo(launch.name);
    const rocketName = getRocketName(launch.name);
    const isHighProfileRocket = isHighProfile(rocketName);
    
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔍 Launch: ${launch.name}`);
    console.log(`   🚀 Rocket: ${rocketName}${isHighProfileRocket ? ' ⭐ (High-profile - WIDE search)' : ''}`);
    
    if (missionInfo.type === 'starlink') {
      console.log(`   📡 Mission: Starlink Group ${missionInfo.group} (STRICT matching)`);
    } else if (missionInfo.type === 'payload') {
      console.log(`   🛰️  Mission: ${missionInfo.payload}`);
    } else if (isHighProfileRocket) {
      console.log(`   ✨ Strategy: Accept ANY coverage for this rare launch`);
    }
    
    console.log(`   📅 T-${daysUntilLaunch.toFixed(1)} days`);
    
    // Search all channels
    const allStreams = [];
    
    for (const [channelId, config] of Object.entries(CHANNEL_CONFIGS)) {
      const upcomingStreams = await checkChannelUpcomingStreams(channelId, launch.name);
      
      if (upcomingStreams.length > 0) {
        console.log(`   ✅ ${config.name}: Found ${upcomingStreams.length} stream(s)`);
        upcomingStreams.forEach(s => console.log(`      📺 "${s.title}"`));
      }
      
      allStreams.push(...upcomingStreams);
      
      // Rate limiting: 300ms delay between requests
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
            matchScore: matchScore,
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );
        console.log(`   💾 Saved: "${stream.title}" (score: ${matchScore.toFixed(2)})`);
      } catch (error) {
        console.error(`   ❌ Error saving stream:`, error.message);
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Stream matching completed`);
  console.log(`   Launches processed: ${launchesProcessed}`);
  console.log(`   Total streams found: ${totalStreamsFound}`);
  console.log(`   API calls made: ${API_QUOTA_TRACKER.callsThisRun}`);
  console.log(`   Quota remaining: ${API_QUOTA_TRACKER.maxCallsPerRun - API_QUOTA_TRACKER.callsThisRun} calls`);
  console.log(`${'='.repeat(60)}\n`);
};