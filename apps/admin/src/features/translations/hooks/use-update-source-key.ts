import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface UpdateSourceKeyData {
  value: string;
  description?: string;
  needsUpdate?: boolean;
  charLimit?: number;
}

export function useUpdateSourceKey(key: string) {
  const queryClient = useQueryClient();


  return useMutation({
    mutationFn: async (data: UpdateSourceKeyData) => {
      const response = await apiClient.patch(`/translations/source-language/${encodeURIComponent(key)}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-key', key] });
      queryClient.invalidateQueries({ queryKey: ['source-language-translations'] });

      toast.success('Translation updated', {
        description: 'The source language key has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast.error('Error', {
        description: error.response?.data?.message || 'Failed to update translation',
      });
    },
  });
}