import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('dcroper_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dcroper_token');
      localStorage.removeItem('dcroper_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
