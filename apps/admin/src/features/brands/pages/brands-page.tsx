import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/app/hooks/use-auth';
import { BrandsTable } from '../components/brands-table';
import { BrandsSearchBar } from '../components/brands-search-bar';
import { BrandsBulkActions } from '../components/brands-bulk-actions';
import { BrandFormDialog } from '../components/brand-form-dialog';
import { DeleteBrandDialog } from '../components/delete-brand-dialog';
import { BulkDeleteBrandsDialog } from '../components/bulk-delete-brands-dialog';
import { useBrands, createBrand, updateBrand, deleteBrand } from '../hooks/use-brands';
import { useBrandSelection } from '../hooks/use-brand-selection';
import type { Brand, CreateBrandRequest } from '@cms/contracts/types/brands';
import type { BrandsFilters, BrandsSort } from '../types';

const ITEMS_PER_PAGE = 20;

export function BrandsPage() {
  const navigate = useNavigate({ from: '/brands' });
  const searchParams = useSearch({ from: '/brands' });
  const { hasRole } = useAuth();

  // State initialization from URL params
  const [filters, setFilters] = useState<BrandsFilters>({
    search: searchParams?.search || '',
  });
  const [sort, setSort] = useState<BrandsSort>({
    field: 'name',
    direction: 'asc',
  });
  const [page, setPage] = useState(searchParams?.page || 1);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = hasRole('admin');

  // Brand selection
  const {
    selectedBrands,
    toggleBrand,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isPartiallySelected,
  } = useBrandSelection();

  // Data fetching
  const { data, isLoading, error, refetch } = useBrands({
    filters,
    sort,
    page,
    pageSize: ITEMS_PER_PAGE,
  });

  // URL state synchronization
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (page > 1) params.page = page;

      const currentSearch = searchParams?.search || '';
      const currentPage = searchParams?.page || 1;
      
      if (filters.search !== currentSearch || page !== currentPage) {
        navigate({
          to: '/brands',
          search: params,
          replace: true,
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filters.search, page]);

  // Handlers
  const handleSearchChange = (search: string) => {
    setFilters({ search });
    setPage(1); // Reset to first page when searching
    clearSelection();
  };

  const handleSortChange = (newSort: BrandsSort) => {
    setSort(newSort);
    clearSelection();
  };

  const handleCreateBrand = async (data: CreateBrandRequest) => {
    setIsSubmitting(true);
    try {
      await createBrand(data);
      refetch();
      setIsCreateDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBrand = async (data: CreateBrandRequest) => {
    if (!editingBrand) return;
    
    setIsSubmitting(true);
    try {
      await updateBrand(editingBrand.id, data);
      refetch();
      setEditingBrand(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = async (brandId: number) => {
    setIsDeleting(true);
    try {
      await deleteBrand(brandId);
      refetch();
      clearSelection();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await Promise.all(selectedBrands.map(id => deleteBrand(id)));
      refetch();
      clearSelection();
    } finally {
      setIsDeleting(false);
    }
  };

  const brandIds = data?.brands.map(b => b.id) || [];
  const isAllCurrentPageSelected = isAllSelected(brandIds);
  const isPartiallyCurrentPageSelected = isPartiallySelected(brandIds);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Brands</h1>
          <p className="text-muted-foreground">
            Failed to load brands. Please try again.
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground">
            Manage content brands and their configurations.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Button>
        )}
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-80">
          <BrandsSearchBar
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
        
        {isAdmin && (
          <BrandsBulkActions
            selectedCount={selectedBrands.length}
            onDelete={() => setIsBulkDeleteOpen(true)}
            onClearSelection={clearSelection}
          />
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="text-muted-foreground">Loading brands...</div>
        </div>
      )}

      {/* Table */}
      {!isLoading && data && (
        <BrandsTable
          brands={data.brands}
          sort={sort}
          onSortChange={handleSortChange}
          selectedBrands={selectedBrands}
          onSelectBrand={toggleBrand}
          onSelectAll={toggleAll}
          isAllSelected={isAllCurrentPageSelected}
          isPartiallySelected={isPartiallyCurrentPageSelected}
          onEdit={setEditingBrand}
          onDelete={setDeletingBrand}
        />
      )}

      {/* Pagination */}
      {!isLoading && data && data.totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= data.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <BrandFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateBrand}
        isSubmitting={isSubmitting}
      />

      {/* Edit Dialog */}
      <BrandFormDialog
        open={!!editingBrand}
        onOpenChange={(open) => !open && setEditingBrand(null)}
        brand={editingBrand}
        onSubmit={handleUpdateBrand}
        isSubmitting={isSubmitting}
      />

      {/* Delete Dialog */}
      <DeleteBrandDialog
        open={!!deletingBrand}
        onOpenChange={(open) => !open && setDeletingBrand(null)}
        brand={deletingBrand}
        onConfirm={handleDeleteBrand}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Dialog */}
      <BulkDeleteBrandsDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        brandCount={selectedBrands.length}
        onConfirm={handleBulkDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}