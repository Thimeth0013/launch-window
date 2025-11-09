import axios from 'axios';
import Launch from '../models/Launch.js';

const LAUNCH_LIBRARY_API = 'https://ll.thespacedevs.com/2.2.0';

export const fetchUpcomingLaunches = async () => {
  try {
    const response = await axios.get(`${LAUNCH_LIBRARY_API}/launch/upcoming/`, {
      params: {
        limit: 50,
        mode: 'detailed'
      }
    });

    const launches = response.data.results;
    
    for (const launch of launches) {
      await Launch.findOneAndUpdate(
        { id: launch.id },
        {
          id: launch.id,
          name: launch.name,
          date: new Date(launch.net),
          status: launch.status.name,
          rocket: {
            name: launch.rocket.configuration.name,
            configuration: launch.rocket.configuration.full_name
          },
          mission: {
            name: launch.mission?.name,
            description: launch.mission?.description,
            type: launch.mission?.type
          },
          pad: {
            name: launch.pad.name,
            location: launch.pad.location.name
          },
          image: launch.image,
          webcast_live: launch.webcast_live,
          provider: launch.launch_service_provider.name
        },
        { upsert: true, new: true }
      );
    }

    console.log(`Updated ${launches.length} launches`);
    return launches;
  } catch (error) {
    console.error('Error fetching launches:', error.message);
    throw error;
  }
};

export const getUpcomingLaunches = async (limit = 20) => {
  const now = new Date();
  const launches = await Launch.find({
    date: { $gte: now }
  })
    .sort({ date: 1 })
    .limit(limit);
  
  return launches;
};

export const getLaunchById = async (id) => {
  return await Launch.findOne({ id });
};