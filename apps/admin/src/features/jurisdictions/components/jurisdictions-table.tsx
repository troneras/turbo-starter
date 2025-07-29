import { ArrowUpDown, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequireRole } from '@/components/require-role';
import type { 
  JurisdictionTableRow, 
  JurisdictionSelection, 
  JurisdictionSort, 
  JurisdictionSortField, 
  SortDirection 
} from '../types';

interface JurisdictionsTableProps {
  jurisdictions: JurisdictionTableRow[];
  selection: JurisdictionSelection;
  sort: JurisdictionSort;
  loading: boolean;
  onToggleJurisdiction: (id: number) => void;
  onToggleAll: (jurisdictionIds: number[]) => void;
  onSortChange: (field: JurisdictionSortField, direction: SortDirection) => void;
  onEditJurisdiction: (jurisdiction: JurisdictionTableRow) => void;
  onDeleteJurisdiction: (jurisdiction: JurisdictionTableRow) => void;
}

export function JurisdictionsTable({
  jurisdictions,
  selection,
  sort,
  loading,
  onToggleJurisdiction,
  onToggleAll,
  onSortChange,
  onEditJurisdiction,
  onDeleteJurisdiction,
}: JurisdictionsTableProps) {
  const jurisdictionIds = jurisdictions.map(j => j.id);

  const handleSort = (field: JurisdictionSortField) => {
    const newDirection: SortDirection = 
      sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newDirection);
  };

  const getSortIcon = (field: JurisdictionSortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return (
      <ArrowUpDown 
        className={`ml-2 h-4 w-4 ${sort.direction === 'asc' ? 'rotate-180' : ''}`} 
      />
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Desktop table skeleton */}
        <div className="hidden md:block">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile cards skeleton */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (jurisdictions.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium">No jurisdictions found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your search criteria or create a new jurisdiction.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <RequireRole roles={['admin']} fallback={<div />}>
                    <Checkbox
                      checked={selection.isAllSelected}
                      ref={(el) => {
                        if (el) {
                          const input = el.querySelector('input');
                          if (input) input.indeterminate = selection.indeterminate;
                        }
                      }}
                      onCheckedChange={() => onToggleAll(jurisdictionIds)}
                      aria-label="Select all jurisdictions"
                    />
                  </RequireRole>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('code')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Code
                    {getSortIcon('code')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('name')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Name
                    {getSortIcon('name')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('region')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Region
                    {getSortIcon('region')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('status')}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jurisdictions.map((jurisdiction) => (
                <TableRow key={jurisdiction.id}>
                  <TableCell>
                    <RequireRole roles={['admin']} fallback={<div />}>
                      <Checkbox
                        checked={selection.selectedJurisdictions.has(jurisdiction.id)}
                        onCheckedChange={() => onToggleJurisdiction(jurisdiction.id)}
                        aria-label={`Select jurisdiction ${jurisdiction.name}`}
                      />
                    </RequireRole>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {jurisdiction.code}
                  </TableCell>
                  <TableCell className="font-medium">
                    {jurisdiction.name}
                  </TableCell>
                  <TableCell>
                    {jurisdiction.region || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={jurisdiction.status === 'active' ? 'default' : 'secondary'}
                    >
                      {jurisdiction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RequireRole roles={['admin']} fallback={<div />}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditJurisdiction(jurisdiction)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDeleteJurisdiction(jurisdiction)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RequireRole>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {jurisdictions.map((jurisdiction) => (
          <Card key={jurisdiction.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono">
                  {jurisdiction.code}
                </CardTitle>
                <RequireRole roles={['admin']} fallback={<div />}>
                  <Checkbox
                    checked={selection.selectedJurisdictions.has(jurisdiction.id)}
                    onCheckedChange={() => onToggleJurisdiction(jurisdiction.id)}
                    aria-label={`Select jurisdiction ${jurisdiction.name}`}
                  />
                </RequireRole>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="font-medium">{jurisdiction.name}</div>
                {jurisdiction.description && (
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {jurisdiction.description}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {jurisdiction.region && (
                    <span className="text-sm text-muted-foreground">{jurisdiction.region}</span>
                  )}
                  <Badge 
                    variant={jurisdiction.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {jurisdiction.status}
                  </Badge>
                </div>

                <RequireRole roles={['admin']} fallback={<div />}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditJurisdiction(jurisdiction)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDeleteJurisdiction(jurisdiction)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </RequireRole>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}