import { useState, useEffect } from 'react';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateRole, useUpdateRole, usePermissions, useRoles } from '../hooks/use-roles';
import { PermissionSelector } from './permission-selector';
import type { RoleTableRow, CreateRoleFormData } from '../types';

const roleFormSchema = z.object({
  name: z.string()
    .min(1, 'Role name is required')
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Role name can only contain letters, numbers, underscores, and hyphens'),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  permissions: z.array(z.number())
    .min(1, 'At least one permission is required'),
  parentRoleId: z.number().optional(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleFormDialogProps {
  role?: RoleTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RoleFormDialog({ role, open, onOpenChange }: RoleFormDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  
  const isEditing = !!role;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const { data: permissions } = usePermissions();
  const { data: rolesData } = useRoles();

  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
      parentRoleId: undefined,
    },
  });

  // Reset form when dialog opens/closes or role changes
  useEffect(() => {
    if (open) {
      if (isEditing && role) {
        const rolePermissionIds = role.permissions.map(p => p.id);
        form.reset({
          name: role.name,
          description: role.description || '',
          permissions: rolePermissionIds,
          parentRoleId: undefined, // Will be populated when API supports it
        });
        setSelectedPermissions(rolePermissionIds);
      } else {
        form.reset({
          name: '',
          description: '',
          permissions: [],
          parentRoleId: undefined,
        });
        setSelectedPermissions([]);
      }
    }
  }, [open, role, isEditing, form]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      const formData: CreateRoleFormData = {
        name: data.name,
        description: data.description || undefined,
        permissions: data.permissions,
        parentRoleId: data.parentRoleId,
      };

      if (isEditing && role) {
        await updateRole.mutateAsync({
          id: role.id,
          data: formData,
        });
        toast.success('Role updated successfully', {
          description: `"${data.name}" has been updated with ${data.permissions.length} permissions.`
        });
      } else {
        await createRole.mutateAsync(formData);
        toast.success('Role created successfully', {
          description: `"${data.name}" has been added with ${data.permissions.length} permissions.`
        });
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save role:', error);
      const operation = isEditing ? 'update' : 'create';
      
      if (error.response?.data?.message) {
        toast.error(`Failed to ${operation} role`, {
          description: error.response.data.message
        });
      } else if (error.response?.status === 409) {
        toast.error('Role already exists', {
          description: `A role with the name "${data.name}" already exists.`
        });
      } else {
        toast.error(`Failed to ${operation} role`, {
          description: 'Please check your input and try again.'
        });
      }
    }
  };

  const handlePermissionChange = (permissionIds: number[]) => {
    setSelectedPermissions(permissionIds);
    form.setValue('permissions', permissionIds, { shouldValidate: true });
  };

  const isLoading = createRole.isPending || updateRole.isPending;
  const error = createRole.error || updateRole.error;

  // Get available parent roles (exclude self if editing)
  const availableParentRoles = (rolesData?.roles || []).filter(r => 
    !isEditing || r.id !== role?.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update role details and permissions. Changes will affect all users with this role.'
              : 'Create a new role with specific permissions. Users can be assigned to this role after creation.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error instanceof Error ? error.message : 'Failed to save role'}
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., content-editor, moderator"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Use lowercase letters, numbers, underscores, and hyphens only.
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
                      <Input
                        placeholder="Describe what this role is for and what permissions it should have..."
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help others understand this role's purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Role</FormLabel>
                    <Select
                      onValueChange={(value) => 
                        field.onChange(value === 'none' ? undefined : parseInt(value))
                      }
                      value={field.value?.toString() || 'none'}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="No parent role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent role</SelectItem>
                        {availableParentRoles.map((parentRole) => (
                          <SelectItem key={parentRole.id} value={parentRole.id.toString()}>
                            {parentRole.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This role will inherit all permissions from the parent role.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Permissions *</h3>
                {selectedPermissions.length > 0 && (
                  <Badge variant="secondary">
                    {selectedPermissions.length} selected
                  </Badge>
                )}
              </div>
              
              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <PermissionSelector
                        permissions={permissions || []}
                        selectedPermissions={selectedPermissions}
                        onPermissionChange={handlePermissionChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Select the specific permissions this role should have. Users with this role 
                      will be able to perform these actions.
                    </FormDescription>
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}