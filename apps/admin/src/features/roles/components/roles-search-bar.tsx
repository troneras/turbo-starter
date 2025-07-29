import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { usePermissions } from '../hooks/use-roles';
import type { RoleFilters } from '../types';

interface RolesSearchBarProps {
  filters: RoleFilters;
  onFiltersChange: (filters: RoleFilters) => void;
}

export function RolesSearchBar({ filters, onFiltersChange }: RolesSearchBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const { data: permissions } = usePermissions();

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchValue || undefined,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  // Update local search when external filters change
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  const handlePermissionFilterChange = (permission: string | undefined) => {
    onFiltersChange({
      ...filters,
      hasPermission: permission,
    });
  };

  const handleParentRoleFilterChange = (parentRole: string | undefined) => {
    onFiltersChange({
      ...filters,
      parentRole: parentRole,
    });
  };

  const clearFilters = () => {
    setSearchValue('');
    onFiltersChange({
      search: undefined,
      hasPermission: undefined,
      parentRole: undefined,
    });
    setFiltersOpen(false);
  };

  const hasActiveFilters = !!(filters.search || filters.hasPermission || filters.parentRole);
  const activeFilterCount = [filters.search, filters.hasPermission, filters.parentRole]
    .filter(Boolean).length;

  // Get unique permission resources for filtering
  const permissionResources = Array.from(
    new Set(permissions?.map(p => p.resource) || [])
  ).sort();

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search roles by name or description..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          {/* Permission Filter */}
          <Select
            value={filters.hasPermission || ''}
            onValueChange={(value) => 
              handlePermissionFilterChange(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Any permission" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any permission</SelectItem>
              {permissionResources.map((resource) => (
                <SelectItem key={resource} value={resource}>
                  {resource} permissions
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Parent Role Filter */}
          <Select
            value={filters.parentRole || ''}
            onValueChange={(value) => 
              handleParentRoleFilterChange(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Any parent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any parent</SelectItem>
              <SelectItem value="none">No parent</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button (visible when filters are active) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 md:hidden">
          {filters.search && (
            <Badge variant="secondary" className="text-xs">
              Search: {filters.search}
              <button
                onClick={() => {
                  setSearchValue('');
                  onFiltersChange({ ...filters, search: undefined });
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.hasPermission && (
            <Badge variant="secondary" className="text-xs">
              Permission: {filters.hasPermission}
              <button
                onClick={() => handlePermissionFilterChange(undefined)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.parentRole && (
            <Badge variant="secondary" className="text-xs">
              Parent: {filters.parentRole}
              <button
                onClick={() => handleParentRoleFilterChange(undefined)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}