// backend/models/Launch.js
import mongoose from 'mongoose';

const launchSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, default: 'upcoming' },
  rocket: {
    name: { type: String },
    configuration: { type: String }
  },
  mission: {
    name: { type: String },
    description: { type: String },
    type: { type: String }
  },
  pad: {
    name: { type: String },
    location: { type: String }
  },
  image: { type: String },
  webcast_live: { type: Boolean, default: false },
  provider: { type: String }
}, {
  timestamps: true
});

export default mongoose.model('Launch', launchSchema);