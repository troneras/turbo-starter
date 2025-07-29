import type { Role, Permission } from '@cms/contracts/types/roles';

export interface RoleTableRow {
  id: number;
  name: string;
  description?: string | null;
  permissions: Permission[];
  permissionCount: number;
  userCount: number;
  parentRole?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleFilters {
  search?: string;
  hasPermission?: string;
  parentRole?: string;
}

export interface RoleSelection {
  selectedRoles: Set<number>;
  isAllSelected: boolean;
  indeterminate: boolean;
}

export type RoleSortField = 'name' | 'permissionCount' | 'userCount' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface RoleSort {
  field: RoleSortField;
  direction: SortDirection;
}

export interface CreateRoleFormData {
  name: string;
  description?: string;
  permissions: number[];
  parentRoleId?: number;
}

export interface UpdateRoleFormData {
  name?: string;
  description?: string;
  permissions?: number[];
  parentRoleId?: number;
}

// Permission grouping for UI organization
export interface PermissionGroup {
  resource: string;
  label: string;
  permissions: Permission[];
}

// Role hierarchy visualization
export interface RoleHierarchy {
  role: Role;
  children: RoleHierarchy[];
  level: number;
}

// Extended role data for detailed views
export interface RoleWithDetails extends Role {
  description?: string | null;
  parentRole?: Role | null;
  childRoles: Role[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Form validation state
export interface RoleFormErrors {
  name?: string;
  description?: string;
  permissions?: string;
  parentRoleId?: string;
}

// Role comparison for conflict detection
export interface RoleConflict {
  type: 'circular_inheritance' | 'permission_conflict' | 'name_duplicate';
  message: string;
  conflictingRoles: number[];
}