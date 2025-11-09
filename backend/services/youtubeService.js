import axios from 'axios';
import Stream from '../models/Stream.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Known space streaming channels - ONLY SEARCH THESE
const KNOWN_CHANNELS = [
  'UC6uKrU_WqJ1R2HMTY3LIx5Q', // Everyday Astronaut
  'UCSUu1lih2RifWkKtDOJdsBA', // NASASpaceflight
];

// Check channel for upcoming scheduled streams
export const checkChannelUpcomingStreams = async (channelId, launchName) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    return [];
  }

  try {
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'upcoming',
        maxResults: 10,
        order: 'date'
      }
    });

    const items = response.data.items || [];
    
    // Filter streams that match the launch name
    const searchTerms = extractSearchTerms(launchName).toLowerCase().split(' ');
    
    return items.filter(item => {
      const title = item.snippet.title.toLowerCase();
      // Match if title contains key search terms
      return searchTerms.some(term => title.includes(term));
    }).map(item => ({
      streamId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      scheduledStartTime: item.snippet.publishedAt,
      platform: 'youtube',
      isLive: false
    }));
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
    const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        key: apiKey,
        part: 'snippet',
        channelId: channelId,
        type: 'video',
        eventType: 'live',
        maxResults: 10,
        order: 'date'
      }
    });

    const items = response.data.items || [];
    
    // Filter streams that match the launch name
    const searchTerms = extractSearchTerms(launchName).toLowerCase().split(' ');
    
    return items.filter(item => {
      const title = item.snippet.title.toLowerCase();
      return searchTerms.some(term => title.includes(term));
    }).map(item => ({
      streamId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      scheduledStartTime: item.snippet.publishedAt,
      platform: 'youtube',
      isLive: true
    }));
  } catch (error) {
    console.error(`Error checking live streams for channel ${channelId}:`, error.message);
    return [];
  }
};

// Main function to match streams to launches
export const matchStreamsToLaunches = async (launches) => {
  console.log(`\n=== Starting stream matching for ${launches.length} launches ===`);
  console.log(`Only searching ${KNOWN_CHANNELS.length} known channels\n`);
  
  let totalStreamsFound = 0;
  
  for (const launch of launches) {
    const launchDate = new Date(launch.date);
    const now = new Date();
    
    const daysUntilLaunch = (launchDate - now) / (1000 * 60 * 60 * 24);
    
    // Only search for launches within 7 days
    if (daysUntilLaunch < 0 || daysUntilLaunch > 7) {
      console.log(`⏭️  Skipping "${launch.name}" (${daysUntilLaunch.toFixed(1)} days away)`);
      continue;
    }
    
    const searchTerms = extractSearchTerms(launch.name);
    console.log(`\n🔍 Searching for: ${launch.name}`);
    console.log(`   Search terms: "${searchTerms}"`);
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
        const matchScore = calculateMatchScore(stream.title, launch.name);
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

// Extract meaningful search terms from launch name
function extractSearchTerms(launchName) {
  const lower = launchName.toLowerCase();
  
  // If unknown payload, just use the rocket name
  if (lower.includes('unknown payload')) {
    const rocketName = launchName.split('|')[0].trim();
    
    if (lower.includes('new glenn')) return 'New Glenn';
    if (lower.includes('starship')) return 'Starship';
    if (lower.includes('falcon 9')) return 'Falcon 9';
    if (lower.includes('falcon heavy')) return 'Falcon Heavy';
    if (lower.includes('atlas v')) return 'Atlas V';
    if (lower.includes('delta iv')) return 'Delta IV';
    if (lower.includes('electron')) return 'Electron';
    if (lower.includes('long march')) return 'Long March';
    if (lower.includes('kinetica')) return 'Kinetica';
    if (lower.includes('ceres')) return 'Ceres-1';
    
    return rocketName;
  }
  
  // For Starlink launches, search for the specific group
  if (lower.includes('starlink')) {
    const match = launchName.match(/Starlink Group ([\d-]+)/i);
    if (match) {
      return `Starlink Group ${match[1]}`;
    }
    return 'Starlink';
  }
  
  // For Starship flights
  if (lower.includes('starship')) {
    const match = launchName.match(/Flight (\d+)/i);
    if (match) {
      return `Starship Flight ${match[1]}`;
    }
    return 'Starship';
  }
  
  // For New Glenn - include company name for better matching
  if (lower.includes('new glenn')) {
    const payload = launchName.split('|')[1]?.trim();
    if (payload && !payload.includes('Unknown')) {
      return `New Glenn ${payload}`;
    }
    return 'New Glenn';
  }
  
  // For Atlas V
  if (lower.includes('atlas v')) {
    const payload = launchName.split('|')[1]?.trim();
    if (payload && !payload.includes('Unknown')) {
      return `Atlas V ${payload}`;
    }
    return 'Atlas V';
  }
  
  // For other launches with named payloads
  const parts = launchName.split('|');
  if (parts.length > 1) {
    const payload = parts[1].trim();
    if (payload && !payload.includes('Unknown')) {
      const rocket = parts[0].trim().split(' ')[0];
      return `${rocket} ${payload}`;
    }
  }
  
  // Default: return the first part (rocket name)
  return parts[0].trim();
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

// Calculate match score between stream title and launch name
function calculateMatchScore(streamTitle, launchName) {
  const streamLower = streamTitle.toLowerCase();
  const launchLower = launchName.toLowerCase();
  
  // Extract keywords from launch name
  const keywords = launchLower
    .split(/[\s-|]+/)
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'unknown', 'payload', 'block'].includes(word));
  
  let score = 0;
  
  keywords.forEach(keyword => {
    if (streamLower.includes(keyword)) {
      score += 1;
    }
  });
  
  // Boost for rocket names
  if (streamLower.includes('new glenn') && launchLower.includes('new glenn')) {
    score += 3;
  }
  if (streamLower.includes('starship') && launchLower.includes('starship')) {
    score += 3;
  }
  if (streamLower.includes('falcon') && launchLower.includes('falcon')) {
    score += 2;
  }
  if (streamLower.includes('starlink') && launchLower.includes('starlink')) {
    score += 2;
  }
  
  // Boost for company names
  if (streamLower.includes('blue origin') && launchLower.includes('new glenn')) {
    score += 2;
  }
  if (streamLower.includes('spacex') && (launchLower.includes('falcon') || launchLower.includes('starlink') || launchLower.includes('starship'))) {
    score += 1;
  }
  
  // Boost for key terms
  if (streamLower.includes('launch') || streamLower.includes('live')) {
    score += 0.5;
  }
  
  // Normalize to 0-1
  return keywords.length > 0 ? Math.min(score / (keywords.length + 2), 1) : 0;
}