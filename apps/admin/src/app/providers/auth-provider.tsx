import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { setMsalInstance } from '../../lib/api-client';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: import.meta.env.VITE_MSAL_AUTHORITY,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // Initialize MSAL instance for API client
    setMsalInstance(msalInstance, msalInstance.getAllAccounts());
  }, []);

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}