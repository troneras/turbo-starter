import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  Language,
  LanguageListResponse,
  CreateLanguageRequest,
  CreateLanguageResponse,
  UpdateLanguageRequest,
  UpdateLanguageResponse,
  LanguageQuery,
} from '@cms/contracts/types/languages';
import type { LanguageFilters, LanguageSort } from '../types';

interface UseLanguagesOptions {
  filters?: LanguageFilters;
  sort?: LanguageSort;
  page?: number;
  pageSize?: number;
}

export function useLanguages({ filters, sort, page = 1, pageSize = 20 }: UseLanguagesOptions = {}) {
  return useQuery({
    queryKey: ['languages', { filters, sort, page, pageSize }],
    queryFn: async (): Promise<{ languages: Language[]; total: number }> => {
      const params: LanguageQuery = {
        page,
        pageSize,
      };

      if (filters?.search) {
        params.search = filters.search;
      }

      const response = await apiClient.get<LanguageListResponse>('/languages', { params });
      
      // The API returns an array directly, so we need to adapt it for pagination
      // Since the current API doesn't return pagination info, we'll treat the response as all languages
      const languages = response.data;
      
      return {
        languages,
        total: languages.length,
      };
    },
  });
}

export function useLanguage(id: number) {
  return useQuery({
    queryKey: ['languages', id],
    queryFn: async (): Promise<Language> => {
      const response = await apiClient.get<Language>(`/languages/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLanguageRequest): Promise<CreateLanguageResponse> => {
      const response = await apiClient.post<CreateLanguageResponse>('/languages', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
  });
}

export function useUpdateLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: UpdateLanguageRequest; 
    }): Promise<UpdateLanguageResponse> => {
      const response = await apiClient.put<UpdateLanguageResponse>(`/languages/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
      queryClient.invalidateQueries({ queryKey: ['languages', variables.id] });
    },
  });
}

export function useDeleteLanguage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiClient.delete(`/languages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['languages'] });
    },
  });
}