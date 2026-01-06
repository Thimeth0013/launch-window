import axios from 'axios';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels with their search behavior
const CHANNEL_CONFIGS = {
  'UC6uKrU_WqJ1R2HMTY3LIx5Q': { name: 'Everyday Astronaut', strictness: 'moderate' },
  'UCSUu1lih2RifWkKtDOJdsBA': { name: 'NASASpaceflight', strictness: 'moderate' },
  'UCGCndz0n0NHmLHfd64FRjIA': { name: 'The Launch Pad', strictness: 'moderate' },
  'UCoLdERT4-TJ82PJOHSrsZLQ': { name: 'Spaceflight Now', strictness: 'moderate' },
  'UCVTomc35agH1SM6kCKzwW_g': { name: 'VideoFromSpace', strictness: 'moderate' },
  'UC2_vpnza621Sa0cf_xhqJ8Q': { name: 'Raw Space', strictness: 'moderate' },
  'UC9T3XwCjQdzpSp7IzGkbtJA': { name: 'International Rocket Launches', strictness: 'strict' },
  'UCLA_DiR1FfKNvjuUpBHmylQ': { name: 'NASA', strictness: 'moderate' },
};

const API_QUOTA_TRACKER = {
  callsThisRun: 0,
  maxCallsPerRun: 50, 
};

// --- HELPER FUNCTIONS ---

function isHighProfile(rocketName) {
  const name = rocketName.toLowerCase();
  return (
    name.includes('starship') || name.includes('new glenn') ||
    name.includes('sls') || name.includes('space launch system') ||
    name.includes('falcon heavy') || name.includes('ariane 6') || name.includes('vulcan')
  );
}

function getRocketName(launchName) {
  const lower = launchName.toLowerCase();
  if (lower.includes('new glenn')) return 'New Glenn';
  if (lower.includes('starship')) return 'Starship';
  if (lower.includes('falcon heavy')) return 'Falcon Heavy';
  if (lower.includes('falcon 9')) return 'Falcon 9';
  if (lower.includes('atlas v')) return 'Atlas V';
  if (lower.includes('electron')) return 'Electron';
  if (lower.includes('vulcan')) return 'Vulcan';
  
  if (lower.includes('long march')) {
    const match = launchName.match(/Long March [\w/-]+/i);
    return match ? match[0] : 'Long March';
  }
  return launchName.split('|')[0].trim();
}

function extractMissionInfo(launchName) {
  const lower = launchName.toLowerCase();
  if (lower.includes('starlink')) {
    const match = launchName.match(/Starlink Group ([\d-]+)/i);
    return { type: 'starlink', group: match ? match[1] : null, isFrequent: true };
  }
  if (lower.includes('starship')) {
    const match = launchName.match(/Flight (\d+)/i);
    return { type: 'starship', flightNumber: match ? match[1] : null, isFrequent: false };
  }
  const parts = launchName.split('|');
  if (parts.length > 1) {
    return { type: 'payload', payload: parts[1].trim(), isFrequent: false };
  }
  return { type: 'unknown', isFrequent: false };
}

function buildSearchQuery(launchName, channelId) {
  const rocketName = getRocketName(launchName);
  const missionInfo = extractMissionInfo(launchName);
  const channelConfig = CHANNEL_CONFIGS[channelId];
  
  if (isHighProfile(rocketName)) return rocketName;
  if (missionInfo.type === 'starlink' && missionInfo.group) return `${rocketName} Starlink`;
  if (missionInfo.type === 'payload' && missionInfo.payload) return `${rocketName} ${missionInfo.payload}`;
  
  return rocketName;
}

function isStreamMatch(item, launchName, missionInfo, isHighProfileRocket, channelId) {
  const title = item.snippet.title.toLowerCase();
  const description = (item.snippet.description || '').toLowerCase();
  const combined = `${title} ${description}`;
  const rocketName = getRocketName(launchName).toLowerCase();
  
  if (isHighProfileRocket) return combined.includes(rocketName);

  if (missionInfo.type === 'starlink' && missionInfo.group) {
    if (!combined.includes('starlink')) return false;
    const group = missionInfo.group.toLowerCase();
    return combined.includes(group) || combined.includes(group.replace('-', ' '));
  }

  if (missionInfo.type === 'payload' && missionInfo.payload) {
    const payload = missionInfo.payload.toLowerCase();
    if (!payload.includes('unknown')) return combined.includes(payload);
  }

  return combined.includes(rocketName.split(' ')[0]);
}

function deduplicateStreams(streams) {
  const seen = new Set();
  return streams.filter(s => {
    if (seen.has(s.streamId)) return false;
    seen.add(s.streamId);
    return true;
  });
}

function calculateMatchScore(streamTitle, launchName, missionInfo) {
  const streamLower = streamTitle.toLowerCase();
  let score = 0;
  const rocket = getRocketName(launchName).toLowerCase();
  
  if (streamLower.includes(rocket)) score += 3;
  if (missionInfo.type === 'starlink' && missionInfo.group && streamLower.includes(missionInfo.group.toLowerCase())) score += 5;
  if (missionInfo.type === 'payload' && missionInfo.payload && streamLower.includes(missionInfo.payload.toLowerCase())) score += 4;
  
  return Math.min(score / 10, 1);
}

// --- CORE EXPORTS ---

export const checkChannelUpcomingStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const searchQuery = buildSearchQuery(launchName, channelId);
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'upcoming',
        maxResults: 10,
        q: searchQuery,
      },
      timeout: 10000,
    });

    API_QUOTA_TRACKER.callsThisRun++;
    
    const items = response.data.items || [];
    const missionInfo = extractMissionInfo(launchName);
    const isHighProfileRocket = isHighProfile(getRocketName(launchName));
    
    return items
      .filter(item => isStreamMatch(item, launchName, missionInfo, isHighProfileRocket, channelId))
      .map(item => ({
        streamId: item.id.videoId,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url,
        scheduledStartTime: item.snippet.publishedAt,
        platform: 'youtube'
      }));
  } catch (error) {
    console.error(`❌ Error checking channel ${channelId}:`, error.message);
    return [];
  }
};

/**
 * MAIN ENTRY POINT: Processes one launch at a time for User-Triggered Sync
 */
export const matchStreamsToSingleLaunch = async (launch) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📡 SYNC TRIGGERED: ${launch.name}`);
  console.log(`⏰ CHRONOLOGY: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}`);

  API_QUOTA_TRACKER.callsThisRun = 0;
  const allStreams = [];

  for (const [channelId, config] of Object.entries(CHANNEL_CONFIGS)) {
    if (API_QUOTA_TRACKER.callsThisRun >= API_QUOTA_TRACKER.maxCallsPerRun) break;
    
    const upcoming = await checkChannelUpcomingStreams(channelId, launch.name);
    if (upcoming.length > 0) {
      console.log(`   ✅ ${config.name}: Found ${upcoming.length} stream(s)`);
      allStreams.push(...upcoming);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const uniqueStreams = deduplicateStreams(allStreams);
  const missionInfo = extractMissionInfo(launch.name);

  return uniqueStreams.map(stream => ({
    ...stream,
    launchId: launch.id,
    matchScore: calculateMatchScore(stream.title, launch.name, missionInfo),
    lastUpdated: new Date()
  }));
};