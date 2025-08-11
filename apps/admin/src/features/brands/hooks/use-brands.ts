import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Brand, BrandListResponse, CreateBrandRequest, BrandDetailResponse } from '@cms/contracts/types/brands';
import type { BrandsData, BrandsParams } from '../types';
import type { AxiosError } from 'axios';

interface UseBrandsReturn {
  data: BrandsData | null;
  isLoading: boolean;
  error: AxiosError | null;
  refetch: () => void;
}

export function useBrands(params: BrandsParams): UseBrandsReturn {
  const [data, setData] = useState<BrandsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AxiosError | null>(null);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<BrandListResponse>('/brands');
      
      // Filter and sort the brands locally
      let filtered = response.data;
      
      // Apply search filter
      if (params.filters.search) {
        const searchLower = params.filters.search.toLowerCase();
        filtered = filtered.filter(brand => 
          brand.name.toLowerCase().includes(searchLower) ||
          (brand.description && brand.description.toLowerCase().includes(searchLower))
        );
      }

      // Apply sorting
      filtered.sort((a, b) => {
        const aValue = params.sort.field === 'name' ? a.name : a.id;
        const bValue = params.sort.field === 'name' ? b.name : b.id;
        
        if (params.sort.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Apply pagination
      const startIndex = (params.page - 1) * params.pageSize;
      const endIndex = startIndex + params.pageSize;
      const paginated = filtered.slice(startIndex, endIndex);

      setData({
        brands: paginated,
        total: filtered.length,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(filtered.length / params.pageSize)
      });
    } catch (err) {
      setError(err as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, [params.filters.search, params.sort.field, params.sort.direction, params.page, params.pageSize]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBrands
  };
}

export async function createBrand(data: CreateBrandRequest): Promise<Brand> {
  const response = await apiClient.post<Brand>('/brands', data);
  return response.data;
}

export async function updateBrand(id: number, data: Partial<CreateBrandRequest>): Promise<Brand> {
  const response = await apiClient.put<Brand>(`/brands/${id}`, data);
  return response.data;
}

export async function deleteBrand(id: number): Promise<void> {
  await apiClient.delete(`/brands/${id}`);
}

export async function getBrandDetails(id: number): Promise<BrandDetailResponse> {
  const response = await apiClient.get<BrandDetailResponse>(`/brands/${id}`);
  return response.data;
}