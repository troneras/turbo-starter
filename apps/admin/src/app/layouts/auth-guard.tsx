import type { ReactNode } from 'react';
import { useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useAuth } from '../hooks/use-auth';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleUnauthenticated = useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login', replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    handleUnauthenticated();
  }, [handleUnauthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold">Checking authentication...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold">Redirecting to login...</h2>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}