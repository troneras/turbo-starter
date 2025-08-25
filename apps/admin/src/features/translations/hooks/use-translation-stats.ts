import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface TranslationStats {
    totalKeys: number;
    localeStats: Array<{
        localeId: number;
        localeCode: string;
        localeName: string;
        isSource: boolean;
        approvedCount: number;
        needsTranslationCount: number;
        needsReviewCount: number;
        totalVariants: number;
        completionPercentage: number;
        approvalPercentage: number;
    }>;
}

export function useTranslationStats() {
    return useQuery({
        queryKey: ['translation-stats'],
        queryFn: async (): Promise<TranslationStats> => {
            const response = await apiClient.get<TranslationStats>('/translations/stats');
            return response.data;
        },
    });
}
