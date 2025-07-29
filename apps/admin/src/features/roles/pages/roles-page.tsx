import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { RolesSearchBar } from '../components/roles-search-bar';
import { RolesBulkActions } from '../components/roles-bulk-actions';
import { RolesTable } from '../components/roles-table';
import { RoleFormDialog } from '../components/role-form-dialog';
import { DeleteRoleDialog } from '../components/delete-role-dialog';
import { BulkDeleteRolesDialog } from '../components/bulk-delete-roles-dialog';
import { useRoles } from '../hooks/use-roles';
import { useRoleSelection } from '../hooks/use-role-selection';
import type { 
  RoleFilters, 
  RoleSort, 
  RoleSortField, 
  SortDirection, 
  RoleTableRow 
} from '../types';

export function RolesPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/roles' });

  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<RoleFilters>({
    search: searchParams?.search || '',
    hasPermission: searchParams?.hasPermission || undefined,
    parentRole: searchParams?.parentRole || undefined,
  });

  const [sort, setSort] = useState<RoleSort>({
    field: 'name',
    direction: 'asc',
  });

  const [page, setPage] = useState(searchParams?.page || 1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleTableRow | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleTableRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Data fetching
  const { data, isLoading, error } = useRoles({
    filters,
    sort,
    page,
    pageSize: 20,
  });

  // Convert API data to table format
  const roles: RoleTableRow[] = data?.roles?.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description || null,
    permissions: role.permissions,
    permissionCount: role.permissions.length,
    userCount: role.userCount || 0,
    parentRole: null, // Will be populated when API supports role hierarchy
    createdAt: role.created_at || new Date().toISOString(),
    updatedAt: role.updated_at || new Date().toISOString(),
  })) || [];

  // Role selection management
  const { 
    selection, 
    toggleRole, 
    toggleAll, 
    clearSelection 
  } = useRoleSelection({
    totalRoles: roles.length,
  });

  // Sync URL with state - debounce to prevent excessive navigation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.hasPermission) params.hasPermission = filters.hasPermission;
      if (filters.parentRole) params.parentRole = filters.parentRole;
      if (page > 1) params.page = page;

      // Only navigate if params actually changed
      const currentSearch = searchParams?.search || '';
      const currentHasPermission = searchParams?.hasPermission || '';
      const currentParentRole = searchParams?.parentRole || '';
      const currentPage = searchParams?.page || 1;
      
      if (filters.search !== currentSearch || 
          filters.hasPermission !== currentHasPermission ||
          filters.parentRole !== currentParentRole ||
          page !== currentPage) {
        navigate({
          to: '/roles',
          search: params,
          replace: true,
        });
      }
    }, 100); // Small debounce to prevent rapid navigation

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.hasPermission, filters.parentRole, page]);

  const handleFiltersChange = (newFilters: RoleFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    clearSelection();
  };

  const handleSortChange = (field: RoleSortField, direction: SortDirection) => {
    setSort({ field, direction });
    clearSelection();
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormDialogOpen(true);
  };

  const handleEditRole = (role: RoleTableRow) => {
    setEditingRole(role);
    setFormDialogOpen(true);
  };

  const handleDeleteRole = (role: RoleTableRow) => {
    setDeletingRole(role);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteComplete = () => {
    clearSelection();
  };

  const getSelectedRoles = (): RoleTableRow[] => {
    return roles.filter(role => selection.selectedRoles.has(role.id));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Roles</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load roles'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions
          </p>
        </div>
        <RequireRole roles={['admin']} fallback={<div />}>
          <Button onClick={handleCreateRole} className="md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </RequireRole>
      </div>

      {/* Search and Filters */}
      <RolesSearchBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <RolesBulkActions
          selection={selection}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
        />
      </RequireRole>

      {/* Roles Table */}
      <RolesTable
        roles={roles}
        selection={selection}
        sort={sort}
        loading={isLoading}
        onToggleRole={toggleRole}
        onToggleAll={toggleAll}
        onSortChange={handleSortChange}
        onEditRole={handleEditRole}
        onDeleteRole={handleDeleteRole}
      />

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} roles
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Role Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <RoleFormDialog
          role={editingRole}
          open={formDialogOpen}
          onOpenChange={(open) => {
            setFormDialogOpen(open);
            if (!open) setEditingRole(null);
          }}
        />
      </RequireRole>

      {/* Delete Role Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <DeleteRoleDialog
          role={deletingRole}
          open={!!deletingRole}
          onOpenChange={(open) => {
            if (!open) setDeletingRole(null);
          }}
        />
      </RequireRole>

      {/* Bulk Delete Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <BulkDeleteRolesDialog
          roles={getSelectedRoles()}
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onComplete={handleBulkDeleteComplete}
        />
      </RequireRole>
    </div>
  );
}