import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AccountInfo } from '@azure/msal-browser';
import type { UseAuthReturn } from '../hooks/use-auth';
import { getTestUser, type TestUser } from '@/lib/test-users';

interface TestAuthContextValue extends UseAuthReturn {
  setTestUser: (user: TestUser | null) => void;
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
    // Check URL parameters first for auto-login
    const urlParams = new URLSearchParams(window.location.search);
    const testProfile = urlParams.get('testProfile');
    
    if (testProfile) {
      // Use async function to get test user
      getTestUser(testProfile).then(predefinedUser => {
        if (predefinedUser) {
          // Auto-login with the specified test profile
          setTestUser(predefinedUser);
          localStorage.setItem('test_mode', 'true');
          localStorage.setItem('auth_jwt', predefinedUser.jwt);
          localStorage.setItem('test_jwt', predefinedUser.jwt);
          localStorage.setItem('test_user', JSON.stringify({
            id: predefinedUser.id,
            email: predefinedUser.email,
            name: predefinedUser.name,
            roles: predefinedUser.roles,
            permissions: predefinedUser.permissions
          }));
          setIsLoading(false);
          
          // Remove the query parameters from URL to clean it up
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('testMode');
          newUrl.searchParams.delete('testProfile');
          window.history.replaceState({}, '', newUrl.toString());
        } else {
          console.warn(`Unknown test profile: ${testProfile}. Available profiles: admin, editor, translator`);
          setIsLoading(false);
        }
      }).catch(error => {
        console.error('Failed to load test user:', error);
        setIsLoading(false);
      });
      return;
    }
    
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
    setTestUser: (user: TestUser | null) => {
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