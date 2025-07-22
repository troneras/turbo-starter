import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserRoleBadgesProps {
  roles: string[];
  className?: string;
}

const roleColors = {
  admin: 'bg-red-100 text-red-800 hover:bg-red-200',
  editor: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  translator: 'bg-green-100 text-green-800 hover:bg-green-200',
  viewer: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  user: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
} as const;

const getDefaultColor = () => 'bg-orange-100 text-orange-800 hover:bg-orange-200';

export function UserRoleBadges({ roles, className }: UserRoleBadgesProps) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {roles.map((role, index) => (
        <Badge
          key={`${role}-${index}`}
          variant="secondary"
          className={cn(
            'text-xs font-medium',
            roleColors[role as keyof typeof roleColors] || getDefaultColor()
          )}
        >
          {role}
        </Badge>
      ))}
    </div>
  );
}