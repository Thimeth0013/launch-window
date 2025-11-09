import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchLaunches = async (limit = 20) => {
  const response = await api.get(`/launches?limit=${limit}`);
  return response.data;
};

export const fetchLaunchById = async (id) => {
  const response = await api.get(`/launches/${id}`);
  return response.data;
};

export const fetchStreamsForLaunch = async (launchId) => {
  const response = await api.get(`/streams/launch/${launchId}`);
  return response.data;
};

export const addStream = async (streamData) => {
  const response = await api.post('/streams', streamData);
  return response.data;
};

export default api;