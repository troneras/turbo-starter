import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/app/hooks/use-auth';
import type { Brand } from '@cms/contracts/types/brands';
import type { BrandsSort } from '../types';

interface BrandsTableProps {
  brands: Brand[];
  sort: BrandsSort;
  onSortChange: (sort: BrandsSort) => void;
  selectedBrands: number[];
  onSelectBrand: (brandId: number) => void;
  onSelectAll: (brandIds: number[]) => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}

export function BrandsTable({
  brands,
  sort,
  onSortChange,
  selectedBrands,
  onSelectBrand,
  onSelectAll,
  isAllSelected,
  isPartiallySelected,
  onEdit,
  onDelete
}: BrandsTableProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');

  const handleSort = (field: 'name' | 'id') => {
    if (sort.field === field) {
      onSortChange({
        field,
        direction: sort.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      onSortChange({ field, direction: 'asc' });
    }
  };

  const getSortIcon = (field: 'name' | 'id') => {
    if (sort.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sort.direction === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={() => onSelectAll(brands.map(b => b.id))}
                  ref={(el) => {
                    if (el) el.indeterminate = isPartiallySelected;
                  }}
                />
              </TableHead>
            )}
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('id')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                ID
                {getSortIcon('id')}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('name')}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Name
                {getSortIcon('name')}
              </Button>
            </TableHead>
            <TableHead>Description</TableHead>
            {isAdmin && <TableHead className="w-12"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={isAdmin ? 5 : 3} 
                className="h-24 text-center text-muted-foreground"
              >
                No brands found.
              </TableCell>
            </TableRow>
          ) : (
            brands.map((brand) => (
              <TableRow key={brand.id}>
                {isAdmin && (
                  <TableCell>
                    <Checkbox
                      checked={selectedBrands.includes(brand.id)}
                      onCheckedChange={() => onSelectBrand(brand.id)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant="secondary">{brand.id}</Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {brand.name}
                </TableCell>
                <TableCell>
                  {brand.description ? (
                    <span className="text-muted-foreground">
                      {brand.description.length > 60
                        ? `${brand.description.slice(0, 60)}...`
                        : brand.description}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">No description</span>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(brand)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(brand)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}