import mongoose from 'mongoose';

const launchSyncSchema = new mongoose.Schema({
  syncId: { type: String, default: 'GLOBAL_LAUNCH_SYNC', unique: true },
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('LaunchSync', launchSyncSchema);