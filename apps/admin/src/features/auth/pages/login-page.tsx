import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../../../components/ui/button';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { toast } from 'sonner';
import { useAuth } from '../../../app/hooks/use-auth';

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticatedRedirect = useCallback(() => {
    if (isAuthenticated && !isLoading) {
      navigate({ to: '/dashboard', replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    handleAuthenticatedRedirect();
  }, [handleAuthenticatedRedirect]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await login();
      toast.success('Welcome back!', {
        description: 'You have been successfully signed in.'
      });
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error?.message || 'Login failed. Please try again.';
      setError(errorMessage);
      toast.error('Sign in failed', {
        description: errorMessage
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mobile logo - only shown on small screens */}
      <div className="lg:hidden text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl mb-6 shadow-lg">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CMS Platform</h1>
      </div>

      <div className="space-y-8">
        <div className="text-center lg:text-left">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
            Welcome back
          </h2>
          <p className="mt-3 text-lg text-slate-600 leading-relaxed">
            Sign in to your account to continue
          </p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-5 py-4 rounded-2xl shadow-sm auth-error-pulse">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          <Button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-6 text-lg rounded-2xl auth-ripple auth-button-gradient"
          >
            {isLoggingIn ? (
              <div className="auth-shimmer">
                <LoadingSpinner size="sm" className="mr-3" />
                Signing in...
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
                </svg>
                Continue with Microsoft
              </>
            )}
          </Button>

          <div className="text-center pt-2">
            <p className="text-sm text-slate-500 leading-relaxed">
              By signing in, you agree to our{' '}
              <span className="text-slate-700 font-medium hover:text-blue-600 cursor-pointer transition-colors">
                Terms of Service
              </span>{' '}
              and{' '}
              <span className="text-slate-700 font-medium hover:text-blue-600 cursor-pointer transition-colors">
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}