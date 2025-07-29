import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Shield, 
  Users, 
  FileText, 
  Settings,
  Globe,
  Database,
  Lock,
  Eye
} from 'lucide-react';
import type { Permission, PermissionGroup } from '../types';

interface PermissionSelectorProps {
  permissions: Permission[];
  selectedPermissions: number[];
  onPermissionChange: (permissionIds: number[]) => void;
  disabled?: boolean;
}

export function PermissionSelector({
  permissions,
  selectedPermissions,
  onPermissionChange,
  disabled = false,
}: PermissionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Helper functions - defined before use to avoid temporal dead zone
  const formatResourceName = (resource: string): string => {
    return resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, ' ');
  };

  const formatActionName = (action: string): string => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, ' ');
  };

  const getResourceIcon = (resource: string) => {
    const iconMap: Record<string, React.ElementType> = {
      users: Users,
      roles: Shield,
      content: FileText,
      translations: Globe,
      brands: Database,
      settings: Settings,
      system: Lock,
      audit: Eye,
    };
    
    const IconComponent = iconMap[resource] || Shield;
    return <IconComponent className="h-4 w-4" />;
  };

  const getActionBadgeVariant = (action: string) => {
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      read: 'outline',
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      manage: 'default',
    };
    
    return variantMap[action] || 'outline';
  };

  // Group permissions by resource
  const permissionGroups: PermissionGroup[] = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    
    permissions.forEach(permission => {
      if (!groups.has(permission.resource)) {
        groups.set(permission.resource, []);
      }
      groups.get(permission.resource)!.push(permission);
    });

    return Array.from(groups.entries()).map(([resource, perms]) => ({
      resource,
      label: formatResourceName(resource),
      permissions: perms.sort((a, b) => a.action.localeCompare(b.action)),
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [permissions]);

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return permissionGroups;
    }

    const query = searchQuery.toLowerCase();
    return permissionGroups.map(group => ({
      ...group,
      permissions: group.permissions.filter(permission =>
        permission.name.toLowerCase().includes(query) ||
        permission.description?.toLowerCase().includes(query) ||
        permission.resource.toLowerCase().includes(query) ||
        permission.action.toLowerCase().includes(query)
      ),
    })).filter(group => group.permissions.length > 0);
  }, [permissionGroups, searchQuery]);

  const toggleGroup = (resource: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedGroups(newExpanded);
  };

  const togglePermission = (permissionId: number) => {
    const newSelected = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(id => id !== permissionId)
      : [...selectedPermissions, permissionId];
    
    onPermissionChange(newSelected);
  };

  const toggleGroupPermissions = (groupPermissions: Permission[]) => {
    const groupPermissionIds = groupPermissions.map(p => p.id);
    const allSelected = groupPermissionIds.every(id => selectedPermissions.includes(id));
    
    if (allSelected) {
      // Deselect all permissions in this group
      const newSelected = selectedPermissions.filter(id => !groupPermissionIds.includes(id));
      onPermissionChange(newSelected);
    } else {
      // Select all permissions in this group
      const newSelected = Array.from(new Set([...selectedPermissions, ...groupPermissionIds]));
      onPermissionChange(newSelected);
    }
  };

  const selectAllPermissions = () => {
    const allPermissionIds = filteredGroups.flatMap(group => group.permissions.map(p => p.id));
    onPermissionChange(allPermissionIds);
  };

  const clearAllPermissions = () => {
    onPermissionChange([]);
  };

  if (permissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Permissions Available</h3>
          <p className="text-muted-foreground">
            No permissions are currently defined in the system.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Bulk Actions */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={disabled}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAllPermissions}
            disabled={disabled}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearAllPermissions}
            disabled={disabled}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Permission Groups */}
      <div className="space-y-3">
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.resource);
          const groupPermissionIds = group.permissions.map(p => p.id);
          const selectedInGroup = groupPermissionIds.filter(id => selectedPermissions.includes(id));
          const allSelected = selectedInGroup.length === groupPermissionIds.length;
          const someSelected = selectedInGroup.length > 0 && selectedInGroup.length < groupPermissionIds.length;

          return (
            <Card key={group.resource}>
              <CardHeader 
                className="pb-3 cursor-pointer hover:bg-muted/25 transition-colors"
                onClick={() => toggleGroup(group.resource)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getResourceIcon(group.resource)}
                      <span>{group.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
                    </Badge>
                    {selectedInGroup.length > 0 && (
                      <Badge variant="default" className="text-xs">
                        {selectedInGroup.length} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onCheckedChange={() => toggleGroupPermissions(group.permissions)}
                      onClick={(e) => e.stopPropagation()}
                      disabled={disabled}
                      aria-label={`Select all ${group.label} permissions`}
                    />
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {group.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-muted/25 transition-colors"
                      >
                        <Checkbox
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                          disabled={disabled}
                          aria-label={`Select ${permission.name}`}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">{permission.name}</span>
                            <Badge 
                              variant={getActionBadgeVariant(permission.action)}
                              className="text-xs"
                            >
                              {formatActionName(permission.action)}
                            </Badge>
                          </div>
                          {permission.description && (
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredGroups.length === 0 && searchQuery.trim() && (
        <Card>
          <CardContent className="p-6 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Permissions Found</h3>
            <p className="text-muted-foreground">
              No permissions match your search query "{searchQuery}".
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4"
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}