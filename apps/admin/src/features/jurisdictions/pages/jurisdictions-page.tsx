import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { JurisdictionsSearchBar } from '../components/jurisdictions-search-bar';
import { JurisdictionsBulkActions } from '../components/jurisdictions-bulk-actions';
import { JurisdictionsTable } from '../components/jurisdictions-table';
import { JurisdictionFormDialog } from '../components/jurisdiction-form-dialog';
import { DeleteJurisdictionDialog } from '../components/delete-jurisdiction-dialog';
import { BulkDeleteJurisdictionsDialog } from '../components/bulk-delete-jurisdictions-dialog';
import { useJurisdictions } from '../hooks/use-jurisdictions';
import { useJurisdictionSelection } from '../hooks/use-jurisdiction-selection';
import type { 
  JurisdictionFilters, 
  JurisdictionSort, 
  JurisdictionSortField, 
  SortDirection, 
  JurisdictionTableRow 
} from '../types';

export function JurisdictionsPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/jurisdictions' });

  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<JurisdictionFilters>({
    search: searchParams?.search || '',
    status: searchParams?.status as 'active' | 'inactive' | undefined,
    region: searchParams?.region || '',
  });

  const [sort, setSort] = useState<JurisdictionSort>({
    field: 'name',
    direction: 'asc',
  });

  const [page, setPage] = useState(searchParams?.page || 1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState<JurisdictionTableRow | null>(null);
  const [deletingJurisdiction, setDeletingJurisdiction] = useState<JurisdictionTableRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Data fetching
  const { data, isLoading, error } = useJurisdictions({
    filters,
    sort,
    page,
    pageSize: 20,
  });

  // Convert API data to table format
  const jurisdictions: JurisdictionTableRow[] = data?.jurisdictions?.map(jurisdiction => ({
    id: jurisdiction.id,
    code: jurisdiction.code,
    name: jurisdiction.name,
    description: jurisdiction.description,
    status: jurisdiction.status as 'active' | 'inactive',
    region: jurisdiction.region,
  })) || [];

  // Jurisdiction selection management
  const { 
    selection, 
    toggleJurisdiction, 
    toggleAll, 
    clearSelection 
  } = useJurisdictionSelection({
    totalJurisdictions: jurisdictions.length,
  });

  // Sync URL with state - debounce to prevent excessive navigation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.region) params.region = filters.region;
      if (page > 1) params.page = page;

      // Only navigate if params actually changed
      const currentSearch = searchParams?.search || '';
      const currentStatus = searchParams?.status || '';
      const currentRegion = searchParams?.region || '';
      const currentPage = searchParams?.page || 1;
      
      if (filters.search !== currentSearch || 
          filters.status !== currentStatus || 
          filters.region !== currentRegion || 
          page !== currentPage) {
        navigate({
          to: '/jurisdictions',
          search: params,
          replace: true,
        });
      }
    }, 100); // Small debounce to prevent rapid navigation

    return () => clearTimeout(timeoutId);
  }, [filters.search, filters.status, filters.region, page]); // Remove navigate from dependencies

  const handleFiltersChange = (newFilters: JurisdictionFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    clearSelection();
  };

  const handleSortChange = (field: JurisdictionSortField, direction: SortDirection) => {
    setSort({ field, direction });
    clearSelection();
  };

  const handleCreateJurisdiction = () => {
    setEditingJurisdiction(null);
    setFormDialogOpen(true);
  };

  const handleEditJurisdiction = (jurisdiction: JurisdictionTableRow) => {
    setEditingJurisdiction(jurisdiction);
    setFormDialogOpen(true);
  };

  const handleDeleteJurisdiction = (jurisdiction: JurisdictionTableRow) => {
    setDeletingJurisdiction(jurisdiction);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteComplete = () => {
    clearSelection();
  };

  const getSelectedJurisdictions = (): JurisdictionTableRow[] => {
    return jurisdictions.filter(jurisdiction => selection.selectedJurisdictions.has(jurisdiction.id));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Jurisdictions</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load jurisdictions'}
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
          <h1 className="text-3xl font-bold tracking-tight">Jurisdictions</h1>
          <p className="text-muted-foreground">
            Manage regulatory jurisdictions and regions for content compliance
          </p>
        </div>
        <RequireRole roles={['admin']} fallback={<div />}>
          <Button onClick={handleCreateJurisdiction} className="md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Jurisdiction
          </Button>
        </RequireRole>
      </div>

      {/* Search and Filters */}
      <JurisdictionsSearchBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <JurisdictionsBulkActions
          selection={selection}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
        />
      </RequireRole>

      {/* Jurisdictions Table */}
      <JurisdictionsTable
        jurisdictions={jurisdictions}
        selection={selection}
        sort={sort}
        loading={isLoading}
        onToggleJurisdiction={toggleJurisdiction}
        onToggleAll={toggleAll}
        onSortChange={handleSortChange}
        onEditJurisdiction={handleEditJurisdiction}
        onDeleteJurisdiction={handleDeleteJurisdiction}
      />

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} jurisdictions
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

      {/* Create/Edit Jurisdiction Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <JurisdictionFormDialog
          jurisdiction={editingJurisdiction}
          open={formDialogOpen}
          onOpenChange={(open) => {
            setFormDialogOpen(open);
            if (!open) setEditingJurisdiction(null);
          }}
        />
      </RequireRole>

      {/* Delete Jurisdiction Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <DeleteJurisdictionDialog
          jurisdiction={deletingJurisdiction}
          open={!!deletingJurisdiction}
          onOpenChange={(open) => {
            if (!open) setDeletingJurisdiction(null);
          }}
        />
      </RequireRole>

      {/* Bulk Delete Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <BulkDeleteJurisdictionsDialog
          jurisdictions={getSelectedJurisdictions()}
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onComplete={handleBulkDeleteComplete}
        />
      </RequireRole>
    </div>
  );
}