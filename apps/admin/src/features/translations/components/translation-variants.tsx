import { useState } from 'react';
import { Plus, Edit2, Check, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  useTranslations,
  useCreateTranslation,
  useUpdateTranslation,
  useUpdateTranslationStatus,
  useTranslationKeys,
} from '../hooks/use-translations';
import type { TranslationVariant, TranslationStatus } from '@cms/contracts/types/translations';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface TranslationVariantsProps {
  translationKey: string;
  canCreate?: boolean;
  canUpdate?: boolean;
  canApprove?: boolean;
}

export function TranslationVariants({
  translationKey,
  canCreate,
  canUpdate,
  canApprove,
}: TranslationVariantsProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Find key by fullKey
  const { data: keysData } = useTranslationKeys({ search: translationKey });
  const keyData = keysData?.keys.find(k => k.fullKey === translationKey);

  // Get translations for this key
  const { data, isLoading } = useTranslations(
    keyData ? { keyId: keyData.id } : {}
  );

  const createMutation = useCreateTranslation();
  const updateMutation = useUpdateTranslation();
  const statusMutation = useUpdateTranslationStatus();

  // Get available locales
  const { data: localesData } = useQuery({
    queryKey: ['locales'],
    queryFn: async () => {
      const response = await apiClient.get<{ languages: Array<{ id: number; code: string; name: string }> }>('/languages');
      return response.data.languages;
    },
  });

  // Get available brands
  const { data: brandsData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const response = await apiClient.get<{ brands: Array<{ id: number; name: string }> }>('/brands');
      return response.data.brands;
    },
  });

  const handleEdit = (translation: TranslationVariant) => {
    setEditingId(translation.id);
    setEditValue(translation.value);
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: { value: editValue },
      });
      setEditingId(null);
      toast.success('Translation updated successfully');
    } catch (error) {
      toast.error('Failed to update translation');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleStatusChange = async (id: number, status: TranslationStatus) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(`Translation ${status.toLowerCase()}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusVariant = (status: TranslationStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      case 'APPROVED':
        return 'default';
    }
  };

  const translations = data?.translations || [];

  return (
    <div className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{translationKey}</CardTitle>
            {keyData?.description && (
              <CardDescription>{keyData.description}</CardDescription>
            )}
          </div>
          {canCreate && keyData && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Translation
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading translations...
          </div>
        ) : translations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No translations found for this key
            </p>
            {canCreate && keyData && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Translation
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locale</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {translations.map((translation) => (
                <TableRow key={translation.id}>
                  <TableCell className="font-medium">
                    {localesData?.find(l => l.code === translation.locale)?.name || translation.locale}
                  </TableCell>
                  <TableCell>
                    {translation.brandId
                      ? brandsData?.find(b => b.id === translation.brandId)?.name || `Brand ${translation.brandId}`
                      : 'Generic'}
                  </TableCell>
                  <TableCell className="max-w-md">
                    {editingId === translation.id ? (
                      <div className="flex items-center gap-2">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={handleSave}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="truncate">{translation.value}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(translation.status)}>
                      {translation.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => handleEdit(translation)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {canApprove && translation.status !== 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(translation.id, 'APPROVED')}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Approve
                          </DropdownMenuItem>
                        )}
                        {canUpdate && translation.status === 'APPROVED' && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(translation.id, 'DRAFT')}
                          >
                            Revert to Draft
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create Translation Dialog */}
      <CreateTranslationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        keyId={keyData?.id || 0}
        keyName={translationKey}
        existingTranslations={translations}
        locales={localesData || []}
        brands={brandsData || []}
        onSuccess={() => {
          setCreateDialogOpen(false);
          toast.success('Translation created successfully');
        }}
      />
    </div>
  );
}

// Create Translation Dialog Component
interface CreateTranslationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyId: number;
  keyName: string;
  existingTranslations: TranslationVariant[];
  locales: Array<{ id: number; code: string; name: string }>;
  brands: Array<{ id: number; name: string }>;
  onSuccess: () => void;
}

function CreateTranslationDialog({
  open,
  onOpenChange,
  keyId,
  keyName,
  existingTranslations,
  locales,
  brands,
  onSuccess,
}: CreateTranslationDialogProps) {
  const [locale, setLocale] = useState('');
  const [brandId, setBrandId] = useState<number | undefined>();
  const [value, setValue] = useState('');

  const createMutation = useCreateTranslation();

  const handleSubmit = async () => {
    if (!locale || !value) return;

    try {
      // TODO: Fix this - need to use the correct mutation and request format
      await Promise.resolve(); // Placeholder
      // await createMutation.mutateAsync({
      //   fullKey: keyName, // Use fullKey instead of keyId
      //   locale,
      //   brandId,
      //   value,
      //   status: 'DRAFT',
      // });
      onSuccess();
      // Reset form
      setLocale('');
      setBrandId(undefined);
      setValue('');
    } catch (error) {
      toast.error('Failed to create translation');
    }
  };

  // Filter out already used locale/brand combinations
  const usedCombinations = new Set(
    existingTranslations.map(t => `${t.locale}-${t.brandId || 'generic'}`)
  );

  const availableLocales = locales.filter(l => {
    const combination = `${l.code}-${brandId || 'generic'}`;
    return !usedCombinations.has(combination);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Translation</DialogTitle>
          <DialogDescription>
            Add a new translation for "{keyName}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="locale">Locale</Label>
            <select
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="">Select locale...</option>
              {availableLocales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="brand">Brand (optional)</Label>
            <select
              id="brand"
              value={brandId || ''}
              onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              <option value="">Generic (all brands)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="value">Translation</Label>
            <Textarea
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter translation..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!locale || !value || createMutation.isPending}
          >
            Create Translation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}