import mongoose from 'mongoose';

const streamSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    unique: true
  },
  launchId: {
    type: String,
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  channelName: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  scheduledStartTime: Date,
  platform: {
    type: String,
    default: 'youtube'
  },
  isLive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['upcoming', 'scrubbed', 'complete'],
    default: 'upcoming'
  },
  matchScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
streamSchema.index({ launchId: 1, status: 1 });

const Stream = mongoose.model('Stream', streamSchema);

export default Stream;