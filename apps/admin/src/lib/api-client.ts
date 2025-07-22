import axios from 'axios';
import type { AxiosInstance } from 'axios';

let msalInstance: any = null;
let accounts: any[] = [];

// This will be initialized after MSAL is ready
export const setMsalInstance = (instance: any, accountList: any[]) => {
  msalInstance = instance;
  accounts = accountList;
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
    if (msalInstance && accounts.length > 0) {
      try {
        const silentRequest = {
          scopes: [import.meta.env.VITE_MSAL_SCOPES],
          account: accounts[0],
        };

        const response = await msalInstance.acquireTokenSilent(silentRequest);
        config.headers.Authorization = `Bearer ${response.accessToken}`;
      } catch (error) {
        console.warn('Silent token acquisition failed:', error);
        // Continue without token - let the API handle unauthorized requests
      }
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