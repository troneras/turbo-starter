import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTranslationKey } from '../hooks/use-translations';
import type { TranslationKey } from '@cms/contracts/types/translations';

interface CreateTranslationKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentPath: string;
  onSuccess: (key: TranslationKey) => void;
}

export function CreateTranslationKeyDialog({
  open,
  onOpenChange,
  parentPath,
  onSuccess,
}: CreateTranslationKeyDialogProps) {
  const [keyName, setKeyName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const createMutation = useCreateTranslationKey();

  const handleSubmit = async () => {
    setError('');

    // Validate key format
    if (!keyName.match(/^[a-z0-9_.]+$/)) {
      setError('Key must contain only lowercase letters, numbers, dots, and underscores');
      return;
    }

    const fullKey = parentPath ? `${parentPath}.${keyName}` : keyName;

    try {
      const result = await createMutation.mutateAsync({
        fullKey,
        description: description || undefined,
      });
      
      onSuccess(result);
      onOpenChange(false);
      
      // Reset form
      setKeyName('');
      setDescription('');
    } catch (error: any) {
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to create translation key');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Translation Key</DialogTitle>
          <DialogDescription>
            {parentPath
              ? `Create a new key under "${parentPath}"`
              : 'Create a new root-level translation key'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="keyName">Key Name</Label>
            <Input
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., button.submit"
              className="font-mono"
            />
            {parentPath && (
              <p className="text-sm text-muted-foreground mt-1">
                Full key: {parentPath}.{keyName || '...'}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe where and how this translation is used..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!keyName || createMutation.isPending}
          >
            Create Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}