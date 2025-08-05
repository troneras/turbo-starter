import { useState } from 'react'
import { Plus, Search, Edit2, Check, X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { useAuth } from '@/app/hooks/use-auth'
import {
  useTranslationKeys,
  useTranslations,
  useCreateTranslationKey,
  useCreateTranslation,
  useUpdateTranslation,
  useUpdateTranslationStatus,
} from '../hooks/use-translations'
import type { 
  TranslationKey, 
  TranslationVariant,
  TranslationStatus 
} from '@cms/contracts/types/translations'

const statusColors = {
  'APPROVED': 'bg-green-100 text-green-800 border-green-200',
  'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
} as const

export function SimpleTranslationsPage() {
  const { hasPermission } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKey, setSelectedKey] = useState<TranslationKey | null>(null)
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false)
  const [showCreateVariantDialog, setShowCreateVariantDialog] = useState(false)
  const [showCreateTranslationDialog, setShowCreateTranslationDialog] = useState(false)
  const [editingVariant, setEditingVariant] = useState<TranslationVariant | null>(null)
  const [editValue, setEditValue] = useState('')
  
  // Form states
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [newVariantLocale, setNewVariantLocale] = useState('en-US')
  const [newVariantValue, setNewVariantValue] = useState('')
  const [newTranslationKey, setNewTranslationKey] = useState<TranslationKey | null>(null)
  const [newTranslationLocale, setNewTranslationLocale] = useState('en-US')
  const [newTranslationValue, setNewTranslationValue] = useState('')

  // Fetch data
  const { data: keysData, isLoading: keysLoading } = useTranslationKeys()
  const { data: variantsData } = useTranslations()

  // Mutations
  const createKeyMutation = useCreateTranslationKey()
  const createVariantMutation = useCreateTranslation()
  const updateVariantMutation = useUpdateTranslation()
  const updateStatusMutation = useUpdateTranslationStatus()

  const canCreate = hasPermission('translations:write')
  const canUpdate = hasPermission('translations:write')
  const canApprove = hasPermission('translations:review')

  // Filter keys based on search
  const filteredKeys = keysData?.keys?.filter(key =>
    key.entityKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Get variants for selected key
  const selectedKeyVariants = selectedKey 
    ? variantsData?.translations?.filter(v => v.keyId === selectedKey.id) || []
    : []

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Key name is required')
      return
    }

    // Validate key format
    if (!newKeyName.match(/^[a-z0-9_.]+$/)) {
      toast.error('Key must contain only lowercase letters, numbers, dots, and underscores')
      return
    }

    try {
      const newKey = await createKeyMutation.mutateAsync({
        entityKey: newKeyName,
        description: newKeyDescription || undefined,
      })

      // Automatically create en-US variant
      await createVariantMutation.mutateAsync({
        keyId: newKey.id,
        entityKey: newKey.entityKey,
        locale: 'en-US',
        value: `[${newKey.entityKey}]`, // Placeholder value
        status: 'DRAFT',
      })

      toast.success('Translation key created with default en-US variant')
      setShowCreateKeyDialog(false)
      setNewKeyName('')
      setNewKeyDescription('')
      setSelectedKey(newKey)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create translation key')
    }
  }

  const handleCreateVariant = async () => {
    if (!selectedKey || !newVariantValue.trim()) {
      toast.error('Selected key and value are required')
      return
    }

    try {
      await createVariantMutation.mutateAsync({
        keyId: selectedKey.id,
        entityKey: selectedKey.entityKey,
        locale: newVariantLocale,
        value: newVariantValue,
        status: 'DRAFT',
      })

      toast.success('Translation variant created')
      setShowCreateVariantDialog(false)
      setNewVariantValue('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create translation variant')
    }
  }

  const handleCreateTranslation = async () => {
    if (!newTranslationKey || !newTranslationValue.trim()) {
      toast.error('Translation key and value are required')
      return
    }

    try {
      await createVariantMutation.mutateAsync({
        keyId: newTranslationKey.id,
        entityKey: newTranslationKey.entityKey,
        locale: newTranslationLocale,
        value: newTranslationValue,
        status: 'DRAFT',
      })

      toast.success('Translation created successfully')
      setShowCreateTranslationDialog(false)
      setNewTranslationKey(null)
      setNewTranslationValue('')
      setSelectedKey(newTranslationKey) // Select the key we just added translation to
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create translation')
    }
  }

  const handleEditVariant = (variant: TranslationVariant) => {
    setEditingVariant(variant)
    setEditValue(variant.value)
  }

  const handleSaveEdit = async () => {
    if (!editingVariant) return

    try {
      await updateVariantMutation.mutateAsync({
        id: editingVariant.id,
        data: { value: editValue },
      })

      toast.success('Translation updated')
      setEditingVariant(null)
      setEditValue('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update translation')
    }
  }

  const handleStatusUpdate = async (variantId: number, status: TranslationStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: variantId, status })
      toast.success(`Translation status updated to ${status}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  if (keysLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading translations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Translation Management</h1>
          <p className="text-muted-foreground">
            Basic interface for managing translation keys and variants
          </p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowCreateTranslationDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Translation
            </Button>
            <Button onClick={() => setShowCreateKeyDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Key
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Translation Keys */}
        <Card>
          <CardHeader>
            <CardTitle>Translation Keys</CardTitle>
            <CardDescription>
              Select a key to view and manage its translations
            </CardDescription>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search keys..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No translation keys found
                </div>
              ) : (
                filteredKeys.map((key) => {
                  const keyVariants = variantsData?.translations?.filter(v => v.keyId === key.id) || []
                  const variantCount = keyVariants.length
                  const approvedCount = keyVariants.filter(v => v.status === 'APPROVED').length
                  
                  return (
                    <div
                      key={key.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedKey?.id === key.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedKey(key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm font-medium">{key.entityKey}</div>
                        <div className="flex items-center gap-1">
                          {variantCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {approvedCount}/{variantCount}
                            </Badge>
                          )}
                          {variantCount === 0 && (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                              Empty
                            </Badge>
                          )}
                        </div>
                      </div>
                      {key.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {key.description}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Translation Variants */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Translations</CardTitle>
                <CardDescription>
                  {selectedKey 
                    ? `Manage translations for: ${selectedKey.entityKey}`
                    : 'Select a key to view its translations'
                  }
                </CardDescription>
              </div>
              {canCreate && (
                <Button 
                  size="sm"
                  onClick={() => {
                    if (selectedKey) {
                      setNewTranslationKey(selectedKey)
                    }
                    setShowCreateTranslationDialog(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Translation
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedKey ? (
              <div className="text-center py-8">
                <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a translation key to view its translations
                </p>
              </div>
            ) : selectedKeyVariants.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">
                  No translations found for this key
                </p>
                {canCreate && (
                  <Button 
                    onClick={() => {
                      setNewTranslationKey(selectedKey)
                      setShowCreateTranslationDialog(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Translation
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {canCreate && (
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewTranslationKey(selectedKey)
                        setShowCreateTranslationDialog(true)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Translation
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Locale</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedKeyVariants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-mono text-sm">
                          {variant.locale}
                        </TableCell>
                        <TableCell>
                          {editingVariant?.id === variant.id ? (
                            <div className="flex items-center gap-2">
                              <Textarea
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="min-h-[60px]"
                              />
                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={updateVariantMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingVariant(null)
                                    setEditValue('')
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="max-w-xs truncate">
                              {variant.value}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[variant.status]}
                          >
                            {variant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {canUpdate && editingVariant?.id !== variant.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditVariant(variant)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {canApprove && variant.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStatusUpdate(variant.id, 'APPROVED')}
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Translation Key</DialogTitle>
            <DialogDescription>
              Create a new translation key with a default en-US variant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., app.button.submit"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use lowercase letters, numbers, dots, and underscores only
              </p>
            </div>
            <div>
              <Label htmlFor="keyDescription">Description (optional)</Label>
              <Textarea
                id="keyDescription"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="Describe where and how this translation is used..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={!newKeyName || createKeyMutation.isPending}
            >
              {createKeyMutation.isPending ? 'Creating...' : 'Create Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Variant Dialog */}
      <Dialog open={showCreateVariantDialog} onOpenChange={setShowCreateVariantDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Translation</DialogTitle>
            <DialogDescription>
              Add a new translation for: {selectedKey?.entityKey}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="variantLocale">Locale</Label>
              <Select value={newVariantLocale} onValueChange={setNewVariantLocale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">en-US (English US)</SelectItem>
                  <SelectItem value="en-GB">en-GB (English UK)</SelectItem>
                  <SelectItem value="es-ES">es-ES (Spanish)</SelectItem>
                  <SelectItem value="fr-FR">fr-FR (French)</SelectItem>
                  <SelectItem value="de-DE">de-DE (German)</SelectItem>
                  <SelectItem value="it-IT">it-IT (Italian)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="variantValue">Translation Value</Label>
              <Textarea
                id="variantValue"
                value={newVariantValue}
                onChange={(e) => setNewVariantValue(e.target.value)}
                placeholder="Enter the translated text..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateVariantDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVariant}
              disabled={!newVariantValue || createVariantMutation.isPending}
            >
              {createVariantMutation.isPending ? 'Creating...' : 'Add Translation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Translation Dialog */}
      <Dialog open={showCreateTranslationDialog} onOpenChange={setShowCreateTranslationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Translation</DialogTitle>
            <DialogDescription>
              Add a new translation for an existing key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="translationKey">Translation Key</Label>
              <Select 
                value={newTranslationKey?.id.toString() || ''} 
                onValueChange={(value) => {
                  const key = filteredKeys.find(k => k.id.toString() === value)
                  setNewTranslationKey(key || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a translation key..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredKeys.map(key => (
                    <SelectItem key={key.id} value={key.id.toString()}>
                      <div className="flex flex-col items-start">
                        <span className="font-mono text-sm">{key.entityKey}</span>
                        {key.description && (
                          <span className="text-xs text-muted-foreground">
                            {key.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="translationLocale">Locale</Label>
              <Select value={newTranslationLocale} onValueChange={setNewTranslationLocale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">en-US (English US)</SelectItem>
                  <SelectItem value="en-GB">en-GB (English UK)</SelectItem>
                  <SelectItem value="es-ES">es-ES (Spanish)</SelectItem>
                  <SelectItem value="fr-FR">fr-FR (French)</SelectItem>
                  <SelectItem value="de-DE">de-DE (German)</SelectItem>
                  <SelectItem value="it-IT">it-IT (Italian)</SelectItem>
                  <SelectItem value="pt-PT">pt-PT (Portuguese)</SelectItem>
                  <SelectItem value="ru-RU">ru-RU (Russian)</SelectItem>
                  <SelectItem value="ja-JP">ja-JP (Japanese)</SelectItem>
                  <SelectItem value="ko-KR">ko-KR (Korean)</SelectItem>
                  <SelectItem value="zh-CN">zh-CN (Chinese Simplified)</SelectItem>
                  <SelectItem value="zh-TW">zh-TW (Chinese Traditional)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="translationValue">Translation Value</Label>
              <Textarea
                id="translationValue"
                value={newTranslationValue}
                onChange={(e) => setNewTranslationValue(e.target.value)}
                placeholder="Enter the translated text..."
                rows={4}
              />
              {newTranslationKey && (
                <p className="text-xs text-muted-foreground mt-1">
                  Creating translation for: <span className="font-mono">{newTranslationKey.entityKey}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateTranslationDialog(false)
                setNewTranslationKey(null)
                setNewTranslationValue('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTranslation}
              disabled={!newTranslationKey || !newTranslationValue || createVariantMutation.isPending}
            >
              {createVariantMutation.isPending ? 'Creating...' : 'Create Translation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}