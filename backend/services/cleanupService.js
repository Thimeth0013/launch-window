import Launch from '../models/Launch.js';
import StreamSync from '../models/StreamSync.js';

/**
 * Clean up launches that are older than specified hours
 * Also removes their StreamSync cache
 * @param {number} hoursAfterLaunch - Hours after launch date to keep (default: 48)
 * @returns {object} - Cleanup stats
 */
export const cleanupOldLaunches = async (hoursAfterLaunch = 48) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAfterLaunch);

    console.log(`\n🗑️  === Starting Cleanup ===`);
    console.log(`Removing launches older than ${hoursAfterLaunch} hours (before ${cutoffDate.toISOString()})`);

    // Find old launches
    const oldLaunches = await Launch.find({
      date: { $lt: cutoffDate }
    });

    if (oldLaunches.length === 0) {
      console.log('✅ No old launches to clean up\n');
      return { launchesDeleted: 0, streamCachesDeleted: 0 };
    }

    console.log(`Found ${oldLaunches.length} old launches to remove`);

    const launchIds = oldLaunches.map(launch => launch.id);

    // Delete StreamSync caches for these launches
    const streamSyncResult = await StreamSync.deleteMany({
      launchId: { $in: launchIds }
    });
    console.log(`✅ Removed ${streamSyncResult.deletedCount} stream caches`);

    // Delete the launches
    const launchResult = await Launch.deleteMany({
      date: { $lt: cutoffDate }
    });
    console.log(`✅ Removed ${launchResult.deletedCount} launches`);

    console.log(`=== Cleanup Completed ===\n`);
    
    return {
      launchesDeleted: launchResult.deletedCount,
      streamCachesDeleted: streamSyncResult.deletedCount
    };
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    throw error;
  }
};

/**
 * Clean up orphaned StreamSync records (for launches that don't exist)
 * @returns {number} - Number of orphaned caches deleted
 */
export const cleanupOrphanedStreamCaches = async () => {
  try {
    console.log(`\n🗑️  === Checking for Orphaned Stream Caches ===`);
    
    // Get all launch IDs from StreamSync
    const syncLaunchIds = await StreamSync.distinct('launchId');
    console.log(`Found ${syncLaunchIds.length} launch IDs in StreamSync`);
    
    // Get all existing launch IDs
    const existingLaunchIds = await Launch.distinct('id');
    console.log(`Found ${existingLaunchIds.length} launches in database`);
    
    // Find orphaned IDs
    const orphanedIds = syncLaunchIds.filter(
      id => !existingLaunchIds.includes(id)
    );

    if (orphanedIds.length === 0) {
      console.log('✅ No orphaned stream caches\n');
      return 0;
    }

    console.log(`Found ${orphanedIds.length} orphaned stream caches`);

    const result = await StreamSync.deleteMany({
      launchId: { $in: orphanedIds }
    });

    console.log(`✅ Cleaned up ${result.deletedCount} orphaned caches\n`);
    
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Orphan cleanup error:', error.message);
    throw error;
  }
};

/**
 * Get cleanup statistics without deleting anything
 */
export const getCleanupStats = async (hoursAfterLaunch = 48) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAfterLaunch);

    const oldLaunches = await Launch.find({
      date: { $lt: cutoffDate }
    });

    const launchIds = oldLaunches.map(launch => launch.id);
    
    const streamCacheCount = await StreamSync.countDocuments({
      launchId: { $in: launchIds }
    });

    return {
      oldLaunchesCount: oldLaunches.length,
      streamCachesCount: streamCacheCount,
      cutoffDate: cutoffDate.toISOString(),
      launches: oldLaunches.map(l => ({
        id: l.id,
        name: l.name,
        date: l.date,
        status: l.status
      }))
    };
  } catch (error) {
    console.error('Error getting cleanup stats:', error.message);
    throw error;
  }
};