import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCreateLanguage, useUpdateLanguage } from '../hooks/use-languages';
import type { LanguageTableRow, CreateLanguageFormData } from '../types';

interface LanguageFormDialogProps {
  language: LanguageTableRow | null; // null for create, populated for edit
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguageFormDialog({ language, open, onOpenChange }: LanguageFormDialogProps) {
  const [formData, setFormData] = useState<CreateLanguageFormData>({
    code: '',
    name: '',
  });
  const [errors, setErrors] = useState<Partial<CreateLanguageFormData>>({});

  const createLanguage = useCreateLanguage();
  const updateLanguage = useUpdateLanguage();
  const isEditing = !!language;

  // Reset form when dialog opens/closes or language changes
  useEffect(() => {
    if (language) {
      setFormData({
        code: language.code,
        name: language.name,
      });
    } else {
      setFormData({
        code: '',
        name: '',
      });
    }
    setErrors({});
  }, [language, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateLanguageFormData> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Language code is required';
    } else if (!/^[a-z]{2}-[A-Z]{2}$/.test(formData.code)) {
      newErrors.code = 'Language code must be in format xx-XX (e.g., en-US, fr-FR)';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Language name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Language name must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (isEditing && language) {
        // Only send changed fields for update
        const updateData: Partial<CreateLanguageFormData> = {};
        if (formData.code !== language.code) updateData.code = formData.code;
        if (formData.name !== language.name) updateData.name = formData.name;

        if (Object.keys(updateData).length > 0) {
          await updateLanguage.mutateAsync({
            id: language.id,
            data: updateData,
          });
          toast.success('Language updated successfully', {
            description: `"${formData.name}" has been updated.`
          });
        } else {
          toast.info('No changes detected', {
            description: 'The language information is already up to date.'
          });
        }
      } else {
        await createLanguage.mutateAsync(formData);
        toast.success('Language created successfully', {
          description: `"${formData.name}" has been added to the system.`
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      // Handle API errors
      if (error.response?.status === 409) {
        setErrors({ code: 'A language with this code already exists' });
        toast.error('Language already exists', {
          description: `A language with code "${formData.code}" already exists.`
        });
      } else if (error.response?.data?.message) {
        // Set general error or specific field errors based on API response
        toast.error('Operation failed', {
          description: error.response.data.message
        });
        console.error('Language operation failed:', error.response.data.message);
      } else {
        const operation = isEditing ? 'update' : 'create';
        toast.error(`Failed to ${operation} language`, {
          description: 'Please check your input and try again.'
        });
        console.error('Language operation failed:', error);
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isLoading = createLanguage.isPending || updateLanguage.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Language' : 'Create New Language'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the language information below.'
              : 'Add a new language to the system. The language code must be unique and follow the standard locale format.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Language Code</Label>
            <Input
              id="code"
              placeholder="e.g., en-US, fr-FR, es-ES"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              className={errors.code ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.code && (
              <p className="text-sm text-red-600">{errors.code}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: two lowercase letters, hyphen, two uppercase letters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Language Name</Label>
            <Input
              id="name"
              placeholder="e.g., English (United States), French (France)"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Human-readable name for the language and region
            </p>
          </div>

          {/* Preview */}
          {formData.code && formData.name && !errors.code && !errors.name && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="font-mono">
                  {formData.code}
                </Badge>
                <span className="text-sm">{formData.name}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Language' : 'Create Language')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}