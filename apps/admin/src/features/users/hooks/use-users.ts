import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ListUsersResponse,
  UserWithRoles,
  BulkAssignRoleRequest,
  BulkAssignRoleResponse,
  BulkDeactivateRequest,
  BulkDeactivateResponse,
  UpdateUserStatusResponse,
} from '@cms/contracts/types/users';
import type { UserFilters, UserSort } from '../types';

interface UseUsersOptions {
  filters?: UserFilters;
  sort?: UserSort;
  page?: number;
  pageSize?: number;
}

export function useUsers({ filters, sort, page = 1, pageSize = 25 }: UseUsersOptions = {}) {
  return useQuery({
    queryKey: ['users', { filters, sort, page, pageSize }],
    queryFn: async (): Promise<ListUsersResponse> => {
      const params: Record<string, string> = {
        page: page.toString(),
        pageSize: pageSize.toString(),
      };

      if (filters?.search) {
        params.search = filters.search;
      }
      if (filters?.role && filters.role !== 'all') {
        params.role = filters.role;
      }
      if (filters?.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (sort) {
        params.sortBy = sort.field;
        params.sortDirection = sort.direction;
      }

      const response = await apiClient.get<ListUsersResponse>('/users', { params });
      return response.data;
    },
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<string[]> => {
      const response = await apiClient.get<{ roles: Array<{ name: string }> }>('/roles');
      return response.data.roles.map(role => role.name);
    },
  });
}

export function useBulkAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkAssignRoleRequest): Promise<BulkAssignRoleResponse> => {
      const response = await apiClient.post<BulkAssignRoleResponse>(
        '/users/bulk-assign-role',
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useBulkDeactivate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkDeactivateRequest): Promise<BulkDeactivateResponse> => {
      const response = await apiClient.post<BulkDeactivateResponse>(
        '/users/bulk-deactivate',
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      status
    }: {
      userId: string;
      status: 'active' | 'inactive'
    }): Promise<UpdateUserStatusResponse> => {
      const response = await apiClient.patch<UpdateUserStatusResponse>(
        `/users/${userId}/status`,
        { status }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roles,
      reason,
    }: {
      userId: string;
      roles: string[];
      reason?: string;
    }): Promise<UserWithRoles> => {
      const response = await apiClient.patch<UserWithRoles>(
        `/users/${userId}`,
        { roles, reason }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}