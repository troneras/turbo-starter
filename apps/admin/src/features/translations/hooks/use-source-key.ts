import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SourceKey {
  id: string;
  entityKey: string;
  value: string;
  description?: string;
  status: 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED';
  createdAt: string;
  updatedAt?: string;
  needsUpdate?: boolean;
}

export function useSourceKey(key: string) {

  return useQuery<SourceKey>({
    queryKey: ['source-key', key],
    queryFn: async () => {
      const response = await apiClient.get(`/translations/source-language/${encodeURIComponent(key)}`);
      return response.data;
    },
    enabled: !!key,
  });
}