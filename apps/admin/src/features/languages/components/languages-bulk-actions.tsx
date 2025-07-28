import { Button } from '@/components/ui/button';
import { Trash2, X } from 'lucide-react';
import type { LanguageSelection } from '../types';

interface LanguagesBulkActionsProps {
  selection: LanguageSelection;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function LanguagesBulkActions({
  selection,
  onClearSelection,
  onBulkDelete,
}: LanguagesBulkActionsProps) {
  if (selection.selectedLanguages.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center space-x-4">
        <p className="text-sm font-medium text-blue-900">
          {selection.selectedLanguages.size} language{selection.selectedLanguages.size !== 1 ? 's' : ''} selected
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-blue-600 hover:bg-blue-100"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Clear selection</span>
      </Button>
    </div>
  );
}