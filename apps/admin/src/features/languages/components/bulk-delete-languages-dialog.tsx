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
import { useDeleteLanguage } from '../hooks/use-languages';
import type { LanguageTableRow } from '../types';

interface BulkDeleteLanguagesDialogProps {
  languages: LanguageTableRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BulkDeleteLanguagesDialog({ 
  languages, 
  open, 
  onOpenChange,
  onComplete 
}: BulkDeleteLanguagesDialogProps) {
  const deleteLanguage = useDeleteLanguage();

  const handleBulkDelete = async () => {
    try {
      // Delete languages one by one
      // Note: In a real implementation, you might want to create a bulk delete API endpoint
      for (const language of languages) {
        await deleteLanguage.mutateAsync(language.id);
      }
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete languages:', error);
      // Error handling - you might want to show a toast notification here
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (languages.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle className="text-red-900">
              Delete {languages.length} Language{languages.length !== 1 ? 's' : ''}
            </DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the selected languages from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Languages List */}
          <div className="max-h-48 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Languages to be deleted:</p>
            <div className="space-y-2">
              {languages.map((language) => (
                <div key={language.id} className="flex items-center space-x-3 p-2 bg-red-50 border border-red-200 rounded">
                  <Badge variant="outline" className="font-mono text-xs">
                    {language.code}
                  </Badge>
                  <span className="text-sm">{language.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Warning:</p>
                <p>
                  Deleting these languages may affect existing translations and content. 
                  Make sure these languages are not being used by any content before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete these {languages.length} language{languages.length !== 1 ? 's' : ''}?
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
              onClick={handleBulkDelete}
              disabled={deleteLanguage.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLanguage.isPending ? 'Deleting...' : `Delete ${languages.length} Language${languages.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}