import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit2 } from 'lucide-react';
import { UserAvatar } from './user-avatar';
import { UserRoleBadges } from './user-role-badges';
import { UserStatusToggle } from './user-status-toggle';
import type { UserTableRow, UserSelection, UserSort, SortField, SortDirection } from '../types';

interface UsersTableProps {
  users: UserTableRow[];
  selection: UserSelection;
  sort: UserSort;
  loading?: boolean;
  onToggleUser: (userId: string) => void;
  onToggleAll: (userIds: string[]) => void;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  onEditUser: (user: UserTableRow) => void;
}

export function UsersTable({
  users,
  selection,
  sort,
  loading = false,
  onToggleUser,
  onToggleAll,
  onSortChange,
  onEditUser,
}: UsersTableProps) {
  const userIds = users.map(user => user.id);

  const getSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const handleSort = (field: SortField) => {
    const newDirection: SortDirection = 
      sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newDirection);
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never';
    
    const date = new Date(lastLoginAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center text-muted-foreground">
          Loading users...
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center text-muted-foreground">
          No users found
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 w-12">
                <Checkbox
                  checked={selection.isAllSelected}
                  ref={(el) => {
                    if (el) {
                      const checkbox = el as unknown as HTMLInputElement;
                      checkbox.indeterminate = selection.indeterminate;
                    }
                  }}
                  onCheckedChange={() => onToggleAll(userIds)}
                />
              </th>
              <th className="text-left p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              </th>
              <th className="text-left p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('email')}
                  className="h-auto p-0 font-medium"
                >
                  Email
                  {getSortIcon('email')}
                </Button>
              </th>
              <th className="text-left p-3">Roles</th>
              <th className="text-left p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('lastLoginAt')}
                  className="h-auto p-0 font-medium"
                >
                  Last Login
                  {getSortIcon('lastLoginAt')}
                </Button>
              </th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t hover:bg-muted/50">
                <td className="p-3">
                  <Checkbox
                    checked={selection.selectedUsers.has(user.id)}
                    onCheckedChange={() => onToggleUser(user.id)}
                  />
                </td>
                <td className="p-3">
                  <div className="flex items-center space-x-3">
                    <UserAvatar name={user.name} size="sm" />
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{user.email}</td>
                <td className="p-3">
                  <UserRoleBadges roles={user.roles} />
                </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {formatLastLogin(user.lastLoginAt)}
                </td>
                <td className="p-3">
                  <UserStatusToggle userId={user.id} status={user.status} />
                </td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUser(user)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Edit user</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {users.map((user) => (
          <div key={user.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selection.selectedUsers.has(user.id)}
                  onCheckedChange={() => onToggleUser(user.id)}
                />
                <UserAvatar name={user.name} />
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditUser(user)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Roles</p>
                <UserRoleBadges roles={user.roles} />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="text-sm">{formatLastLogin(user.lastLoginAt)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <UserStatusToggle userId={user.id} status={user.status} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}