import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

export function UserAvatar({ name, className, size = 'md' }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <Avatar className={cn(sizeStyles[size], className)}>
      <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}