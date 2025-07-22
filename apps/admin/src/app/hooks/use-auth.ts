import { useAccount, useIsAuthenticated, useMsal } from '@azure/msal-react';
import type { AccountInfo } from '@azure/msal-browser';
import { useState, useEffect, useContext } from 'react';
import { apiClient } from '../../lib/api-client';
import { TestAuthContext } from '../providers/test-auth-provider';

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

// Check if we're in test mode
const isTestMode = () => {
  return import.meta.env.VITE_TEST_MODE === 'true' || 
         (typeof window !== 'undefined' && (
           window.location.search.includes('testMode=true') ||
           localStorage.getItem('test_mode') === 'true'
         ));
};

// MSAL-based authentication hook
function useMsalAuth(): UseAuthReturn {
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

// Unified auth hook that switches between test and MSAL auth
export function useAuth(): UseAuthReturn {
  const testContext = useContext(TestAuthContext);
  
  if (isTestMode() && testContext) {
    return {
      isAuthenticated: testContext.isAuthenticated,
      user: testContext.user,
      backendUser: testContext.backendUser,
      login: testContext.login,
      logout: testContext.logout,
      hasRole: testContext.hasRole,
      hasPermission: testContext.hasPermission,
      isLoading: testContext.isLoading,
    };
  }
  
  // Fall back to MSAL auth
  return useMsalAuth();
}