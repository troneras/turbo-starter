import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JurisdictionFilters } from '../types';

interface JurisdictionsSearchBarProps {
  filters: JurisdictionFilters;
  onFiltersChange: (filters: JurisdictionFilters) => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

const REGION_OPTIONS = [
  { value: 'Europe', label: 'Europe' },
  { value: 'North America', label: 'North America' },
  { value: 'Asia-Pacific', label: 'Asia-Pacific' },
  { value: 'Latin America', label: 'Latin America' },
  { value: 'Africa', label: 'Africa' },
  { value: 'Middle East', label: 'Middle East' },
] as const;

export function JurisdictionsSearchBar({ 
  filters, 
  onFiltersChange 
}: JurisdictionsSearchBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearch !== (filters.search || '')) {
        onFiltersChange({
          ...filters,
          search: localSearch || undefined,
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localSearch, filters, onFiltersChange]);

  // Sync local search when filters change externally
  useEffect(() => {
    if (filters.search !== localSearch) {
      setLocalSearch(filters.search || '');
    }
  }, [filters.search]);

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : (value as 'active' | 'inactive'),
    });
  };

  const handleRegionChange = (value: string) => {
    onFiltersChange({
      ...filters,
      region: value === 'all' ? undefined : value,
    });
  };

  const clearFilters = () => {
    setLocalSearch('');
    onFiltersChange({});
  };

  const hasActiveFilters = filters.search || filters.status || filters.region;

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search jurisdictions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-full md:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Region Filter */}
      <Select
        value={filters.region || 'all'}
        onValueChange={handleRegionChange}
      >
        <SelectTrigger className="w-full md:w-[160px]">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          {REGION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearFilters}
          className="w-full md:w-auto"
        >
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      )}
    </div>
  );
}