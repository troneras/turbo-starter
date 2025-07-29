export interface JurisdictionTableRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  region: string | null;
}

export interface JurisdictionFilters {
  search?: string;
  status?: 'active' | 'inactive';
  region?: string;
}

export interface JurisdictionSelection {
  selectedJurisdictions: Set<number>;
  isAllSelected: boolean;
  indeterminate: boolean;
}

export type JurisdictionSortField = 'code' | 'name' | 'region' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface JurisdictionSort {
  field: JurisdictionSortField;
  direction: SortDirection;
}

export interface CreateJurisdictionFormData {
  code: string;
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
  region?: string;
}

export interface UpdateJurisdictionFormData {
  code?: string;
  name?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
  region?: string | null;
}