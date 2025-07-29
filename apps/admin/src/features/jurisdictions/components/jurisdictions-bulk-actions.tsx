import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JurisdictionSelection } from '../types';

interface JurisdictionsBulkActionsProps {
  selection: JurisdictionSelection;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function JurisdictionsBulkActions({
  selection,
  onClearSelection,
  onBulkDelete,
}: JurisdictionsBulkActionsProps) {
  if (selection.selectedJurisdictions.size === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">
          {selection.selectedJurisdictions.size} jurisdiction{selection.selectedJurisdictions.size === 1 ? '' : 's'} selected
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
      </div>
    </div>
  );
}