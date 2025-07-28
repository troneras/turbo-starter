import { useState, useCallback } from 'react';
import type { LanguageSelection } from '../types';

interface UseLanguageSelectionOptions {
  totalLanguages: number;
}

export function useLanguageSelection({ totalLanguages }: UseLanguageSelectionOptions) {
  const [selectedLanguages, setSelectedLanguages] = useState<Set<number>>(new Set());

  const isAllSelected = selectedLanguages.size === totalLanguages && totalLanguages > 0;
  const indeterminate = selectedLanguages.size > 0 && selectedLanguages.size < totalLanguages;

  const selection: LanguageSelection = {
    selectedLanguages,
    isAllSelected,
    indeterminate,
  };

  const toggleLanguage = useCallback((languageId: number) => {
    setSelectedLanguages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(languageId)) {
        newSet.delete(languageId);
      } else {
        newSet.add(languageId);
      }
      return newSet;
    });
  }, []);

  const toggleAll = useCallback((languageIds: number[]) => {
    setSelectedLanguages(prev => {
      if (prev.size === languageIds.length) {
        return new Set(); // Deselect all
      } else {
        return new Set(languageIds); // Select all
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLanguages(new Set());
  }, []);

  return {
    selection,
    toggleLanguage,
    toggleAll,
    clearSelection,
  };
}