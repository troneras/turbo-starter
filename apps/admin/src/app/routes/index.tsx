import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useCallback } from 'react'
import { LoadingSpinner } from '../../components/ui/loading-spinner'
import { useAuth } from '../hooks/use-auth'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleRedirect = useCallback(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate({ to: '/dashboard', replace: true });
      } else {
        navigate({ to: '/login', replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-semibold">Loading...</h2>
      </div>
    </div>
  )
}
