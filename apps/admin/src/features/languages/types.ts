export interface LanguageTableRow {
  id: number;
  code: string; // Format: xx-XX (e.g., en-US, fr-FR)
  name: string; // Human-readable name
  source: boolean; // Whether this is the source language
}

export interface LanguageFilters {
  search?: string;
}

export interface LanguageSelection {
  selectedLanguages: Set<number>;
  isAllSelected: boolean;
  indeterminate: boolean;
}

export type LanguageSortField = 'code' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface LanguageSort {
  field: LanguageSortField;
  direction: SortDirection;
}

export interface CreateLanguageFormData {
  code: string;
  name: string;
  source?: boolean; // Optional when creating, only if no source exists
}

export interface UpdateLanguageFormData {
  code?: string;
  name?: string;
}