import { useAccount, useIsAuthenticated, useMsal } from '@azure/msal-react';
import type { AccountInfo } from '@azure/msal-browser';
import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

interface BackendUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
}

export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  backendUser: BackendUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
}

export function useAuth(): UseAuthReturn {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || {});
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Exchange MSAL token for backend JWT when authenticated
  useEffect(() => {
    let mounted = true;

    const exchangeToken = async () => {
      if (!isAuthenticated || !account || backendUser) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get fresh access token (ensures we have valid token)
        const tokenRequest = {
          scopes: [import.meta.env.VITE_MSAL_SCOPES],
          account: account,
        };
        
        await instance.acquireTokenSilent(tokenRequest);
        
        // Create Azure token for backend (base64 encoded user info)
        const azureTokenData = {
          email: account.username,
          name: account.name || account.username,
          oid: account.localAccountId,
          tid: account.tenantId,
        };
        
        // Use btoa for base64 encoding in browser
        const azureToken = btoa(JSON.stringify(azureTokenData));
        
        // Exchange with backend
        const response = await apiClient.post('/auth/login', {
          azure_token: azureToken
        });
        
        const { jwt, user, roles, permissions } = response.data;
        
        // Store JWT in localStorage for api-client
        localStorage.setItem('auth_jwt', jwt);
        
        if (mounted) {
          setBackendUser({ ...user, roles, permissions });
        }
        
      } catch (error) {
        console.error('Token exchange failed:', error);
        // Clear any stale JWT
        localStorage.removeItem('auth_jwt');
        if (mounted) {
          setBackendUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    exchangeToken();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, account, instance, backendUser]);

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: [import.meta.env.VITE_MSAL_SCOPES],
      });
      // Token exchange will happen in useEffect
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear backend user and JWT
      setBackendUser(null);
      localStorage.removeItem('auth_jwt');
      
      await instance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!backendUser?.roles) return false;
    return backendUser.roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!backendUser?.permissions) return false;
    return backendUser.permissions.includes(permission);
  };

  return {
    isAuthenticated: isAuthenticated && !!backendUser,
    user: account,
    backendUser,
    login,
    logout,
    hasRole,
    hasPermission,
    isLoading,
  };
}