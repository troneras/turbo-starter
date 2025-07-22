export interface UserTableRow {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: 'active' | 'inactive';
  lastLoginAt?: string;
  createdAt: string;
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
}

export interface UserSelection {
  selectedUsers: Set<string>;
  isAllSelected: boolean;
  indeterminate: boolean;
}

export type SortField = 'name' | 'email' | 'createdAt' | 'lastLoginAt';
export type SortDirection = 'asc' | 'desc';

export interface UserSort {
  field: SortField;
  direction: SortDirection;
}