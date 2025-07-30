import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, Filter, Plus, FileDown, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslationKeys, useTranslations } from '../hooks/use-translations';
import { useAuth } from '@/app/hooks/use-auth';
import type { TranslationKey } from '@cms/contracts/types/translations';

interface TranslationKeyWithStats extends TranslationKey {
  totalVariants: number;
  approvedVariants: number;
  pendingVariants: number;
  draftVariants: number;
  localeCount: number;
  completionPercentage: number;
}

const statusColors = {
  'APPROVED': 'bg-green-100 text-green-800 border-green-200',
  'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

export function TranslationsPage() {
  const { hasPermission } = useAuth();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch data
  const { data: keysData, isLoading: keysLoading } = useTranslationKeys();
  const { data: variantsData, isLoading: variantsLoading } = useTranslations();

  // Process data to include statistics
  const tableData = useMemo<TranslationKeyWithStats[]>(() => {
    if (!keysData?.keys || !variantsData?.translations) return [];

    return keysData.keys.map(key => {
      const variants = variantsData.translations.filter(v => v.keyId === key.id);
      const approvedVariants = variants.filter(v => v.status === 'APPROVED').length;
      const pendingVariants = variants.filter(v => v.status === 'PENDING').length;
      const draftVariants = variants.filter(v => v.status === 'DRAFT').length;
      const localeCount = new Set(variants.map(v => v.locale)).size;
      const totalVariants = variants.length;

      return {
        ...key,
        totalVariants,
        approvedVariants,
        pendingVariants,
        draftVariants,
        localeCount,
        completionPercentage: totalVariants > 0 ? Math.round((approvedVariants / totalVariants) * 100) : 0,
      };
    });
  }, [keysData?.keys, variantsData?.translations]);

  // Filter data based on status
  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return tableData;

    return tableData.filter(key => {
      switch (statusFilter) {
        case 'complete':
          return key.completionPercentage === 100;
        case 'incomplete':
          return key.completionPercentage < 100;
        case 'empty':
          return key.totalVariants === 0;
        default:
          return true;
      }
    });
  }, [tableData, statusFilter]);

  // Define columns
  const columns = useMemo<ColumnDef<TranslationKeyWithStats>[]>(() => [
    {
      accessorKey: 'fullKey',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Translation Key
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.getValue('fullKey')}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-96 truncate text-sm text-muted-foreground">
          {row.getValue('description') || 'No description'}
        </div>
      ),
    },
    {
      accessorKey: 'totalVariants',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Variants
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue('totalVariants')}
        </div>
      ),
    },
    {
      accessorKey: 'localeCount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Locales
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue('localeCount')}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status Distribution',
      cell: ({ row }) => {
        const { approvedVariants, pendingVariants, draftVariants } = row.original;
        return (
          <div className="flex gap-1">
            {approvedVariants > 0 && (
              <Badge variant="outline" className={statusColors.APPROVED}>
                {approvedVariants} Approved
              </Badge>
            )}
            {pendingVariants > 0 && (
              <Badge variant="outline" className={statusColors.PENDING}>
                {pendingVariants} Pending
              </Badge>
            )}
            {draftVariants > 0 && (
              <Badge variant="outline" className={statusColors.DRAFT}>
                {draftVariants} Draft
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'completionPercentage',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Completion
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const percentage = row.getValue('completionPercentage') as number;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${percentage === 100 ? 'bg-green-500' :
                    percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                  }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm font-medium">{percentage}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-medium"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {new Date(row.getValue('createdAt')).toLocaleDateString()}
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  const canCreate = hasPermission('translations:create');

  if (keysLoading || variantsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Translations</h1>
          <p className="text-muted-foreground">
            Overview of all translation keys and their completion status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Export
          </Button>
          {canCreate && (
            <Button size="sm" asChild>
              <a href="/keys">
                <Plus className="mr-2 h-4 w-4" />
                Manage Keys
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tableData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tableData.reduce((sum, key) => sum + key.totalVariants, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tableData.reduce((sum, key) => sum + key.approvedVariants, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {tableData.reduce((sum, key) => sum + key.pendingVariants, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Translation Keys</CardTitle>
          <CardDescription>
            View and manage all translation keys with their completion status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search keys, descriptions..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                <SelectItem value="complete">Complete (100%)</SelectItem>
                <SelectItem value="incomplete">Incomplete (&lt;100%)</SelectItem>
                <SelectItem value="empty">No Variants</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Columns
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={value => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map(row => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        // Navigate to the key editing page
                        window.location.href = `/keys?selected=${encodeURIComponent(row.original.fullKey)}`;
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No translation keys found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {filteredData.length} keys
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">Page</span>
                <span className="text-sm font-medium">
                  {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}