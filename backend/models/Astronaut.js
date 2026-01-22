import mongoose from 'mongoose';

const astronautSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  name: String,
  nationality: String,
  profile_image: String,
  bio: String,
  status: { name: String, id: Number },
  time_in_space: String,
  eva_time: String,
  flights_count: Number,
  landings_count: Number,
  spacewalks_count: Number,
  in_space: Boolean,
  first_flight: Date,
  last_flight: Date,
  agency: {
    name: String,
    agencyType: String,
    abbreviation: String
  },
  wiki: String,
  twitter: String,
  instagram: String,
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.model('Astronaut', astronautSchema);