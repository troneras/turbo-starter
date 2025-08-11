import { useState, useCallback } from 'react';

export function useBrandSelection() {
  const [selectedBrands, setSelectedBrands] = useState<Set<number>>(new Set());

  const toggleBrand = useCallback((brandId: number) => {
    setSelectedBrands((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(brandId)) {
        newSet.delete(brandId);
      } else {
        newSet.add(brandId);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback((brandIds: number[]) => {
    setSelectedBrands((prev) => {
      const newSet = new Set(prev);
      const allSelected = brandIds.every((id) => newSet.has(id));

      if (allSelected) {
        brandIds.forEach((id) => newSet.delete(id));
      } else {
        brandIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBrands(new Set());
  }, []);

  const isSelected = useCallback(
    (brandId: number) => selectedBrands.has(brandId),
    [selectedBrands]
  );

  const isAllSelected = useCallback(
    (brandIds: number[]) => 
      brandIds.length > 0 && brandIds.every((id) => selectedBrands.has(id)),
    [selectedBrands]
  );

  const isPartiallySelected = useCallback(
    (brandIds: number[]) => {
      const selectedCount = brandIds.filter((id) => selectedBrands.has(id)).length;
      return selectedCount > 0 && selectedCount < brandIds.length;
    },
    [selectedBrands]
  );

  return {
    selectedBrands: Array.from(selectedBrands),
    toggleBrand,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isPartiallySelected,
  };
}