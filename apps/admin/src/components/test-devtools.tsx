import { useState, useContext } from 'react';
import { X, UserPlus, Users, Shield, Edit, User } from 'lucide-react';
import { TestAuthContext } from '@/app/providers/test-auth-provider';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

// Check if we're in test mode
const isTestMode = () => {
  return import.meta.env.VITE_TEST_MODE === 'true' || 
         (typeof window !== 'undefined' && (
           window.location.search.includes('testMode=true') ||
           localStorage.getItem('test_mode') === 'true'
         ));
};

interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

// Predefined test users
const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'admin-test-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin', 'user'],
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'brands:read', 'brands:create', 'brands:update', 'brands:delete',
      'translations:read', 'translations:create', 'translations:update', 'translations:delete', 'translations:publish'
    ],
    jwt: 'mock-admin-jwt-token'
  },
  editor: {
    id: 'editor-test-123',
    email: 'editor@example.com',
    name: 'Editor User',
    roles: ['editor', 'user'],
    permissions: [
      'users:read',
      'brands:read',
      'translations:read', 'translations:create', 'translations:update'
    ],
    jwt: 'mock-editor-jwt-token'
  },
  user: {
    id: 'user-test-123',
    email: 'user@example.com',
    name: 'Basic User',
    roles: ['user'],
    permissions: ['users:read', 'brands:read', 'translations:read'],
    jwt: 'mock-user-jwt-token'
  }
};

export function TestDevTools() {
  const testContext = useContext(TestAuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [customUser, setCustomUser] = useState<TestUser>({
    id: '',
    email: '',
    name: '',
    roles: [],
    permissions: [],
    jwt: 'mock-custom-jwt'
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  // Only render in test mode
  if (!isTestMode() || !testContext) {
    return null;
  }

  const handleLogin = (user: TestUser) => {
    testContext.setTestUser(user);
    setSelectedPreset('');
  };

  const handleLogout = () => {
    testContext.setTestUser(null);
    setSelectedPreset('');
  };

  const handlePresetSelect = (preset: string) => {
    if (preset && TEST_USERS[preset]) {
      setSelectedPreset(preset);
      handleLogin(TEST_USERS[preset]);
    }
  };

  const handleCustomLogin = () => {
    if (customUser.email && customUser.name) {
      handleLogin({
        ...customUser,
        id: customUser.id || `custom-${Date.now()}`,
        roles: customUser.roles.length > 0 ? customUser.roles : ['user'],
        permissions: customUser.permissions.length > 0 ? customUser.permissions : ['users:read']
      });
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition-colors"
        title="Open Test DevTools"
      >
        <Users className="h-6 w-6" />
      </button>
    );
  }

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="flex items-center gap-2 p-2 shadow-lg border-orange-500 border-2">
          <span className="text-sm font-medium text-orange-600">Test DevTools</span>
          {testContext.isAuthenticated && (
            <span className="text-xs text-muted-foreground">
              {testContext.backendUser?.email}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsMinimized(false)}
            className="h-6 w-6 p-0"
          >
            <Users className="h-4 w-4" />
          </Button>
        </Card>
      </div>
    );
  }

  // Full devtools panel
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="shadow-xl border-orange-500 border-2">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-orange-50 p-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Test DevTools</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <span className="text-lg">−</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Current User Status */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-1">Current User</p>
            {testContext.isAuthenticated && testContext.backendUser ? (
              <div className="space-y-1">
                <p className="text-sm">{testContext.backendUser.name}</p>
                <p className="text-xs text-muted-foreground">{testContext.backendUser.email}</p>
                <p className="text-xs text-muted-foreground">
                  Roles: {testContext.backendUser.roles.join(', ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not authenticated</p>
            )}
          </div>

          {/* Quick Login Presets */}
          <div className="space-y-2">
            <Label>Quick Login</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                variant={selectedPreset === 'admin' ? 'default' : 'outline'}
                onClick={() => handlePresetSelect('admin')}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Shield className="h-4 w-4" />
                <span className="text-xs">Admin</span>
              </Button>
              <Button
                size="sm"
                variant={selectedPreset === 'editor' ? 'default' : 'outline'}
                onClick={() => handlePresetSelect('editor')}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <Edit className="h-4 w-4" />
                <span className="text-xs">Editor</span>
              </Button>
              <Button
                size="sm"
                variant={selectedPreset === 'user' ? 'default' : 'outline'}
                onClick={() => handlePresetSelect('user')}
                className="flex flex-col items-center gap-1 h-auto py-2"
              >
                <User className="h-4 w-4" />
                <span className="text-xs">User</span>
              </Button>
            </div>
          </div>

          {/* Custom User Form */}
          <div className="space-y-2">
            <Label>Custom User</Label>
            <div className="space-y-2">
              <Input
                placeholder="Email"
                value={customUser.email}
                onChange={(e) => setCustomUser({ ...customUser, email: e.target.value })}
              />
              <Input
                placeholder="Name"
                value={customUser.name}
                onChange={(e) => setCustomUser({ ...customUser, name: e.target.value })}
              />
              <Input
                placeholder="Roles (comma-separated)"
                value={customUser.roles.join(', ')}
                onChange={(e) => setCustomUser({ 
                  ...customUser, 
                  roles: e.target.value.split(',').map(r => r.trim()).filter(Boolean) 
                })}
              />
              <Input
                placeholder="Permissions (comma-separated)"
                value={customUser.permissions.join(', ')}
                onChange={(e) => setCustomUser({ 
                  ...customUser, 
                  permissions: e.target.value.split(',').map(p => p.trim()).filter(Boolean) 
                })}
              />
              <Button
                size="sm"
                onClick={handleCustomLogin}
                disabled={!customUser.email || !customUser.name}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Login as Custom User
              </Button>
            </div>
          </div>

          {/* Logout Button */}
          {testContext.isAuthenticated && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              Logout
            </Button>
          )}

          {/* Warning Message */}
          <div className="rounded-lg bg-orange-100 p-2">
            <p className="text-xs text-orange-800">
              ⚠️ Test mode is active. This bypasses real authentication.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}