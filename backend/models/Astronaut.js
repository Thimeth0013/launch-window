import mongoose from 'mongoose';

const astronautSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  name: String,
  nationality: String,
  profile_image: String,
  bio: String,
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