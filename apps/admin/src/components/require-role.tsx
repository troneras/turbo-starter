import type { ReactNode } from 'react';
import { useAuth } from '../app/hooks/use-auth';

interface RequireRoleProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { hasRole } = useAuth();

  const hasRequiredRole = roles.some(role => hasRole(role));

  return hasRequiredRole ? <>{children}</> : <>{fallback}</>;
}