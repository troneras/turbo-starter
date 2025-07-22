import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import type { UseAuthReturn } from '../hooks/use-auth';

interface TestAuthContextValue extends UseAuthReturn {
  setTestUser: (user: TestUser | null) => void;
}

interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

export const TestAuthContext = createContext<TestAuthContextValue | null>(null);

interface TestAuthProviderProps {
  children: ReactNode;
  initialUser?: TestUser;
}

export function TestAuthProvider({ children, initialUser }: TestAuthProviderProps) {
  const [testUser, setTestUser] = useState<TestUser | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for test JWT in localStorage (set by Puppeteer)
    const testJwt = localStorage.getItem('test_jwt');
    const testUserData = localStorage.getItem('test_user');
    
    if (testJwt && testUserData) {
      try {
        const userData = JSON.parse(testUserData);
        setTestUser({
          ...userData,
          jwt: testJwt
        });
        // Also set the regular JWT for API client
        localStorage.setItem('auth_jwt', testJwt);
      } catch (error) {
        console.error('Failed to parse test user data:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async () => {
    // In test mode, login is handled by setting test data
    console.log('Test login - set test user data via setTestUser or localStorage');
  };

  const logout = async () => {
    setTestUser(null);
    localStorage.removeItem('auth_jwt');
    localStorage.removeItem('test_jwt');
    localStorage.removeItem('test_user');
  };

  const hasRole = (role: string): boolean => {
    return testUser?.roles?.includes(role) || false;
  };

  const hasPermission = (permission: string): boolean => {
    return testUser?.permissions?.includes(permission) || false;
  };

  const msalAccount: AccountInfo | null = testUser ? {
    homeAccountId: testUser.id,
    environment: 'test',
    tenantId: 'test-tenant',
    username: testUser.email,
    localAccountId: testUser.id,
    name: testUser.name,
    idToken: '',
    idTokenClaims: {},
    nativeAccountId: ''
  } : null;

  const value: TestAuthContextValue = {
    isAuthenticated: !!testUser,
    user: msalAccount,
    backendUser: testUser ? {
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      roles: testUser.roles,
      permissions: testUser.permissions
    } : null,
    login,
    logout,
    hasRole,
    hasPermission,
    isLoading,
    setTestUser: (user) => {
      setTestUser(user);
      if (user) {
        localStorage.setItem('auth_jwt', user.jwt);
        localStorage.setItem('test_jwt', user.jwt);
        localStorage.setItem('test_user', JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          permissions: user.permissions
        }));
      } else {
        localStorage.removeItem('auth_jwt');
        localStorage.removeItem('test_jwt');
        localStorage.removeItem('test_user');
      }
    }
  };

  return (
    <TestAuthContext.Provider value={value}>
      {children}
    </TestAuthContext.Provider>
  );
}

export function useTestAuth() {
  const context = useContext(TestAuthContext);
  if (!context) {
    throw new Error('useTestAuth must be used within TestAuthProvider');
  }
  return context;
}