import axios from 'axios';
import env from '@/config/env';

const axiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
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
    // Keep the original axios error (response, config) so later interceptors
    // such as the 401 token refresh can still inspect it; only swap the message.
    if (error.response) {
      // Server responded with error status
      error.message =
        error.response.data?.message || 'An unexpected error occurred';
    } else if (error.request) {
      // No response received
      error.message = 'Network error – please check your connection';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
