import { Button } from './ui/button';
import { useAuth } from '../app/hooks/use-auth';

export function UserProfile() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-2">
      <div className="flex flex-col text-sm" data-testid="user-profile-button">
        <span className="font-medium">{user.name || user.username}</span>
        <span className="text-gray-500 text-xs" data-testid="user-email">{user.username}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={logout}
        data-testid="logout-button"
      >
        Sign out
      </Button>
    </div>
  );
}