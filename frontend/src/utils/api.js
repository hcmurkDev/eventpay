import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach token from localStorage automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ep_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear storage
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ep_token');
      localStorage.removeItem('ep_role');
    }
    return Promise.reject(err);
  }
);

export default api;
