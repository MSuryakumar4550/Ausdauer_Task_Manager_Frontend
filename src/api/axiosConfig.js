import axios from 'axios';

const api = axios.create({
  // FIXED: Added '/api' to the end of the URL
  baseURL: 'https://ausdauer-task-manager-backend.onrender.com/api', 
});

// Automatically add the token to every request if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;