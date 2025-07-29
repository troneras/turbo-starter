import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useCreateJurisdiction, useUpdateJurisdiction } from '../hooks/use-jurisdictions';
import type { JurisdictionTableRow } from '../types';

const formSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .max(20, 'Code must be 20 characters or less')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric with underscores and hyphens only'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  description: z
    .string()
    .optional()
    .or(z.literal('')),
  status: z
    .enum(['active', 'inactive'])
    .default('active'),
  region: z
    .string()
    .optional()
    .or(z.literal(''))
    .or(z.literal('none')),
});

type JurisdictionFormData = z.infer<typeof formSchema>;

interface JurisdictionFormDialogProps {
  jurisdiction: JurisdictionTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

const REGION_OPTIONS = [
  { value: 'Europe', label: 'Europe' },
  { value: 'North America', label: 'North America' },
  { value: 'Asia-Pacific', label: 'Asia-Pacific' },
  { value: 'Latin America', label: 'Latin America' },
  { value: 'Africa', label: 'Africa' },
  { value: 'Middle East', label: 'Middle East' },
] as const;

export function JurisdictionFormDialog({
  jurisdiction,
  open,
  onOpenChange,
}: JurisdictionFormDialogProps) {
  const createJurisdiction = useCreateJurisdiction();
  const updateJurisdiction = useUpdateJurisdiction();

  const form = useForm<JurisdictionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      status: 'active',
      region: 'none',
    },
  });

  const isEditing = !!jurisdiction;
  const isLoading = createJurisdiction.isPending || updateJurisdiction.isPending;

  // Reset form when dialog opens/closes or jurisdiction changes
  useEffect(() => {
    if (open) {
      if (jurisdiction) {
        form.reset({
          code: jurisdiction.code,
          name: jurisdiction.name,
          description: jurisdiction.description || '',
          status: jurisdiction.status,
          region: jurisdiction.region || 'none',
        });
      } else {
        form.reset({
          code: '',
          name: '',
          description: '',
          status: 'active',
          region: 'none',
        });
      }
    }
  }, [open, jurisdiction, form]);

  const onSubmit = async (data: JurisdictionFormData) => {
    try {
      // Clean up empty strings and "none" values
      const submitData = {
        ...data,
        description: data.description || undefined,
        region: data.region === 'none' || !data.region ? undefined : data.region,
      };

      if (isEditing) {
        await updateJurisdiction.mutateAsync({
          id: jurisdiction.id,
          data: submitData,
        });
        toast.success('Jurisdiction updated successfully', {
          description: `"${data.name}" has been updated.`
        });
      } else {
        await createJurisdiction.mutateAsync(submitData);
        toast.success('Jurisdiction created successfully', {
          description: `"${data.name}" has been added to the system.`
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving jurisdiction:', error);
      const operation = isEditing ? 'update' : 'create';
      
      if (error.response?.status === 409) {
        toast.error('Jurisdiction already exists', {
          description: `A jurisdiction with code "${data.code}" already exists.`
        });
      } else if (error.response?.data?.message) {
        toast.error(`Failed to ${operation} jurisdiction`, {
          description: error.response.data.message
        });
      } else {
        toast.error(`Failed to ${operation} jurisdiction`, {
          description: 'Please check your input and try again.'
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Jurisdiction' : 'Add Jurisdiction'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the jurisdiction details below.'
              : 'Create a new jurisdiction by filling out the details below.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., UKGC, MGA, DGOJ"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique jurisdiction code (uppercase alphanumeric, underscores, and hyphens allowed)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., UK Gambling Commission"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Human-readable jurisdiction name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the jurisdiction..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description of the jurisdiction and its regulatory scope
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No region</SelectItem>
                        {REGION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEditing
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditing
                  ? 'Update Jurisdiction'
                  : 'Create Jurisdiction'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}