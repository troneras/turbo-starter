import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteLanguage } from '../hooks/use-languages';
import type { LanguageTableRow } from '../types';

interface DeleteLanguageDialogProps {
  language: LanguageTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteLanguageDialog({ language, open, onOpenChange }: DeleteLanguageDialogProps) {
  const deleteLanguage = useDeleteLanguage();

  const handleDelete = async () => {
    if (!language) return;

    try {
      await deleteLanguage.mutateAsync(language.id);
      toast.success('Language deleted successfully', {
        description: `"${language.name}" has been removed from the system.`
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete language:', error);
      if (error.response?.data?.message) {
        toast.error('Failed to delete language', {
          description: error.response.data.message
        });
      } else {
        toast.error('Failed to delete language', {
          description: 'An unexpected error occurred. Please try again.'
        });
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!language) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle className="text-red-900">Delete Language</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the language from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Details */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="font-mono">
                {language.code}
              </Badge>
              <span className="font-medium">{language.name}</span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Warning:</p>
                <p>
                  Deleting this language may affect existing translations and content. 
                  Make sure this language is not being used by any content before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{language.name}</strong> ({language.code})?
          </p>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={deleteLanguage.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLanguage.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLanguage.isPending ? 'Deleting...' : 'Delete Language'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}