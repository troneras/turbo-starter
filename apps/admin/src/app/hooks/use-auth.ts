import { useAccount, useIsAuthenticated, useMsal } from '@azure/msal-react';
import type { AccountInfo } from '@azure/msal-browser';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  user: AccountInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

export function useAuth(): UseAuthReturn {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount(accounts[0] || {});

  const login = async () => {
    try {
      await instance.loginPopup({
        scopes: [import.meta.env.VITE_MSAL_SCOPES],
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const logout = async () => {
    try {
      await instance.logoutPopup();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!account?.idTokenClaims) return false;
    const roles = (account.idTokenClaims as any)?.roles || [];
    return roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!account?.idTokenClaims) return false;
    const permissions = (account.idTokenClaims as any)?.permissions || [];
    return permissions.includes(permission);
  };

  return {
    isAuthenticated,
    user: account,
    login,
    logout,
    hasRole,
    hasPermission,
  };
}