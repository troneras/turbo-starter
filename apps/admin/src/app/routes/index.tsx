import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LoadingSpinner } from '../../components/ui/loading-spinner'
import { useAuth } from '../hooks/use-auth'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' });
    } else {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-semibold">Loading...</h2>
      </div>
    </div>
  )
}
