import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useAuth } from '../hooks/use-auth';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold">Checking authentication...</h2>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}