import Launch from '../models/Launch.js';
import Stream from '../models/Stream.js';

/**
 * Delete launches that are older than specified hours
 * Also deletes all associated streams
 * @param {number} hoursAfterLaunch - Hours after launch date to keep (default: 24)
 */
export const cleanupOldLaunches = async (hoursAfterLaunch = 24) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAfterLaunch);

    console.log(`\n=== Starting Cleanup ===`);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Deleting launches older than ${hoursAfterLaunch} hours`);

    // Find old launches
    const oldLaunches = await Launch.find({
      date: { $lt: cutoffDate }
    });

    if (oldLaunches.length === 0) {
      console.log('✅ No old launches to clean up');
      return { deleted: 0, streamsDeleted: 0 };
    }

    console.log(`\nFound ${oldLaunches.length} old launches to delete:`);
    oldLaunches.forEach(launch => {
      console.log(`  - ${launch.name} (${launch.date.toISOString()})`);
    });

    const launchIds = oldLaunches.map(launch => launch.id);

    // Delete associated streams FIRST
    console.log(`\nDeleting streams for ${launchIds.length} launches...`);
    const streamsDeleted = await Stream.deleteMany({
      launchId: { $in: launchIds }
    });
    console.log(`✅ Deleted ${streamsDeleted.deletedCount} streams`);

    // Then delete launches
    console.log(`\nDeleting ${oldLaunches.length} launches...`);
    const launchesDeleted = await Launch.deleteMany({
      date: { $lt: cutoffDate }
    });
    console.log(`✅ Deleted ${launchesDeleted.deletedCount} launches`);

    console.log(`\n=== Cleanup Completed ===`);
    console.log(`Total removed: ${launchesDeleted.deletedCount} launches, ${streamsDeleted.deletedCount} streams\n`);
    
    return {
      deleted: launchesDeleted.deletedCount,
      streamsDeleted: streamsDeleted.deletedCount,
      launchIds: launchIds,
      launches: oldLaunches.map(l => ({ id: l.id, name: l.name, date: l.date }))
    };
  } catch (error) {
    console.error('❌ Error cleaning up old launches:', error.message);
    throw error;
  }
};

/**
 * Archive old launches instead of deleting them
 * Useful if you want to keep historical data
 */
export const archiveOldLaunches = async (hoursAfterLaunch = 24) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAfterLaunch);

    console.log(`\n=== Starting Archive ===`);
    console.log(`Archiving launches older than ${hoursAfterLaunch} hours`);

    const result = await Launch.updateMany(
      {
        date: { $lt: cutoffDate },
        status: { $ne: 'archived' }
      },
      {
        $set: { status: 'archived' }
      }
    );

    console.log(`✅ Archived ${result.modifiedCount} old launches\n`);
    
    return { archived: result.modifiedCount };
  } catch (error) {
    console.error('❌ Error archiving old launches:', error.message);
    throw error;
  }
};

/**
 * Delete streams for launches that no longer exist
 * Cleanup orphaned data
 */
export const cleanupOrphanedStreams = async () => {
  try {
    console.log(`\n=== Checking for Orphaned Streams ===`);
    
    // Get all unique launch IDs from streams
    const streamLaunchIds = await Stream.distinct('launchId');
    console.log(`Found ${streamLaunchIds.length} unique launch IDs in streams`);
    
    // Get all existing launch IDs
    const existingLaunchIds = await Launch.distinct('id');
    console.log(`Found ${existingLaunchIds.length} launches in database`);
    
    // Find orphaned streams
    const orphanedIds = streamLaunchIds.filter(
      id => !existingLaunchIds.includes(id)
    );

    if (orphanedIds.length === 0) {
      console.log('✅ No orphaned streams to clean up\n');
      return { deleted: 0 };
    }

    console.log(`Found ${orphanedIds.length} orphaned launch IDs:`);
    orphanedIds.forEach(id => console.log(`  - ${id}`));

    const result = await Stream.deleteMany({
      launchId: { $in: orphanedIds }
    });

    console.log(`✅ Cleaned up ${result.deletedCount} orphaned streams\n`);
    
    return { 
      deleted: result.deletedCount,
      orphanedLaunchIds: orphanedIds
    };
  } catch (error) {
    console.error('❌ Error cleaning up orphaned streams:', error.message);
    throw error;
  }
};

/**
 * Get cleanup statistics without deleting anything
 */
export const getCleanupStats = async (hoursAfterLaunch = 24) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAfterLaunch);

    const oldLaunches = await Launch.find({
      date: { $lt: cutoffDate }
    });

    const launchIds = oldLaunches.map(launch => launch.id);
    
    const streamCount = await Stream.countDocuments({
      launchId: { $in: launchIds }
    });

    return {
      oldLaunchesCount: oldLaunches.length,
      associatedStreamsCount: streamCount,
      cutoffDate: cutoffDate,
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