import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDeleteJurisdiction } from '../hooks/use-jurisdictions';
import type { JurisdictionTableRow } from '../types';

interface BulkDeleteJurisdictionsDialogProps {
  jurisdictions: JurisdictionTableRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BulkDeleteJurisdictionsDialog({
  jurisdictions,
  open,
  onOpenChange,
  onComplete,
}: BulkDeleteJurisdictionsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteJurisdiction = useDeleteJurisdiction();

  const handleBulkDelete = async () => {
    if (jurisdictions.length === 0) return;

    try {
      setIsDeleting(true);
      
      // Delete jurisdictions sequentially to avoid overwhelming the API
      for (const jurisdiction of jurisdictions) {
        await deleteJurisdiction.mutateAsync(jurisdiction.id);
      }
      
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting jurisdictions:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (jurisdictions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Jurisdictions</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete {jurisdictions.length} jurisdiction{jurisdictions.length === 1 ? '' : 's'}? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="text-sm font-medium mb-2">
            Jurisdictions to be deleted:
          </div>
          <ScrollArea className="h-32">
            <div className="space-y-1">
              {jurisdictions.map((jurisdiction) => (
                <div key={jurisdiction.id} className="text-sm">
                  <span className="font-medium">{jurisdiction.code}</span> - {jurisdiction.name}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${jurisdictions.length} Jurisdiction${jurisdictions.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}