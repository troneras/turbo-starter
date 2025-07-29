import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/app/hooks/use-auth';
import type { 
  LanguageTableRow, 
  LanguageSelection, 
  LanguageSort, 
  LanguageSortField, 
  SortDirection 
} from '../types';

interface LanguagesTableProps {
  languages: LanguageTableRow[];
  selection: LanguageSelection;
  sort: LanguageSort;
  loading?: boolean;
  onToggleLanguage: (languageId: number) => void;
  onToggleAll: (languageIds: number[]) => void;
  onSortChange: (field: LanguageSortField, direction: SortDirection) => void;
  onEditLanguage: (language: LanguageTableRow) => void;
  onDeleteLanguage: (language: LanguageTableRow) => void;
}

export function LanguagesTable({
  languages,
  selection,
  sort,
  loading = false,
  onToggleLanguage,
  onToggleAll,
  onSortChange,
  onEditLanguage,
  onDeleteLanguage,
}: LanguagesTableProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const languageIds = languages.map(language => language.id);

  const getSortIcon = (field: LanguageSortField) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };

  const handleSort = (field: LanguageSortField) => {
    const newDirection: SortDirection = 
      sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange(field, newDirection);
  };

  const formatLanguageCode = (code: string) => {
    // Extract language and country parts
    const [lang, country] = code.split('-');
    return (
      <div className="flex items-center space-x-2">
        <Badge variant="outline" className="font-mono text-xs">
          {code}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {lang?.toUpperCase()}/{country}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center text-muted-foreground">
          Loading languages...
        </div>
      </div>
    );
  }

  if (languages.length === 0) {
    return (
      <div className="border rounded-lg">
        <div className="p-8 text-center text-muted-foreground">
          No languages found
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {isAdmin && (
                <th className="text-left p-3 w-12">
                  <Checkbox
                    checked={selection.isAllSelected}
                    ref={(el) => {
                      if (el) {
                        const checkbox = el as unknown as HTMLInputElement;
                        checkbox.indeterminate = selection.indeterminate;
                      }
                    }}
                    onCheckedChange={() => onToggleAll(languageIds)}
                  />
                </th>
              )}
              <th className="text-left p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('code')}
                  className="h-auto p-0 font-medium"
                >
                  Language Code
                  {getSortIcon('code')}
                </Button>
              </th>
              <th className="text-left p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="h-auto p-0 font-medium"
                >
                  Name
                  {getSortIcon('name')}
                </Button>
              </th>
              {isAdmin && <th className="text-left p-3 w-32">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {languages.map((language) => (
              <tr key={language.id} className="border-t hover:bg-muted/50">
                {isAdmin && (
                  <td className="p-3">
                    <Checkbox
                      checked={selection.selectedLanguages.has(language.id)}
                      onCheckedChange={() => onToggleLanguage(language.id)}
                    />
                  </td>
                )}
                <td className="p-3">
                  {formatLanguageCode(language.code)}
                </td>
                <td className="p-3">
                  <span className="font-medium">{language.name}</span>
                </td>
                {isAdmin && (
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditLanguage(language)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit language</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteLanguage(language)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete language</span>
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4 p-4">
        {languages.map((language) => (
          <div key={language.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                {isAdmin && (
                  <Checkbox
                    checked={selection.selectedLanguages.has(language.id)}
                    onCheckedChange={() => onToggleLanguage(language.id)}
                  />
                )}
                <div>
                  <div className="mb-1">
                    {formatLanguageCode(language.code)}
                  </div>
                  <p className="font-medium">{language.name}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditLanguage(language)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteLanguage(language)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}