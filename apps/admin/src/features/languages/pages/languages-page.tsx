import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { RequireRole } from '@/components/require-role';
import { LanguagesSearchBar } from '../components/languages-search-bar';
import { LanguagesBulkActions } from '../components/languages-bulk-actions';
import { LanguagesTable } from '../components/languages-table';
import { LanguageFormDialog } from '../components/language-form-dialog';
import { DeleteLanguageDialog } from '../components/delete-language-dialog';
import { BulkDeleteLanguagesDialog } from '../components/bulk-delete-languages-dialog';
import { useLanguages } from '../hooks/use-languages';
import { useLanguageSelection } from '../hooks/use-language-selection';
import type { 
  LanguageFilters, 
  LanguageSort, 
  LanguageSortField, 
  SortDirection, 
  LanguageTableRow 
} from '../types';

export function LanguagesPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/languages' }) as any;

  // State for filters, sorting, and pagination
  const [filters, setFilters] = useState<LanguageFilters>({
    search: searchParams?.search || '',
  });

  const [sort, setSort] = useState<LanguageSort>({
    field: 'name',
    direction: 'asc',
  });

  const [page, setPage] = useState(1);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<LanguageTableRow | null>(null);
  const [deletingLanguage, setDeletingLanguage] = useState<LanguageTableRow | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Data fetching
  const { data, isLoading, error } = useLanguages({
    filters,
    sort,
    page,
    pageSize: 20,
  });

  // Convert API data to table format
  const languages: LanguageTableRow[] = data?.languages?.map(language => ({
    id: language.id,
    code: language.code,
    name: language.name,
  })) || [];

  // Language selection management
  const { 
    selection, 
    toggleLanguage, 
    toggleAll, 
    clearSelection 
  } = useLanguageSelection({
    totalLanguages: languages.length,
  });

  // Sync URL with state
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (page > 1) params.page = page.toString();

    navigate({
      to: '/languages',
      search: params,
      replace: true,
    });
  }, [filters, page, navigate]);

  const handleFiltersChange = (newFilters: LanguageFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
    clearSelection();
  };

  const handleSortChange = (field: LanguageSortField, direction: SortDirection) => {
    setSort({ field, direction });
    clearSelection();
  };

  const handleCreateLanguage = () => {
    setEditingLanguage(null);
    setFormDialogOpen(true);
  };

  const handleEditLanguage = (language: LanguageTableRow) => {
    setEditingLanguage(language);
    setFormDialogOpen(true);
  };

  const handleDeleteLanguage = (language: LanguageTableRow) => {
    setDeletingLanguage(language);
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteComplete = () => {
    clearSelection();
  };

  const getSelectedLanguages = (): LanguageTableRow[] => {
    return languages.filter(language => selection.selectedLanguages.has(language.id));
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Languages</h1>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Failed to load languages'}
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
          <h1 className="text-3xl font-bold tracking-tight">Languages</h1>
          <p className="text-muted-foreground">
            Manage available languages for content translation
          </p>
        </div>
        <RequireRole roles={['admin']} fallback={<div />}>
          <Button onClick={handleCreateLanguage} className="md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Language
          </Button>
        </RequireRole>
      </div>

      {/* Search and Filters */}
      <LanguagesSearchBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Bulk Actions */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <LanguagesBulkActions
          selection={selection}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
        />
      </RequireRole>

      {/* Languages Table */}
      <LanguagesTable
        languages={languages}
        selection={selection}
        sort={sort}
        loading={isLoading}
        onToggleLanguage={toggleLanguage}
        onToggleAll={toggleAll}
        onSortChange={handleSortChange}
        onEditLanguage={handleEditLanguage}
        onDeleteLanguage={handleDeleteLanguage}
      />

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total} languages
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

      {/* Create/Edit Language Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <LanguageFormDialog
          language={editingLanguage}
          open={formDialogOpen}
          onOpenChange={(open) => {
            setFormDialogOpen(open);
            if (!open) setEditingLanguage(null);
          }}
        />
      </RequireRole>

      {/* Delete Language Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <DeleteLanguageDialog
          language={deletingLanguage}
          open={!!deletingLanguage}
          onOpenChange={(open) => {
            if (!open) setDeletingLanguage(null);
          }}
        />
      </RequireRole>

      {/* Bulk Delete Dialog */}
      <RequireRole roles={['admin']} fallback={<div />}>
        <BulkDeleteLanguagesDialog
          languages={getSelectedLanguages()}
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          onComplete={handleBulkDeleteComplete}
        />
      </RequireRole>
    </div>
  );
}