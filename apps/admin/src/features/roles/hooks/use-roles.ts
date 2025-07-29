import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Role,
  Permission,
  RolesListResponse,
} from '@cms/contracts/types/roles';
import type { RoleFilters, RoleSort, RoleWithDetails, CreateRoleFormData, UpdateRoleFormData } from '../types';

interface UseRolesOptions {
  filters?: RoleFilters;
  sort?: RoleSort;
  page?: number;
  pageSize?: number;
}

// Query interface that matches expected API parameters
interface RolesQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  hasPermission?: string;
  parentRole?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useRoles({ filters, sort, page = 1, pageSize = 20 }: UseRolesOptions = {}) {
  return useQuery({
    queryKey: ['roles', { filters, sort, page, pageSize }],
    queryFn: async (): Promise<{ roles: Role[]; total: number }> => {
      const params: RolesQuery = {
        page,
        pageSize,
      };

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.hasPermission) {
        params.hasPermission = filters.hasPermission;
      }

      if (filters?.parentRole) {
        params.parentRole = filters.parentRole;
      }

      if (sort) {
        params.sortBy = sort.field;
        params.sortOrder = sort.direction;
      }

      const response = await apiClient.get<RolesListResponse>('/roles', { params });
      
      // The API returns roles array, so we need to adapt it for pagination
      const roles = response.data.roles;
      
      return {
        roles,
        total: roles.length, // For now, until API supports pagination
      };
    },
  });
}

export function useRole(id: number) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async (): Promise<RoleWithDetails> => {
      const response = await apiClient.get<RoleWithDetails>(`/roles/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async (): Promise<Permission[]> => {
      const response = await apiClient.get<{ permissions: Permission[] }>('/permissions');
      return response.data.permissions;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleFormData): Promise<Role> => {
      const response = await apiClient.post<Role>('/roles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: UpdateRoleFormData; 
    }): Promise<Role> => {
      const response = await apiClient.put<Role>(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useBulkDeleteRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: number[]): Promise<void> => {
      await apiClient.post('/roles/bulk-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

// Hook for role hierarchy management
export function useRoleHierarchy() {
  return useQuery({
    queryKey: ['roles', 'hierarchy'],
    queryFn: async (): Promise<Role[]> => {
      const response = await apiClient.get<{ roles: Role[] }>('/roles/hierarchy');
      return response.data.roles;
    },
  });
}

// Hook for checking role conflicts
export function useRoleConflicts(roleData: CreateRoleFormData | UpdateRoleFormData, excludeRoleId?: number) {
  return useQuery({
    queryKey: ['roles', 'conflicts', roleData, excludeRoleId],
    queryFn: async () => {
      const params = excludeRoleId ? { excludeRoleId } : {};
      const response = await apiClient.post('/roles/check-conflicts', roleData, { params });
      return response.data;
    },
    enabled: !!(roleData.name && roleData.permissions),
  });
}