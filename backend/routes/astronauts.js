import express from 'express';
import axios from 'axios';
import Astronaut from '../models/Astronaut.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`📡 [ASTRO_SYNC] Fetching detailed file for ID: ${id}`);
    
    // 1. Check local database first
    let astronaut = await Astronaut.findOne({ id: parseInt(id) });
    console.log(`💾 [DB_CHECK] Found in DB:`, !!astronaut);

    // 2. If not found or data is older than 7 days, fetch from SpaceDevs
    const IS_STALE = astronaut && (Date.now() - new Date(astronaut.lastUpdated) > 7 * 24 * 60 * 60 * 1000);

    if (!astronaut || IS_STALE) {
      console.log(`🌐 [API_CALL] Fetching from SpaceDevs API...`);
      
      const response = await axios.get(`https://ll.thespacedevs.com/2.2.0/astronaut/${id}/?mode=detailed`);
      const astroData = response.data;
      
      console.log(`✅ [API_SUCCESS] Received data for: ${astroData.name}`);

      // 3. Prepare data - ONLY include agency if it exists
      const updateData = {
        id: parseInt(astroData.id),
        name: astroData.name,
        nationality: astroData.nationality,
        profile_image: astroData.profile_image,
        bio: astroData.bio,
        status: astroData.status, 
        time_in_space: astroData.time_in_space,
        eva_time: astroData.eva_time,
        flights_count: astroData.flights_count,
        landings_count: astroData.landings_count,
        spacewalks_count: astroData.spacewalks_count,
        in_space: astroData.in_space,
        first_flight: astroData.first_flight,
        last_flight: astroData.last_flight,
        wiki: astroData.wiki,
        twitter: astroData.twitter,
        instagram: astroData.instagram,
        lastUpdated: new Date()
      };

      // Only add agency if it exists
      if (astroData.agency) {
        updateData.agency = {
          name: astroData.agency.name || undefined,
          agencyType: astroData.agency.type || undefined,
          abbreviation: astroData.agency.abbreviation || undefined
        };
      }

      console.log(`💾 [DB_SAVE] Attempting to save:`, updateData.name);

      // Use findOneAndUpdate with upsert
      astronaut = await Astronaut.findOneAndUpdate(
        { id: parseInt(astroData.id) },
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      console.log(`✅ [DB_SAVED] Successfully saved:`, astronaut.name);
    } else {
      console.log(`♻️ [CACHED] Using cached data for: ${astronaut.name}`);
    }

    return res.json(astronaut);
    
  } catch (error) {
    console.error(`❌ [ERROR]`, error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ message: "Telemetry throttled. Use cached data." });
    }
    
    res.status(500).json({ 
      message: "Failed to retrieve personnel file.",
      error: error.message 
    });
  }
});

export default router;