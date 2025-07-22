import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { UsersSearchBar } from '../components/users-search-bar';
import { UsersBulkActions } from '../components/users-bulk-actions';
import { UsersTable } from '../components/users-table';
import { UserEditSheet } from '../components/user-edit-sheet';
import { useUsers } from '../hooks/use-users';
import { useUserSelection } from '../hooks/use-user-selection';
import type { UserFilters, UserSort, SortField, SortDirection, UserTableRow } from '../types';

export function UsersPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/users' }) as any;

  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<UserFilters>({
    search: searchParams?.search || '',
    role: searchParams?.role || undefined,
    status: searchParams?.status || undefined,
  });

  const [sort, setSort] = useState<UserSort>({
    field: 'name',
    direction: 'asc',
  });

  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserTableRow | null>(null);

  // Data fetching
  const { data, isLoading, error } = useUsers({
    filters,
    sort,
    page,
    pageSize: 25,
  });

  // Convert API data to table format
  const users: UserTableRow[] = data?.users?.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    status: user.status || 'active',
    lastLoginAt: user.last_login_at,
    createdAt: user.createdAt,
  })) || [];

  // User selection management
  const { 
    selection, 
    toggleUser, 
    toggleAll, 
    clearSelection 
  } = useUserSelection({
    totalUsers: users.length,
  });

  // Sync URL with state
  useEffect(() => {
    const searchParams = new URLSearchParams();
    if (filters.search) searchParams.set('search', filters.search);
    if (filters.role) searchParams.set('role', filters.role);
    if (filters.status) searchParams.set('status', filters.status);
    if (page > 1) searchParams.set('page', page.toString());

    const newSearch = searchParams.toString();
    navigate({
      to: '/users',
      search: newSearch ? `?${newSearch}` : undefined,
      replace: true,
    });
  }, [filters, page, navigate]);

  const handleFiltersChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    clearSelection();
  };

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSort({ field, direction });
    clearSelection();
  };

  const handleEditUser = (user: UserTableRow) => {
    setEditingUser(user);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Users</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load users'}
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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user access and permissions
          </p>
        </div>
        <Button className="md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Search and Filters */}
      <UsersSearchBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      <UsersBulkActions
        selection={selection}
        onClearSelection={clearSelection}
      />

      {/* Users Table */}
      <UsersTable
        users={users}
        selection={selection}
        sort={sort}
        loading={isLoading}
        onToggleUser={toggleUser}
        onToggleAll={toggleAll}
        onSortChange={handleSortChange}
        onEditUser={handleEditUser}
      />

      {/* Pagination */}
      {data && data.total > 25 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 25) + 1} to {Math.min(page * 25, data.total)} of {data.total} users
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
              disabled={page * 25 >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit User Sheet */}
      <UserEditSheet
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      />
    </div>
  );
}