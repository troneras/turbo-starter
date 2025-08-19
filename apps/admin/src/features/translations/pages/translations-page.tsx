import { useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Settings,
  ChevronRight,
  Search,
  Filter,
  Languages,
  KeyRound,
  MoreVertical
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguages } from '@/features/languages/hooks/use-languages';
import { useAuth } from '@/app/hooks/use-auth';
import type { Language } from '@cms/contracts/types/languages';

// Mock translation progress data
interface LanguageProgress {
  languageId: number;
  languageCode: string;
  languageName: string;
  isSource: boolean;
  translatedKeys: number;
  totalKeys: number;
  approvedKeys: number;
  pendingKeys: number;
  draftKeys: number;
  untranslatedKeys: number;
  completionPercentage: number;
  approvalPercentage: number;
  lastActivity: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

// Generate mock progress data
function generateMockProgress(language: Language, totalKeys: number = 16): LanguageProgress {
  const isSource = language.source || false;

  if (isSource) {
    // Source language is always 100% complete
    return {
      languageId: language.id,
      languageCode: language.code,
      languageName: language.name,
      isSource: true,
      translatedKeys: totalKeys,
      totalKeys,
      approvedKeys: totalKeys,
      pendingKeys: 0,
      draftKeys: 0,
      untranslatedKeys: 0,
      completionPercentage: 100,
      approvalPercentage: 100,
      lastActivity: new Date().toISOString(),
      trend: 'stable',
      trendValue: 0
    };
  }

  // Generate realistic progress for other languages
  const translatedKeys = Math.floor(Math.random() * totalKeys);
  const approvedKeys = Math.floor(translatedKeys * (0.6 + Math.random() * 0.4));
  const pendingKeys = Math.floor((translatedKeys - approvedKeys) * 0.6);
  const draftKeys = translatedKeys - approvedKeys - pendingKeys;
  const untranslatedKeys = totalKeys - translatedKeys;

  const completionPercentage = Math.round((translatedKeys / totalKeys) * 100);
  const approvalPercentage = translatedKeys > 0 ? Math.round((approvedKeys / translatedKeys) * 100) : 0;

  // Random trend
  const trends: Array<'up' | 'down' | 'stable'> = ['up', 'down', 'stable'];
  const trend = trends[Math.floor(Math.random() * trends.length)] as 'up' | 'down' | 'stable';
  const trendValue = trend === 'stable' ? 0 : Math.floor(Math.random() * 10) + 1;

  // Random last activity (within last 30 days)
  const daysAgo = Math.floor(Math.random() * 30);
  const lastActivity = new Date();
  lastActivity.setDate(lastActivity.getDate() - daysAgo);

  return {
    languageId: language.id,
    languageCode: language.code,
    languageName: language.name,
    isSource: false,
    translatedKeys,
    totalKeys,
    approvedKeys,
    pendingKeys,
    draftKeys,
    untranslatedKeys,
    completionPercentage,
    approvalPercentage,
    lastActivity: lastActivity.toISOString(),
    trend,
    trendValue
  };
}

export function TranslationsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'activity'>('name');

  // Fetch languages
  const { data: languagesData, isLoading } = useLanguages({ pageSize: 100 });

  // Generate mock progress data
  const languageProgress = useMemo(() => {
    if (!languagesData?.languages) return [];
    return languagesData.languages.map(lang => generateMockProgress(lang));
  }, [languagesData]);

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
      case 'activity':
        filtered.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
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
      // Navigate to source keys view
      navigate({ to: '/translations/source-keys', search: { locale: language.languageCode } });
    } else {
      // For now, navigate to the old translations view
      // TODO: Create a language-specific translations view
      window.location.href = `/translations-simple?language=${language.languageCode}`;
    }
  };

  const canManageTranslations = hasPermission('translations:create') || hasPermission('translations:edit');

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
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
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
                <SelectItem value="activity">Sort by Activity</SelectItem>
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
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {language.completionPercentage}% Complete
                            </span>
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
    </div>
  );
}

