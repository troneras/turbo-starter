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
import { Loader2, AlertTriangle, Users, Shield, Trash2 } from 'lucide-react';
import { useBulkDeleteRoles } from '../hooks/use-roles';
import type { RoleTableRow } from '../types';

interface BulkDeleteRolesDialogProps {
  roles: RoleTableRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function BulkDeleteRolesDialog({ 
  roles, 
  open, 
  onOpenChange, 
  onComplete 
}: BulkDeleteRolesDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const bulkDeleteRoles = useBulkDeleteRoles();

  const roleCount = roles.length;
  const expectedConfirmText = `DELETE ${roleCount} ROLES`;
  
  const systemRoles = roles.filter(role => 
    ['admin', 'user', 'editor'].includes(role.name.toLowerCase())
  );
  
  const rolesWithUsers = roles.filter(role => role.userCount > 0);
  const totalUsersAffected = rolesWithUsers.reduce((sum, role) => sum + role.userCount, 0);
  
  const canDelete = confirmText === expectedConfirmText;

  const handleBulkDelete = async () => {
    try {
      const roleIds = roles.map(role => role.id);
      await bulkDeleteRoles.mutateAsync(roleIds);
      onOpenChange(false);
      setConfirmText('');
      onComplete?.();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  if (roleCount === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-2xl max-h-[90vh]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Delete {roleCount} Role{roleCount !== 1 ? 's' : ''}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                This action cannot be undone. All selected roles will be permanently deleted.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border bg-muted/25 p-3">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Roles to Delete</span>
              </div>
              <div className="text-2xl font-bold mt-1">{roleCount}</div>
            </div>
            <div className="rounded-lg border bg-muted/25 p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Users Affected</span>
              </div>
              <div className="text-2xl font-bold mt-1">{totalUsersAffected}</div>
            </div>
          </div>

          {/* Warnings */}
          {(systemRoles.length > 0 || rolesWithUsers.length > 0) && (
            <div className="space-y-3">
              {systemRoles.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> You are about to delete {systemRoles.length} 
                    system role{systemRoles.length !== 1 ? 's' : ''} ({systemRoles.map(r => r.name).join(', ')}). 
                    This may affect core application functionality.
                  </AlertDescription>
                </Alert>
              )}
              
              {rolesWithUsers.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> {rolesWithUsers.length} role{rolesWithUsers.length !== 1 ? 's' : ''} 
                    {rolesWithUsers.length === 1 ? ' is' : ' are'} currently assigned to users. 
                    Deleting them will remove these roles from all assigned users.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Roles List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Roles to be deleted:</h4>
            <div className="h-32 w-full rounded-md border overflow-y-auto">
              <div className="p-4 space-y-2">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/25"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{role.name}</span>
                      {['admin', 'user', 'editor'].includes(role.name.toLowerCase()) && (
                        <Badge variant="outline" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        <span>{role.permissionCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{role.userCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type "{expectedConfirmText}" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm font-mono"
              disabled={bulkDeleteRoles.isPending}
            />
          </div>

          {/* Error Display */}
          {bulkDeleteRoles.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {bulkDeleteRoles.error instanceof Error 
                  ? bulkDeleteRoles.error.message 
                  : 'Failed to delete roles. Please try again.'
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
            disabled={bulkDeleteRoles.isPending}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={!canDelete || bulkDeleteRoles.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {bulkDeleteRoles.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete {roleCount} Role{roleCount !== 1 ? 's' : ''}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}