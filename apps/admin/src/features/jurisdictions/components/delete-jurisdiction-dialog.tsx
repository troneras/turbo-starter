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
import { toast } from 'sonner';
import { useDeleteJurisdiction } from '../hooks/use-jurisdictions';
import type { JurisdictionTableRow } from '../types';

interface DeleteJurisdictionDialogProps {
  jurisdiction: JurisdictionTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteJurisdictionDialog({
  jurisdiction,
  open,
  onOpenChange,
}: DeleteJurisdictionDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteJurisdiction = useDeleteJurisdiction();

  const handleDelete = async () => {
    if (!jurisdiction) return;

    try {
      setIsDeleting(true);
      await deleteJurisdiction.mutateAsync(jurisdiction.id);
      toast.success('Jurisdiction deleted successfully', {
        description: `"${jurisdiction.name}" has been removed from the system.`
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting jurisdiction:', error);
      if (error.response?.data?.message) {
        toast.error('Failed to delete jurisdiction', {
          description: error.response.data.message
        });
      } else {
        toast.error('Failed to delete jurisdiction', {
          description: 'An unexpected error occurred. Please try again.'
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (!jurisdiction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Delete Jurisdiction</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Are you sure you want to delete the jurisdiction{' '}
            <span className="font-medium">{jurisdiction.name}</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">Code:</span> {jurisdiction.code}
            </div>
            <div className="text-sm">
              <span className="font-medium">Name:</span> {jurisdiction.name}
            </div>
            {jurisdiction.region && (
              <div className="text-sm">
                <span className="font-medium">Region:</span> {jurisdiction.region}
              </div>
            )}
          </div>
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
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Jurisdiction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}