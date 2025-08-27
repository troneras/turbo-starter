import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Settings,
  ChevronRight,
  Search,
  Filter,
  Languages,
  KeyRound,
  MoreVertical,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslationStats } from '@/features/translations/hooks/use-translation-stats';
import { useCreateTranslationKey } from '@/features/translations/hooks/use-create-translation-key';
import { AddTranslationKeyModal } from '@/features/translations/components/AddTranslationKeyModal';

// Translation progress data interface
interface LanguageProgress {
  languageId: number;
  languageCode: string;
  languageName: string;
  isSource: boolean;
  approvedCount: number;
  needsTranslationCount: number;
  needsReviewCount: number;
  totalVariants: number;
  completionPercentage: number;
  approvalPercentage: number;
  // Computed fields for UI compatibility
  translatedKeys: number;
  totalKeys: number;
  pendingKeys: number;
  untranslatedKeys: number;
}

// Convert stats data to UI format
function convertStatsToProgress(stats: {
  totalKeys: number;
  localeStats: Array<{
    localeId: number;
    localeCode: string;
    localeName: string;
    isSource: boolean;
    approvedCount: number;
    needsTranslationCount: number;
    needsReviewCount: number;
    totalVariants: number;
    completionPercentage: number;
    approvalPercentage: number;
  }>;
}): LanguageProgress[] {
  return stats.localeStats.map(locale => {
    const translatedKeys = locale.approvedCount + locale.needsReviewCount;

    return {
      languageId: locale.localeId,
      languageCode: locale.localeCode,
      languageName: locale.localeName,
      isSource: locale.isSource,
      approvedCount: locale.approvedCount,
      needsTranslationCount: locale.needsTranslationCount,
      needsReviewCount: locale.needsReviewCount,
      totalVariants: locale.totalVariants,
      completionPercentage: locale.completionPercentage,
      approvalPercentage: locale.approvalPercentage,
      // Computed fields for UI compatibility
      translatedKeys,
      totalKeys: stats.totalKeys,
      pendingKeys: locale.needsReviewCount,
      untranslatedKeys: locale.needsTranslationCount,
    };
  });
}

export function TranslationsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress'>('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch translation stats
  const { data: statsData, isLoading } = useTranslationStats();

  // Create translation key mutation
  const createTranslationKey = useCreateTranslationKey();

  // Convert stats to UI format
  const languageProgress = useMemo(() => {
    if (!statsData) return [];
    return convertStatsToProgress(statsData);
  }, [statsData]);

  // Filter and sort languages
  const filteredLanguages = useMemo(() => {
    let filtered = languageProgress;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(lang =>
        lang.languageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.languageCode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    switch (statusFilter) {
      case 'complete':
        filtered = filtered.filter(lang => lang.completionPercentage === 100);
        break;
      case 'incomplete':
        filtered = filtered.filter(lang => lang.completionPercentage < 100 && lang.completionPercentage > 0);
        break;
      case 'untranslated':
        filtered = filtered.filter(lang => lang.completionPercentage === 0);
        break;
    }

    // Sort
    switch (sortBy) {
      case 'progress':
        filtered.sort((a, b) => b.completionPercentage - a.completionPercentage);
        break;
      default:
        filtered.sort((a, b) => {
          // Source language always first
          if (a.isSource) return -1;
          if (b.isSource) return 1;
          return a.languageName.localeCompare(b.languageName);
        });
    }

    return filtered;
  }, [languageProgress, searchQuery, statusFilter, sortBy]);



  const handleLanguageClick = (language: LanguageProgress) => {
    if (language.isSource) {
      // Navigate to source language view
      navigate({ to: '/translations/source-language' });
    } else {
      // TODO: Create a language-specific translations view
      // For now, just navigate to source keys view for all languages
      navigate({ to: '/translations/source-keys', search: { locale: language.languageCode } });
    }
  };

  const handleAddTranslationKey = async (data: {
    sourceKey: string;
    sourceContent: string;
    translationNote?: string;
    autoTranslateWithAI: boolean;
    stringType: string;
    hasCharacterLimit: boolean;
    characterLimit?: number;
  }) => {
    try {
      await createTranslationKey.mutateAsync({
        entityKey: data.sourceKey,
        description: data.translationNote || undefined,
        defaultValue: data.sourceContent,
        status: 'APPROVED', // Default to approved since this is the source content
        metadata: {
          maxLength: data.hasCharacterLimit ? data.characterLimit : undefined,
          comments: data.translationNote || undefined,
          autoTranslateWithAI: data.autoTranslateWithAI,
          hasCharacterLimit: data.hasCharacterLimit,
        },
      });

      // Success feedback could be added here (toast notification, etc.)
    } catch (error) {
      // Error handling could be added here (toast notification, etc.)
      console.error('Failed to create translation key:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading translations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Languages Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Languages</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                <SelectItem value="complete">Fully Translated</SelectItem>
                <SelectItem value="incomplete">In Progress</SelectItem>
                <SelectItem value="untranslated">Not Started</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="progress">Sort by Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Translation Progress</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLanguages.map((language) => (
                  <TableRow
                    key={language.languageId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleLanguageClick(language)}
                  >
                    <TableCell>
                      <span className="text-2xl">🌐</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {language.languageName}
                            {language.isSource && (
                              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                                SOURCE
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{language.languageCode}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {language.isSource ? (
                        <div className="text-sm font-medium text-muted-foreground">
                          {language.totalKeys} source keys
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              {language.completionPercentage}% Finalized
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round((language.needsTranslationCount / language.totalKeys) * 100)}% Needs Translation
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {language.approvedCount} finalized translations
                            </div>
                            {language.needsTranslationCount > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {language.needsTranslationCount} translation{language.needsTranslationCount !== 1 ? 's' : ''} with changed source
                              </div>
                            )}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${language.completionPercentage === 100 ? 'bg-green-500' :
                                language.completionPercentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${language.completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {language.isSource ? (
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <KeyRound className="h-4 w-4 mr-2" />
                          SOURCE KEYS
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <Languages className="h-4 w-4 mr-2" />
                          TRANSLATE
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleLanguageClick(language)}>
                            <ChevronRight className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Translation Key Modal */}
      <AddTranslationKeyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddTranslationKey}
        isLoading={createTranslationKey.isPending}
      />
    </div>
  );
}

