import { useState, useCallback, useMemo } from 'react';
import type { RoleSelection } from '../types';

interface UseRoleSelectionOptions {
  totalRoles: number;
}

export function useRoleSelection({ totalRoles }: UseRoleSelectionOptions) {
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());

  const selection: RoleSelection = useMemo(() => {
    const selectedCount = selectedRoles.size;
    const isAllSelected = selectedCount === totalRoles && totalRoles > 0;
    const indeterminate = selectedCount > 0 && selectedCount < totalRoles;

    return {
      selectedRoles,
      isAllSelected,
      indeterminate,
    };
  }, [selectedRoles, totalRoles]);

  const toggleRole = useCallback((roleId: number) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback((roleIds: number[]) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      const allSelected = roleIds.every(id => newSet.has(id));
      
      if (allSelected) {
        // Deselect all
        roleIds.forEach(id => newSet.delete(id));
      } else {
        // Select all
        roleIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRoles(new Set());
  }, []);

  const selectRoles = useCallback((roleIds: number[]) => {
    setSelectedRoles(new Set(roleIds));
  }, []);

  const isRoleSelected = useCallback((roleId: number) => {
    return selectedRoles.has(roleId);
  }, [selectedRoles]);

  const getSelectedRoleIds = useCallback(() => {
    return Array.from(selectedRoles);
  }, [selectedRoles]);

  const hasSelection = useMemo(() => {
    return selectedRoles.size > 0;
  }, [selectedRoles]);

  return {
    selection,
    toggleRole,
    toggleAll,
    clearSelection,
    selectRoles,
    isRoleSelected,
    getSelectedRoleIds,
    hasSelection,
  };
}