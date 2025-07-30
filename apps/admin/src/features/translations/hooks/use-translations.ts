import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  TranslationKeyListResponse,
  TranslationListResponse,
  TranslationStatsResponse,
  CreateTranslationKeyRequest,
  UpdateTranslationKeyRequest,
  TranslationKeyQuery,
  TranslationQuery,
  TranslationKey,
  TranslationKeyTreeNode,
  CreateTranslationVariantRequest,
  UpdateTranslationVariantRequest,
  TranslationStatus,
  TranslationVariant
} from '@cms/contracts/types/translations';

// Translation Keys Hooks

export function useTranslationKeys(query: TranslationKeyQuery = {}) {
  return useQuery({
    queryKey: ['translation-keys', query],
    queryFn: async () => {
      const response = await apiClient.get<TranslationKeyListResponse>('/translations/keys', {
        params: query
      });
      return response.data;
    }
  });
}

export function useTranslationKey(id: number) {
  return useQuery({
    queryKey: ['translation-keys', id],
    queryFn: async () => {
      const response = await apiClient.get<TranslationKey>(`/translations/keys/${id}`);
      return response.data;
    },
    enabled: !!id
  });
}

export function useCreateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTranslationKeyRequest) => {
      const response = await apiClient.post<TranslationKey>('/translations/keys', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
    }
  });
}

export function useUpdateTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTranslationKeyRequest }) => {
      const response = await apiClient.patch<TranslationKey>(`/translations/keys/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
      queryClient.invalidateQueries({ queryKey: ['translation-keys', id] });
    }
  });
}

export function useDeleteTranslationKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/translations/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translation-keys'] });
    }
  });
}

// Translation Variants Hooks

export function useTranslations(query: TranslationQuery = {}) {
  return useQuery({
    queryKey: ['translations', query],
    queryFn: async () => {
      const response = await apiClient.get<TranslationListResponse>('/translations/variants', {
        params: query
      });
      return response.data;
    }
  });
}

export function useCreateTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTranslationVariantRequest) => {
      const response = await apiClient.post<TranslationVariant>('/translations/variants', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({
        queryKey: ['translations', { keyId: data.keyId }]
      });
    }
  });
}

export function useUpdateTranslation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTranslationVariantRequest }) => {
      const response = await apiClient.patch<TranslationVariant>(`/translations/variants/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({
        queryKey: ['translations', { keyId: data.keyId }]
      });
    }
  });
}

export function useUpdateTranslationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TranslationStatus }) => {
      const response = await apiClient.patch<TranslationVariant>(`/translations/variants/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['translations'] });
      queryClient.invalidateQueries({ queryKey: ['translation-stats'] });
    }
  });
}

// Utility Hooks

export function useTranslationStats() {
  return useQuery({
    queryKey: ['translation-stats'],
    queryFn: async () => {
      const response = await apiClient.get<TranslationStatsResponse>('/translations/stats');
      return response.data;
    }
  });
}

export function useTranslationLookup(key: string, locale: string, brandId?: number) {
  return useQuery({
    queryKey: ['translation-lookup', key, locale, brandId],
    queryFn: async () => {
      const response = await apiClient.post('/translations/lookup', {
        key,
        locale,
        brandId
      });
      return response.data;
    },
    enabled: !!key && !!locale
  });
}

// Helper hook for loading tree children
export function useTranslationKeyTree() {
  const loadChildren = async (parentPath: string): Promise<TranslationKeyTreeNode[]> => {
    const response = await apiClient.get<TranslationKeyListResponse>('/translations/keys', {
      params: { parent: parentPath }
    });
    return response.data.tree || [];
  };

  return { loadChildren };
}