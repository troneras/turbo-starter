import { useState } from 'react';
import { Plus, Search, Upload, Download, Globe, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { TranslationKeyTree } from '../components/translation-key-tree';
import { TranslationVariants } from '../components/translation-variants';
import { CreateTranslationKeyDialog } from '../components/create-translation-key-dialog';
import { TranslationStats } from '../components/translation-stats';
import {
  useCreateTranslationKey,
  useDeleteTranslationKey,
  useTranslationKeyTree,
} from '../hooks/use-translations';
import { useAuth } from '@/app/hooks/use-auth';

export function TranslationsPage() {
  const { hasPermission } = useAuth();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [parentPath, setParentPath] = useState('');

  const { loadChildren } = useTranslationKeyTree();
  const createKeyMutation = useCreateTranslationKey();
  const deleteKeyMutation = useDeleteTranslationKey();

  const canCreate = hasPermission('translations:create');
  const canUpdate = hasPermission('translations:update');
  const canDelete = hasPermission('translations:delete');

  const handleCreateKey = (parent: string) => {
    setParentPath(parent);
    setCreateDialogOpen(true);
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the key "${key}" and all its translations?`)) {
      return;
    }

    try {
      // Find the key by fullKey - this would need an API endpoint
      toast.error('Delete functionality not yet implemented');
    } catch (error) {
      toast.error('Failed to delete translation key');
    }
  };

  const handleImport = () => {
    toast.info('Import functionality coming soon');
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  return (
    <div className="container mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Translations
          </h1>
          <p className="text-muted-foreground">
            Manage translations across multiple locales and brands
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Bulk Operations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                Import Translations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export Translations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate && (
            <Button onClick={() => handleCreateKey('')}>
              <Plus className="mr-2 h-4 w-4" />
              New Key
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <TranslationStats className="mb-6" />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          {/* Left Panel - Translation Keys Tree */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search keys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <TranslationKeyTree
                  selectedKey={selectedKey || undefined}
                  onSelectKey={setSelectedKey}
                  onCreateKey={canCreate ? handleCreateKey : undefined}
                  onDeleteKey={canDelete ? handleDeleteKey : undefined}
                  loadChildren={loadChildren}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right Panel - Translation Variants */}
          <ResizablePanel defaultSize={70}>
            <div className="h-full">
              {selectedKey ? (
                <TranslationVariants
                  translationKey={selectedKey}
                  canCreate={canCreate}
                  canUpdate={canUpdate}
                  canApprove={hasPermission('translations:approve')}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Key Selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a translation key from the tree to view and manage its variants
                    </p>
                    {canCreate && (
                      <Button onClick={() => handleCreateKey('')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Key
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Create Key Dialog */}
      <CreateTranslationKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentPath={parentPath}
        onSuccess={(key) => {
          setSelectedKey(key.fullKey);
          toast.success('Translation key created successfully');
        }}
      />
    </div>
  );
}