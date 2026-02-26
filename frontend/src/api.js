import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Steam API
export const searchGames = (q) => api.get('/steam/search', { params: { q } });
export const getGameDetails = (appId) => api.get(`/steam/details/${appId}`);

// Collect API
export const collectGame = (data) => api.post('/collect', data);
export const previewGame = (data) => api.post('/collect/preview', data);

// History API
export const getRecordStats = () => api.get('/history/records/stats');
export const getRecords = (params) => api.get('/history/records', { params });
export const getRecord = (id) => api.get(`/history/records/${id}`);

// Queue API
export const enqueueGame = (data) => api.post('/queue/enqueue', data);
export const enqueueBatch = (data) => api.post('/queue/enqueue/batch', data);

// Settings API
export const testConnection = (type) => api.post(`/settings/test-${type}`);

export default api;
