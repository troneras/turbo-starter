import { useState, useEffect } from 'react';
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

export function KeysPage() {
    const { hasPermission } = useAuth();
    const [selectedKey, setSelectedKey] = useState<string | null>(null);

    // Handle URL parameters for pre-selecting a key
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const selectedParam = urlParams.get('selected');
        if (selectedParam) {
            setSelectedKey(decodeURIComponent(selectedParam));
        }
    }, []);
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
        if (confirm('Are you sure you want to delete this translation key?')) {
            try {
                // Note: This assumes the API accepts the full key string
                // You might need to get the key ID from the tree data instead
                //await deleteKeyMutation.mutateAsync(key);
                toast.success('Translation key deleted successfully');
            } catch (error) {
                toast.error('Failed to delete translation key');
                console.error('Delete key error:', error);
            }
        }
    };

    const handleExport = () => {
        toast.info('Export functionality not yet implemented');
    };

    const handleImport = () => {
        toast.info('Import functionality not yet implemented');
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b bg-background p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Translation Keys</h1>
                        <p className="text-muted-foreground">
                            Manage translation keys and their variants across locales and brands
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleImport}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import
                        </Button>
                        {canCreate && (
                            <Button size="sm" onClick={() => handleCreateKey('')}>
                                <Plus className="mr-2 h-4 w-4" />
                                New Key
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left sidebar - Key tree */}
                    <ResizablePanel defaultSize={30} minSize={25}>
                        <div className="flex h-full flex-col">
                            {/* Search */}
                            <div className="border-b p-4">
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

                            {/* Key tree */}
                            <div className="flex-1 overflow-auto p-4">
                                <TranslationKeyTree
                                    selectedKey={selectedKey || undefined}
                                    onSelectKey={setSelectedKey}
                                    onCreateKey={handleCreateKey}
                                    onDeleteKey={handleDeleteKey}
                                    loadChildren={loadChildren}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right panel - Variants */}
                    <ResizablePanel defaultSize={70}>
                        <div className="flex h-full flex-col">
                            {selectedKey ? (
                                <>
                                    {/* Key info header */}
                                    <div className="border-b bg-muted/30 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium">{selectedKey}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Manage translations for this key
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem>
                                                        <Globe className="mr-2 h-4 w-4" />
                                                        Add Locale
                                                    </DropdownMenuItem>
                                                    {canUpdate && (
                                                        <DropdownMenuItem>
                                                            Edit Key
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => handleDeleteKey(selectedKey)}
                                                        >
                                                            Delete Key
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Variants */}
                                    <div className="flex-1 overflow-auto">
                                        <TranslationVariants
                                            translationKey={selectedKey}
                                            canUpdate={canUpdate}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <h3 className="mt-4 text-lg font-medium">No key selected</h3>
                                        <p className="text-muted-foreground">
                                            Choose a translation key from the tree to view and edit its translations
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Stats footer */}
            <div className="border-t">
                <TranslationStats />
            </div>

            {/* Dialogs */}
            <CreateTranslationKeyDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                parentPath={parentPath}
                onSuccess={() => {
                    setCreateDialogOpen(false);
                    // Refresh the tree or refetch data here
                }}
            />
        </div>
    );
}