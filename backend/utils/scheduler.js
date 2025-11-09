import cron from 'node-cron';
import { fetchUpcomingLaunches } from '../services/launchService.js';
import { matchStreamsToLaunches } from '../services/youtubeService.js';
import { cleanupOldLaunches, cleanupOrphanedStreams } from '../services/cleanupService.js';
import Launch from '../models/Launch.js';

export const startScheduler = () => {
  // Fetch launches and streams every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running scheduled task: Fetching launches and streams');
    try {
      await fetchUpcomingLaunches();
      const launches = await Launch.find({
        date: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      });
      await matchStreamsToLaunches(launches);
      console.log('Scheduled task completed');
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  });

  // Clean up old launches every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('Running cleanup task: Removing old launches');
    try {
      // Delete launches older than 24 hours
      await cleanupOldLaunches(24);
      
      // Clean up orphaned streams
      await cleanupOrphanedStreams();
      
      console.log('Cleanup task completed');
    } catch (error) {
      console.error('Cleanup task error:', error);
    }
  });

  console.log('Scheduler started:');
  console.log('- Fetching launches/streams: Every 6 hours');
  console.log('- Cleanup old data: Daily at 3 AM');
};