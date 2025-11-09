import mongoose from 'mongoose';

const streamSchema = new mongoose.Schema({
  launchId: { type: String, required: true, ref: 'Launch' },
  platform: { type: String, required: true, enum: ['youtube', 'twitter', 'twitch'] },
  streamId: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  channelName: String,
  channelId: String,
  thumbnailUrl: String,
  language: { type: String, default: 'en' },
  scheduledStartTime: Date,
  isLive: { type: Boolean, default: false },
  viewerCount: Number,
  matchScore: Number
}, {
  timestamps: true
});

streamSchema.index({ launchId: 1, platform: 1 });

export default mongoose.model('Stream', streamSchema);