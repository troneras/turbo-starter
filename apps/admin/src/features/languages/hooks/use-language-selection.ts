import { useState, useCallback } from 'react';
import type { LanguageSelection } from '../types';

interface UseLanguageSelectionOptions {
  selectableLanguages: number; // Total languages that can be selected (excluding source)
}

export function useLanguageSelection({ selectableLanguages }: UseLanguageSelectionOptions) {
  const [selectedLanguages, setSelectedLanguages] = useState<Set<number>>(new Set());

  const isAllSelected = selectedLanguages.size === selectableLanguages && selectableLanguages > 0;
  const indeterminate = selectedLanguages.size > 0 && selectedLanguages.size < selectableLanguages;

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
      // Only include selectable language IDs (exclude source languages)
      const selectableIds = languageIds;
      if (prev.size === selectableIds.length) {
        return new Set(); // Deselect all
      } else {
        return new Set(selectableIds); // Select all selectable
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