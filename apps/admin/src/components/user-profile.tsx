import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAuth } from '../app/hooks/use-auth';

export function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully', {
        description: 'You have been logged out of your session.'
      });
    } catch (error) {
      toast.error('Sign out failed', {
        description: 'There was an error signing out. Please try again.'
      });
    }
  };

  return (
    <div className="flex items-center gap-3 p-2">
      <div className="flex flex-col text-sm" data-testid="user-profile-button">
        <span className="font-medium">{user.name || user.username}</span>
        <span className="text-gray-500 text-xs" data-testid="user-email">{user.username}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        data-testid="logout-button"
      >
        Sign out
      </Button>
    </div>
  );
}