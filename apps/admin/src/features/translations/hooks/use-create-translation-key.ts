import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateTranslationKeyRequest {
    entityKey: string;
    description?: string;
    defaultValue: string;
    defaultLocaleId?: number;
    brandId?: number;
    jurisdictionId?: number;
    status?: 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED';
    metadata?: {
        maxLength?: number;
        pluralForms?: Record<string, string>;
        comments?: string;
        autoTranslateWithAI?: boolean;
        hasCharacterLimit?: boolean;
    };
    additionalVariants?: Array<{
        localeId: number;
        value: string;
        brandId?: number;
        jurisdictionId?: number;
        status?: 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED';
    }>;
}

interface CreateTranslationKeyResponse {
    key: {
        id: number;
        entityKey: string;
        description?: string | null;
        createdBy: string;
        createdAt: string;
    };
    defaultVariant: {
        id: number;
        entityKey: string;
        localeId: number;
        brandId?: number | null;
        value: string;
        status: 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED';
        createdBy: string;
        createdAt: string;
        approvedBy?: string | null;
        approvedAt?: string | null;
    };
    additionalVariants?: Array<{
        id: number;
        entityKey: string;
        localeId: number;
        brandId?: number | null;
        value: string;
        status: 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED';
        createdBy: string;
        createdAt: string;
        approvedBy?: string | null;
        approvedAt?: string | null;
    }>;
}

export function useCreateTranslationKey() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTranslationKeyRequest): Promise<CreateTranslationKeyResponse> => {
            const response = await apiClient.post<CreateTranslationKeyResponse>('/translations/unified', data);
            return response.data;
        },
        onSuccess: () => {
            // Invalidate translation stats to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['translation-stats'] });
        },
    });
}
