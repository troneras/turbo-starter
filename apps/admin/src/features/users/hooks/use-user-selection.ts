import { useState, useMemo } from 'react';
import type { UserSelection } from '../types';

interface UseUserSelectionOptions {
  totalUsers: number;
}

export function useUserSelection({ totalUsers }: UseUserSelectionOptions) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const selection: UserSelection = useMemo(() => {
    const selectedCount = selectedUsers.size;
    const isAllSelected = selectedCount > 0 && selectedCount === totalUsers;
    const indeterminate = selectedCount > 0 && selectedCount < totalUsers;

    return {
      selectedUsers,
      isAllSelected,
      indeterminate,
    };
  }, [selectedUsers, totalUsers]);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAll = (userIds: string[]) => {
    setSelectedUsers(prev => {
      if (prev.size === userIds.length) {
        // All selected, deselect all
        return new Set();
      } else {
        // Some or none selected, select all
        return new Set(userIds);
      }
    });
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  const selectUsers = (userIds: string[]) => {
    setSelectedUsers(new Set(userIds));
  };

  return {
    selection,
    toggleUser,
    toggleAll,
    clearSelection,
    selectUsers,
  };
}