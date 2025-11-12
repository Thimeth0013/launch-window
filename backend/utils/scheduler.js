import cron from 'node-cron';
import { fetchUpcomingLaunches } from '../services/launchService.js';
import { matchStreamsToLaunches } from '../services/youtubeService.js';
import { cleanupOldLaunches, cleanupOrphanedStreams } from '../services/cleanupService.js';
import { startScrubDetectionScheduler } from '../services/scrubDetectionScheduler.js';
import Launch from '../models/Launch.js';

export const startScheduler = () => {
  // Fetch launches and streams twice a day at 12 AM and 12 PM
  cron.schedule('0 0,12 * * *', async () => {
    console.log('Running scheduled task: Fetching launches and streams');
    let fetchSuccessful = false;
    
    try {
      // Try to fetch new launches
      try {
        await fetchUpcomingLaunches();
        console.log('✅ Launches fetched successfully');
        fetchSuccessful = true;
        
        // Clean up old launches IMMEDIATELY after successful fetch
        console.log('🧹 Cleaning up old launches...');
        const deletedLaunches = await cleanupOldLaunches(24);
        const deletedStreams = await cleanupOrphanedStreams();
        console.log(`   Deleted ${deletedLaunches} old launches and ${deletedStreams} orphaned streams`);
        
      } catch (fetchError) {
        console.log('⚠️  Could not fetch new launches, using cached data');
        console.log(`   Error: ${fetchError.message}`);
      }
      
      // Always try to match streams, even if fetch failed
      const launches = await Launch.find({
        date: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      });
      
      if (launches.length > 0) {
        console.log(`🔍 Matching streams for ${launches.length} launches...`);
        await matchStreamsToLaunches(launches);
        console.log(`✅ Stream matching completed`);
      } else {
        console.log('ℹ️  No upcoming launches found in database');
      }
      
      console.log('✓ Scheduled task completed successfully');
    } catch (error) {
      console.error('❌ Scheduled task error:', error.message);
    }
  });

  // Start the scrub detection scheduler
  startScrubDetectionScheduler();

  console.log('Scheduler started:');
  console.log('- Fetching launches/streams: Twice daily at 12:00 AM and 12:00 PM');
  console.log('- Cleanup happens automatically after each successful fetch');
  console.log('- Scrub detection: Running every minute for launches at T-0');
};