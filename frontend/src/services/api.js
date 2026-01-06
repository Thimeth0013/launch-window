import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🔵 [API_REQUEST] ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('🔴 [API_REQUEST_ERROR]', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`🟢 [API_RESPONSE] ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error(`🔴 [API_RESPONSE_ERROR] ${error.config?.url}`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return Promise.reject(error);
  }
);

export const fetchLaunches = async (limit = 20) => {
  const response = await api.get(`/launches?limit=${limit}`);
  return response.data;
};

export const fetchLaunchById = async (id) => {
  console.log(`🔍 [FETCH_LAUNCH_BY_ID] Requesting launch with ID: ${id}`);
  const response = await api.get(`/launches/${id}`);
  console.log(`✅ [FETCH_LAUNCH_BY_ID] Successfully fetched:`, response.data?.name);
  return response.data;
};

export const fetchStreamsForLaunch = async (launchId) => {
  console.log(`🎥 [FETCH_STREAMS] Requesting streams for launch ID: ${launchId}`);
  const response = await api.get(`/streams/launch/${launchId}`);
  console.log(`✅ [FETCH_STREAMS] Found ${response.data?.length || 0} streams`);
  return response.data;
};

export const addStream = async (streamData) => {
  const response = await api.post('/streams', streamData);
  return response.data;
};

export default api;