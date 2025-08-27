import { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Edit, Copy, FileText, MessageSquare, Image, Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TranslationTextEditor } from '@/components/translation-text-editor';
import { useSourceKey } from '../hooks/use-source-key';
import { useUpdateSourceKey } from '../hooks/use-update-source-key';
import { useAuth } from '@/app/hooks/use-auth';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function EditSourceKeyPage() {
  const params = useParams({ from: '/translations/source-language/$key/edit' });
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const key = params.key;

  const { data: sourceKey, isLoading, error } = useSourceKey(key);
  const updateMutation = useUpdateSourceKey(key);

  const [formData, setFormData] = useState({
    value: '',
    description: '',
    status: 'APPROVED' as 'NEEDS_TRANSLATION' | 'NEEDS_REVIEW' | 'APPROVED',
    needsUpdate: false,
    charLimit: undefined as number | undefined,
  });

  const [isDirty, setIsDirty] = useState(false);
  const canEdit = hasPermission('translations:edit');

  useEffect(() => {
    if (sourceKey) {
      setFormData({
        value: sourceKey.value || '',
        description: sourceKey.description || '',
        status: sourceKey.status || 'APPROVED',
        needsUpdate: sourceKey.needsUpdate || false,
        charLimit: undefined,
      });
    }
  }, [sourceKey]);

  const handleSave = async () => {
    if (!canEdit) return;

    await updateMutation.mutateAsync({
      value: formData.value,
      description: formData.description,
      needsUpdate: formData.needsUpdate,
      charLimit: formData.charLimit,
    });

    setIsDirty(false);
    navigate({ to: '/translations/source-language' });
  };

  const handleCancel = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate({ to: '/translations/source-language' });
  };

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/translations/source-language' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Source Language
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-600">
              Error loading translation: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/translations/source-language' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Source Language
          </Button>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/translations/source-language' })}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-px bg-border" />
          <div>
            <h1 className="text-xl font-semibold font-mono">
              {sourceKey?.entityKey}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Copy key">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="View preview">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Translation Value Editor */}
              <div className="space-y-2">
                <TranslationTextEditor
                  value={formData.value}
                  onChange={(value) => handleFieldChange('value', value)}
                  placeholder="Enter translation value..."
                  showCharLimit={true}
                  charLimit={formData.charLimit}
                  onCharLimitChange={(enabled, limit) =>
                    handleFieldChange('charLimit', enabled ? limit : undefined)
                  }
                  disabled={!canEdit}
                  language="en"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleFieldChange('status', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Active
                      </div>
                    </SelectItem>
                    <SelectItem value="NEEDS_REVIEW">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Needs Review
                      </div>
                    </SelectItem>
                    <SelectItem value="NEEDS_TRANSLATION">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Needs Translation
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description/Note */}
              <div className="space-y-2">
                <Label htmlFor="description">Translation note</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Add a note for translators..."
                    disabled={!canEdit}
                    className="min-h-[120px] pr-16"
                    maxLength={8192}
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {formData.description.length}/8192
                  </span>
                </div>
              </div>

              {/* Update Flag */}
              <div className="flex items-center space-x-3 py-2">
                <Checkbox
                  id="needs-update"
                  checked={formData.needsUpdate}
                  onCheckedChange={(checked) =>
                    handleFieldChange('needsUpdate', checked as boolean)
                  }
                  disabled={!canEdit}
                />
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="needs-update"
                    className="font-normal cursor-pointer"
                  >
                    Existing translations need to be updated
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          When checked, all translations in other languages will be marked
                          for review to ensure they match the updated source text.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  CANCEL
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!canEdit || !isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section - Placeholder for future features */}
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="languages" className="w-full">
                <TabsList className="grid w-full grid-cols-5 rounded-none border-b">
                  <TabsTrigger value="similar" className="gap-2">
                    <Copy className="h-4 w-4" />
                    SIMILAR
                  </TabsTrigger>
                  <TabsTrigger value="versions" className="gap-2">
                    <Edit className="h-4 w-4" />
                    VERSIONS
                  </TabsTrigger>
                  <TabsTrigger value="languages" className="gap-2">
                    <FileText className="h-4 w-4" />
                    LANGUAGES
                  </TabsTrigger>
                  <TabsTrigger value="screenshots" className="gap-2">
                    <Image className="h-4 w-4" />
                    SCREENSHOTS
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    COMMENTS
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="similar" className="p-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Similar translations will be displayed here
                  </div>
                </TabsContent>

                <TabsContent value="versions" className="p-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Version history will be displayed here
                  </div>
                </TabsContent>

                <TabsContent value="languages" className="p-6">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Translations in other languages
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>🇺🇸</span>
                          <span className="font-medium">American English</span>
                          <Badge variant="outline" className="text-xs">en_US</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formData.value || 'No translation available'}
                      </p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>🇩🇪</span>
                          <span className="font-medium">German</span>
                          <Badge variant="outline" className="text-xs">de</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        No translation available
                      </p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>🇪🇸</span>
                          <span className="font-medium">Spanish</span>
                          <Badge variant="outline" className="text-xs">es</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        No translation available
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="screenshots" className="p-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Screenshots will be displayed here
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="p-6">
                  <div className="text-center py-12 text-muted-foreground">
                    Comments will be displayed here
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-medium">Key Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">
                  {sourceKey?.createdAt
                    ? new Date(sourceKey.createdAt).toLocaleString()
                    : '-'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm">
                  {sourceKey?.updatedAt
                    ? new Date(sourceKey.updatedAt).toLocaleString()
                    : 'Never'}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Key ID</p>
                <p className="text-sm font-mono">{sourceKey?.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}