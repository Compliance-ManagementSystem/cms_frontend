import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor ────────────────────────────────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    // Phase 2 will add Authorization header here
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message =
        error.response.data?.message || 'An unexpected error occurred';
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // No response received
      return Promise.reject(
        new Error('Network error – please check your connection')
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
