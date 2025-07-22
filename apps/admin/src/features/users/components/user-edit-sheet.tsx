import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from './user-avatar';
import { useRoles, useUpdateUserRoles } from '../hooks/use-users';
import type { UserTableRow } from '../types';

interface UserEditSheetProps {
  user: UserTableRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleDescriptions = {
  admin: 'Full system access',
  editor: 'Can edit translations and manage releases',
  translator: 'Can translate content',
  viewer: 'Read-only access',
  user: 'Basic user access',
} as const;

export function UserEditSheet({ user, open, onOpenChange }: UserEditSheetProps) {
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: availableRoles, isLoading: rolesLoading } = useRoles();
  const updateUserRoles = useUpdateUserRoles();

  // Update selected roles when user changes
  useEffect(() => {
    if (user) {
      setSelectedRoles(new Set(user.roles));
      setHasChanges(false);
    }
  }, [user]);

  // Check for changes
  useEffect(() => {
    if (user) {
      const currentRoles = new Set(user.roles);
      const hasRoleChanges = 
        currentRoles.size !== selectedRoles.size ||
        ![...currentRoles].every(role => selectedRoles.has(role));
      setHasChanges(hasRoleChanges);
    }
  }, [user, selectedRoles]);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(role)) {
        newSet.delete(role);
      } else {
        newSet.add(role);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!user || !hasChanges) return;

    try {
      await updateUserRoles.mutateAsync({
        userId: user.id,
        roles: Array.from(selectedRoles),
        reason: 'Role updated via admin interface',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update user roles:', error);
    }
  };

  const handleCancel = () => {
    if (user) {
      setSelectedRoles(new Set(user.roles));
    }
    onOpenChange(false);
  };

  const formatMemberSince = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center space-x-3">
            <UserAvatar name={user.name} size="lg" />
            <div>
              <SheetTitle className="text-xl">{user.name}</SheetTitle>
              <SheetDescription className="text-base">
                {user.email}
              </SheetDescription>
              <p className="text-sm text-muted-foreground mt-1">
                Member since {formatMemberSince(user.createdAt)}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Status */}
          <div>
            <h3 className="text-sm font-medium mb-2">Current Status</h3>
            <div className="flex items-center space-x-2">
              <Badge
                variant={user.status === 'active' ? 'default' : 'secondary'}
                className={
                  user.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }
              >
                {user.status}
              </Badge>
              {user.lastLoginAt && (
                <span className="text-sm text-muted-foreground">
                  Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Role Management */}
          <div>
            <h3 className="text-sm font-medium mb-3">Roles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the roles you want to assign to this user. Changes will be saved when you click "Save Changes".
            </p>

            {rolesLoading ? (
              <div className="text-sm text-muted-foreground">Loading roles...</div>
            ) : (
              <div className="space-y-3">
                {availableRoles?.map((role) => (
                  <div
                    key={role}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <Checkbox
                      id={role}
                      checked={selectedRoles.has(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={role}
                        className="text-sm font-medium capitalize cursor-pointer"
                      >
                        {role}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {roleDescriptions[role as keyof typeof roleDescriptions] || 
                         'Custom role with specific permissions'}
                      </p>
                    </div>
                    {user.roles.includes(role) && !selectedRoles.has(role) && (
                      <Badge variant="outline" className="text-xs">
                        Removing
                      </Badge>
                    )}
                    {!user.roles.includes(role) && selectedRoles.has(role) && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        Adding
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateUserRoles.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateUserRoles.isPending || selectedRoles.size === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateUserRoles.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {selectedRoles.size === 0 && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              At least one role must be selected.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}