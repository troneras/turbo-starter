import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { TestAuthProvider } from './test-auth-provider';

interface ConditionalAuthProviderProps {
  children: ReactNode;
}

export function ConditionalAuthProvider({ children }: ConditionalAuthProviderProps) {
  // Check if we're in test mode
  const isTestMode = import.meta.env.VITE_TEST_MODE === 'true' || 
                    window.location.search.includes('testMode=true') ||
                    localStorage.getItem('test_mode') === 'true';

  if (isTestMode) {
    return <TestAuthProvider>{children}</TestAuthProvider>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}