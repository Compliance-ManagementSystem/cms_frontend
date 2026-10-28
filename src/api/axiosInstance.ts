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
      // Server responded with error status. The API sends a readable message;
      // anything else (an HTML page from the proxy, an empty body) gets one by status.
      const data = error.response.data;
      const serverMessage = data && typeof data === 'object' ? data.message : undefined;
      error.message =
        serverMessage || STATUS_MESSAGES[error.response.status] || 'Something went wrong. Please try again.';
      if (data?.errorId) {
        error.message += ` (Error ID: ${data.errorId})`;
      }
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      error.message = 'The server is taking too long to respond. Please try again.';
    } else if (axios.isCancel(error)) {
      // Cancelled on purpose (e.g. the user left the page): keep axios' own value
    } else if (error.request) {
      // No response received
      error.message = navigator.onLine
        ? 'Cannot reach the server. Please try again in a moment.'
        : 'You are offline. Please check your internet connection.';
    }
    return Promise.reject(error);
  }
);

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Some of the information provided is invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do this.',
  404: 'The requested item was not found.',
  408: 'The request took too long. Please try again.',
  413: 'The file or data is too large.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'The server is temporarily unavailable. Please try again in a moment.',
  503: 'The server is temporarily unavailable. Please try again in a moment.',
  504: 'The server is taking too long to respond. Please try again.',
};

export default axiosInstance;
