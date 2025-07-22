import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserMinus, UserPlus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useBulkAssignRole, useBulkDeactivate, useRoles } from '../hooks/use-users';
import type { UserSelection } from '../types';

interface UsersBulkActionsProps {
  selection: UserSelection;
  onClearSelection: () => void;
}

export function UsersBulkActions({ selection, onClearSelection }: UsersBulkActionsProps) {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<'assignRole' | 'deactivate' | null>(null);

  const { data: roles, isLoading: rolesLoading } = useRoles();
  const bulkAssignRole = useBulkAssignRole();
  const bulkDeactivate = useBulkDeactivate();

  const selectedCount = selection.selectedUsers.size;
  const userIds = Array.from(selection.selectedUsers);

  if (selectedCount === 0) {
    return null;
  }

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    try {
      await bulkAssignRole.mutateAsync({
        userIds,
        roleName: selectedRole,
        reason: `Bulk assignment via admin interface to ${selectedCount} users`,
      });
      onClearSelection();
      setSelectedRole('');
    } catch (error) {
      console.error('Failed to assign roles:', error);
    }
  };

  const handleDeactivate = async () => {
    try {
      await bulkDeactivate.mutateAsync({
        userIds,
        reason: `Bulk deactivation via admin interface of ${selectedCount} users`,
      });
      onClearSelection();
    } catch (error) {
      console.error('Failed to deactivate users:', error);
    }
  };

  const isLoading = bulkAssignRole.isPending || bulkDeactivate.isPending;

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center space-x-3">
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {selectedCount} user{selectedCount === 1 ? '' : 's'} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          Clear selection
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <Select
            value={selectedRole}
            onValueChange={setSelectedRole}
            disabled={isLoading || rolesLoading}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {!rolesLoading && roles?.map((role) => (
                <SelectItem key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleAssignRole}
            disabled={!selectedRole || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign Role
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              More Actions
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsConfirming('deactivate')}
              className="text-red-600"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Deactivate Users
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Confirmation Dialog for Deactivation */}
      {isConfirming === 'deactivate' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Deactivate Users</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to deactivate {selectedCount} user{selectedCount === 1 ? '' : 's'}? 
              This action can be reversed by reactivating the users individually.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirming(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeactivate();
                  setIsConfirming(null);
                }}
                disabled={isLoading}
              >
                Deactivate Users
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}