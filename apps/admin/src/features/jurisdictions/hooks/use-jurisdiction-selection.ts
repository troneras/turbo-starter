import { useState, useCallback, useMemo } from 'react';
import type { JurisdictionSelection } from '../types';

interface UseJurisdictionSelectionOptions {
  totalJurisdictions: number;
}

export function useJurisdictionSelection({ totalJurisdictions }: UseJurisdictionSelectionOptions) {
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Set<number>>(new Set());

  const selection: JurisdictionSelection = useMemo(() => {
    const isAllSelected = totalJurisdictions > 0 && selectedJurisdictions.size === totalJurisdictions;
    const indeterminate = selectedJurisdictions.size > 0 && selectedJurisdictions.size < totalJurisdictions;

    return {
      selectedJurisdictions,
      isAllSelected,
      indeterminate,
    };
  }, [selectedJurisdictions, totalJurisdictions]);

  const toggleJurisdiction = useCallback((id: number) => {
    setSelectedJurisdictions(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const toggleAll = useCallback((jurisdictionIds: number[]) => {
    setSelectedJurisdictions(prev => {
      if (prev.size === jurisdictionIds.length) {
        // If all are selected, deselect all
        return new Set();
      } else {
        // If not all are selected, select all
        return new Set(jurisdictionIds);
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJurisdictions(new Set());
  }, []);

  return {
    selection,
    toggleJurisdiction,
    toggleAll,
    clearSelection,
  };
}