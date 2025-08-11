export interface BrandsFilters {
  search: string;
}

export interface BrandsSort {
  field: 'name' | 'id';
  direction: 'asc' | 'desc';
}

export interface BrandsParams {
  filters: BrandsFilters;
  sort: BrandsSort;
  page: number;
  pageSize: number;
}

export interface BrandsData {
  brands: Array<{
    id: number;
    name: string;
    description: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}