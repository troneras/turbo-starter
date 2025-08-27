import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SourceLanguageTranslation, SourceLanguageQuery } from '@cms/contracts/types/translations';

interface SourceLanguageTranslationsResponse {
  data: SourceLanguageTranslation[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface UseSourceLanguageTranslationsOptions extends Partial<SourceLanguageQuery> { }

export function useSourceLanguageTranslations(options: UseSourceLanguageTranslationsOptions = {}) {
  return useQuery({
    queryKey: ['source-language-translations', options],
    queryFn: async (): Promise<SourceLanguageTranslationsResponse> => {
      const params = new URLSearchParams();

      if (options.search) params.append('search', options.search);
      if (options.status) params.append('status', options.status);
      if (options.hasDescription !== undefined) params.append('hasDescription', options.hasDescription.toString());
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.page) params.append('page', options.page.toString());
      if (options.pageSize) params.append('pageSize', options.pageSize.toString());

      const response = await apiClient.get<SourceLanguageTranslationsResponse>(
        `/translations/source-language?${params.toString()}`
      );

      return response.data;
    },
  });
}