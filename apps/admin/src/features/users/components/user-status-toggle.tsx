import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useUpdateUserStatus } from '../hooks/use-users';
import { cn } from '@/lib/utils';

interface UserStatusToggleProps {
  userId: string;
  status: 'active' | 'inactive';
  disabled?: boolean;
  showBadge?: boolean;
  className?: string;
}

export function UserStatusToggle({ 
  userId, 
  status, 
  disabled = false,
  showBadge = false,
  className 
}: UserStatusToggleProps) {
  const updateStatus = useUpdateUserStatus();

  const handleToggle = async (checked: boolean) => {
    if (disabled) return;

    try {
      await updateStatus.mutateAsync({
        userId,
        status: checked ? 'active' : 'inactive'
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  if (showBadge) {
    return (
      <Badge
        variant={status === 'active' ? 'default' : 'secondary'}
        className={cn(
          status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600',
          className
        )}
      >
        {status}
      </Badge>
    );
  }

  return (
    <Switch
      checked={status === 'active'}
      onCheckedChange={handleToggle}
      disabled={disabled || updateStatus.isPending}
      className={className}
      aria-label={`Toggle user status (currently ${status})`}
    />
  );
}