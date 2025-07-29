import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Jurisdiction,
  JurisdictionListResponse,
  CreateJurisdictionRequest,
  CreateJurisdictionResponse,
  UpdateJurisdictionRequest,
  UpdateJurisdictionResponse,
  JurisdictionQuery,
} from '@cms/contracts/types/jurisdictions';
import type { JurisdictionFilters, JurisdictionSort } from '../types';

interface UseJurisdictionsOptions {
  filters?: JurisdictionFilters;
  sort?: JurisdictionSort;
  page?: number;
  pageSize?: number;
}

export function useJurisdictions({ filters, sort, page = 1, pageSize = 20 }: UseJurisdictionsOptions = {}) {
  return useQuery({
    queryKey: ['jurisdictions', { filters, sort, page, pageSize }],
    queryFn: async (): Promise<{ jurisdictions: Jurisdiction[]; total: number }> => {
      const params: JurisdictionQuery = {
        page,
        pageSize,
      };

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.status) {
        params.status = filters.status;
      }

      if (filters?.region) {
        params.region = filters.region;
      }

      const response = await apiClient.get<JurisdictionListResponse>('/jurisdictions', { params });
      
      // The API returns an array directly, so we need to adapt it for pagination
      // Since the current API doesn't return pagination info, we'll treat the response as all jurisdictions
      const jurisdictions = response.data;
      
      return {
        jurisdictions,
        total: jurisdictions.length,
      };
    },
  });
}

export function useJurisdiction(id: number) {
  return useQuery({
    queryKey: ['jurisdictions', id],
    queryFn: async (): Promise<Jurisdiction> => {
      const response = await apiClient.get<Jurisdiction>(`/jurisdictions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateJurisdiction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJurisdictionRequest): Promise<CreateJurisdictionResponse> => {
      const response = await apiClient.post<CreateJurisdictionResponse>('/jurisdictions', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jurisdictions'] });
    },
  });
}

export function useUpdateJurisdiction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: UpdateJurisdictionRequest; 
    }): Promise<UpdateJurisdictionResponse> => {
      const response = await apiClient.put<UpdateJurisdictionResponse>(`/jurisdictions/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jurisdictions'] });
      queryClient.invalidateQueries({ queryKey: ['jurisdictions', variables.id] });
    },
  });
}

export function useDeleteJurisdiction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/jurisdictions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jurisdictions'] });
    },
  });
}