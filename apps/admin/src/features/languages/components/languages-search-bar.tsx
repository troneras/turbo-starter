import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { LanguageFilters } from '../types';

interface LanguagesSearchBarProps {
  filters: LanguageFilters;
  onFiltersChange: (filters: LanguageFilters) => void;
}

export function LanguagesSearchBar({ filters, onFiltersChange }: LanguagesSearchBarProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchValue || undefined,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onFiltersChange]);

  // Sync with external changes
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search languages..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}