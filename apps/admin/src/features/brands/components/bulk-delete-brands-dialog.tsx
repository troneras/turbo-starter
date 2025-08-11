import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface BulkDeleteBrandsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandCount: number;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function BulkDeleteBrandsDialog({
  open,
  onOpenChange,
  brandCount,
  onConfirm,
  isDeleting
}: BulkDeleteBrandsDialogProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete brands:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {brandCount} Brand{brandCount === 1 ? '' : 's'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {brandCount} selected brand{brandCount === 1 ? '' : 's'}? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete {brandCount} Brand{brandCount === 1 ? '' : 's'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}