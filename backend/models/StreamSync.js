import mongoose from 'mongoose';

const streamSyncSchema = new mongoose.Schema({
  launchId: { type: String, required: true, unique: true },
  lastUpdated: { type: Date, default: Date.now },
  streams: { type: Array, default: [] }
});

export default mongoose.model('StreamSync', streamSyncSchema);