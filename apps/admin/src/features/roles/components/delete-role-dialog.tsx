import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteRole } from '../hooks/use-roles';
import type { RoleTableRow } from '../types';

interface DeleteRoleDialogProps {
  role: RoleTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteRoleDialog({ role, open, onOpenChange }: DeleteRoleDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const deleteRole = useDeleteRole();

  if (!role) return null;

  const handleDelete = async () => {
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success('Role deleted successfully', {
        description: `"${role.name}" has been removed from the system.`
      });
      onOpenChange(false);
      setConfirmText('');
    } catch (error: any) {
      console.error('Delete failed:', error);
      if (error.response?.data?.message) {
        toast.error('Failed to delete role', {
          description: error.response.data.message
        });
      } else {
        toast.error('Failed to delete role', {
          description: 'An unexpected error occurred. Please try again.'
        });
      }
    }
  };

  const canDelete = confirmText === role.name;
  const isSystemRole = ['admin', 'user', 'editor'].includes(role.name.toLowerCase());
  const hasUsers = role.userCount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Delete Role
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Are you sure you want to delete the role "{role.name}"?
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Role Information */}
          <div className="rounded-lg border bg-muted/25 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{role.name}</span>
                {isSystemRole && (
                  <Badge variant="outline" className="text-xs">
                    System Role
                  </Badge>
                )}
              </div>
              
              {role.description && (
                <p className="text-sm text-muted-foreground">
                  {role.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>{role.permissionCount} permissions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{role.userCount} users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(isSystemRole || hasUsers) && (
            <div className="space-y-3">
              {isSystemRole && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This is a system role. Deleting it may affect 
                    core application functionality.
                  </AlertDescription>
                </Alert>
              )}
              
              {hasUsers && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This role is currently assigned to {role.userCount} 
                    user{role.userCount !== 1 ? 's' : ''}. Deleting it will remove this role 
                    from all assigned users.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type the role name "{role.name}" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={role.name}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              disabled={deleteRole.isPending}
            />
          </div>

          {/* Error Display */}
          {deleteRole.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {deleteRole.error instanceof Error 
                  ? deleteRole.error.message 
                  : 'Failed to delete role. Please try again.'
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => {
              setConfirmText('');
              onOpenChange(false);
            }}
            disabled={deleteRole.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || deleteRole.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteRole.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete Role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}