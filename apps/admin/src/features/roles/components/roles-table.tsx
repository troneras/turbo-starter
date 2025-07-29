import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Trash2, 
  Users, 
  Shield,
  Eye
} from 'lucide-react';
import { useAuth } from '@/app/hooks/use-auth';
import type { 
  RoleTableRow, 
  RoleSelection, 
  RoleSort, 
  RoleSortField, 
  SortDirection 
} from '../types';

interface RolesTableProps {
  roles: RoleTableRow[];
  selection: RoleSelection;
  sort: RoleSort;
  loading?: boolean;
  onToggleRole: (roleId: number) => void;
  onToggleAll: (roleIds: number[]) => void;
  onSortChange: (field: RoleSortField, direction: SortDirection) => void;
  onEditRole: (role: RoleTableRow) => void;
  onDeleteRole: (role: RoleTableRow) => void;
}

export function RolesTable({
  roles,
  selection,
  sort,
  loading = false,
  onToggleRole,
  onToggleAll,
  onSortChange,
  onEditRole,
  onDeleteRole,
}: RolesTableProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const roleIds = roles.map(role => role.id);

  const getSortIcon = (field: RoleSortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const handleSort = (field: RoleSortField) => {
    const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, direction);
  };

  const formatPermissions = (permissions: any[], maxDisplay = 3) => {
    const displayPermissions = permissions.slice(0, maxDisplay);
    const remainingCount = permissions.length - maxDisplay;

    return (
      <div className="flex flex-wrap gap-1">
        {displayPermissions.map((permission) => (
          <Badge key={permission.id} variant="secondary" className="text-xs">
            {permission.name}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No roles found</h3>
          <p className="text-muted-foreground mb-4">
            No roles match your current filters.
          </p>
          {isAdmin && (
            <Button onClick={() => onEditRole(null as any)} variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Create First Role
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                {isAdmin && (
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={selection.isAllSelected}
                      onCheckedChange={() => onToggleAll(roleIds)}
                      ref={(input) => {
                        if (input) input.indeterminate = selection.indeterminate;
                      }}
                      aria-label="Select all roles"
                    />
                  </th>
                )}
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('name')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Role Name
                    {getSortIcon('name')}
                  </Button>
                </th>
                <th className="text-left p-4">
                  <span className="font-semibold">Permissions</span>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('permissionCount')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Count
                    {getSortIcon('permissionCount')}
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('userCount')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Users
                    {getSortIcon('userCount')}
                  </Button>
                </th>
                <th className="text-left p-4">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('updatedAt')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Last Updated
                    {getSortIcon('updatedAt')}
                  </Button>
                </th>
                <th className="w-24 p-4">
                  <span className="font-semibold">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr 
                  key={role.id} 
                  className="border-b hover:bg-muted/25 transition-colors"
                >
                  {isAdmin && (
                    <td className="p-4">
                      <Checkbox
                        checked={selection.selectedRoles.has(role.id)}
                        onCheckedChange={() => onToggleRole(role.id)}
                        aria-label={`Select ${role.name}`}
                      />
                    </td>
                  )}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="font-medium">{role.name}</div>
                      {role.description && (
                        <div className="text-sm text-muted-foreground">
                          {role.description}
                        </div>
                      )}
                      {role.parentRole && (
                        <div className="text-xs text-muted-foreground">
                          Inherits from: {role.parentRole}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {formatPermissions(role.permissions)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{role.permissionCount}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{role.userCount}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-muted-foreground">
                      {new Date(role.updatedAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRole(role)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View {role.name}</span>
                      </Button>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRole(role)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit {role.name}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteRole(role)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {role.name}</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isAdmin && roles.length > 0 && (
          <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/25">
            <Checkbox
              checked={selection.isAllSelected}
              onCheckedChange={() => onToggleAll(roleIds)}
              ref={(input) => {
                if (input) input.indeterminate = selection.indeterminate;
              }}
              aria-label="Select all roles"
            />
            <span className="text-sm font-medium">
              {selection.selectedRoles.size > 0 
                ? `${selection.selectedRoles.size} selected`
                : 'Select all roles'
              }
            </span>
          </div>
        )}
        
        {roles.map((role) => (
          <Card key={role.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 flex-1">
                  {isAdmin && (
                    <Checkbox
                      checked={selection.selectedRoles.has(role.id)}
                      onCheckedChange={() => onToggleRole(role.id)}
                      aria-label={`Select ${role.name}`}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base mb-1">{role.name}</div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {role.description}
                      </p>
                    )}
                    {role.parentRole && (
                      <p className="text-xs text-muted-foreground mb-2">
                        Inherits from: {role.parentRole}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditRole(role)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRole(role)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteRole(role)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2">Permissions</div>
                  {formatPermissions(role.permissions, 2)}
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Shield className="h-4 w-4" />
                      <span>{role.permissionCount} permissions</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{role.userCount} users</span>
                    </div>
                  </div>
                  <div>
                    Updated {new Date(role.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}