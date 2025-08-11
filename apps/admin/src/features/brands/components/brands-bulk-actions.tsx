import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface BrandsBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BrandsBulkActions({
  selectedCount,
  onDelete,
  onClearSelection
}: BrandsBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
      <span className="text-sm font-medium">
        {selectedCount} brand{selectedCount === 1 ? '' : 's'} selected
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Delete
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}