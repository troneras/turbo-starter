import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Legacy MSAL instance management - kept for compatibility
export const setMsalInstance = (instance: any, accountList: any[]) => {
  // No longer needed since we use JWT tokens directly
};

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Skip auth for the login endpoint itself
    if (config.url?.includes('/auth/login')) {
      return config;
    }

    // Use stored JWT for API calls
    const jwt = localStorage.getItem('auth_jwt');
    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or trigger re-authentication
      console.error('Authentication required');
    }
    return Promise.reject(error);
  }
);

export { apiClient };