import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, X } from 'lucide-react';
import type { RoleSelection } from '../types';

interface RolesBulkActionsProps {
  selection: RoleSelection;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export function RolesBulkActions({
  selection,
  onClearSelection,
  onBulkDelete,
}: RolesBulkActionsProps) {
  const selectedCount = selection.selectedRoles.size;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="font-medium">
            {selectedCount} role{selectedCount !== 1 ? 's' : ''} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear selection</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="h-8"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Selected
        </Button>
      </div>
    </div>
  );
}