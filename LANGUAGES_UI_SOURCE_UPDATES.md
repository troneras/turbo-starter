# Languages UI Updates for Source Language Support

## Overview

Updated the languages table UI to clearly indicate which language is the source language and prevent modifications to it. The source language is visually distinguished and protected from editing, deletion, and bulk operations.

## Changes Made

### 1. **Frontend Types Updated** (`types.ts`)

- Added `source: boolean` field to `LanguageTableRow` interface
- Added optional `source?: boolean` field to `CreateLanguageFormData` interface
- Updated interfaces to reflect the new source language functionality

### 2. **Languages Table Component** (`languages-table.tsx`)

#### Visual Indicators:

- **Crown Icon** + "Source" badge for source language entries
- **Amber/gold color scheme** for source language badges and highlights
- **Subtle background highlighting** (amber-50/50) for source language rows
- **"Primary Language" badge** in the name column for additional clarity

#### Protection Mechanisms:

- **Disabled checkboxes** for source languages in bulk selection
- **Disabled edit and delete buttons** for source language
- **Helpful tooltips** explaining why actions are disabled
- **Visual state changes** (disabled styling) for protected actions

#### Code Examples:

```typescript
// Enhanced language code display with source indicators
const formatLanguageCode = (code: string, isSource: boolean = false) => {
  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant={isSource ? "default" : "outline"}
        className={`font-mono text-xs ${isSource ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
      >
        {code}
      </Badge>
      {isSource && (
        <>
          <Crown className="h-3 w-3 text-amber-500" />
          <Badge variant="secondary" className="text-xs ml-1 bg-amber-50 text-amber-700 border-amber-200">
            Source
          </Badge>
        </>
      )}
    </div>
  );
};

// Protected actions for source language
<Button
  variant="ghost"
  size="sm"
  onClick={() => onEditLanguage(language)}
  disabled={language.source}
  title={language.source ? "Cannot edit source language" : "Edit language"}
>
  <Edit2 className="h-4 w-4" />
</Button>
```

### 3. **Selection Logic Updates** (`use-language-selection.ts`)

- **Separated selectable vs total languages** count
- **Excluded source languages** from bulk operations
- **Updated "select all" logic** to only include non-source languages
- **Maintained selection state** integrity

#### Key Changes:

```typescript
interface UseLanguageSelectionOptions {
  selectableLanguages: number; // Excludes source languages
}

// Only selectable languages count toward "all selected" state
const isAllSelected =
  selectedLanguages.size === selectableLanguages && selectableLanguages > 0;
```

### 4. **Languages Page Updates** (`languages-page.tsx`)

- **Enhanced data mapping** to include source field from API
- **Calculated selectable languages** excluding source languages
- **Updated selection handlers** to work with filtered language sets
- **Maintained proper selection state** across operations

#### Data Processing:

```typescript
// Convert API data to table format with source field
const languages: LanguageTableRow[] =
  data?.languages?.map((language) => ({
    id: language.id,
    code: language.code,
    name: language.name,
    source: language.source, // NEW: Include source field
  })) || [];

// Calculate selectable languages (excluding source)
const selectableLanguages = languages.filter((lang) => !lang.source);
const selectableLanguageIds = selectableLanguages.map((lang) => lang.id);
```

## User Experience Improvements

### Visual Clarity

1. **Immediate Recognition**: Source language is instantly recognizable with crown icon and amber styling
2. **Consistent Branding**: Amber/gold color scheme throughout all source language indicators
3. **Clear Status**: "Primary Language" and "Source" badges provide clear status information

### Protection Mechanisms

1. **Prevented Accidents**: Disabled buttons prevent accidental source language modifications
2. **Helpful Guidance**: Tooltips explain why certain actions are unavailable
3. **Bulk Operation Safety**: Source language cannot be selected for bulk operations

### Responsive Design

1. **Desktop Table**: Full feature set with clear column layout
2. **Mobile Cards**: Condensed view maintains all visual indicators and protection
3. **Consistent Experience**: Same protection and visual cues across all screen sizes

## Technical Features

### Accessibility

- **Screen reader support** with proper ARIA labels and descriptions
- **Keyboard navigation** maintained with disabled state handling
- **High contrast** visual indicators for better visibility

### Performance

- **Efficient filtering** of selectable languages
- **Optimized re-renders** with proper dependency management
- **Minimal state updates** for selection operations

### Error Prevention

- **UI-level protection** prevents invalid operations
- **Graceful error handling** with user-friendly messages
- **State consistency** maintained across all operations

## Future Enhancements

The UI is now prepared for additional source language features:

1. **Source Language Creation**: Form can be enhanced to allow setting source status during creation
2. **Source Language Transfer**: Could add functionality to transfer source status (if business logic permits)
3. **Source Language Indicators**: Could add more visual indicators throughout the application
4. **Translation Workflows**: Source language status can guide translation creation workflows

## Testing Recommendations

1. **Visual Testing**: Verify source language indicators appear correctly
2. **Interaction Testing**: Confirm source language protection works
3. **Accessibility Testing**: Ensure screen readers announce source status
4. **Responsive Testing**: Check mobile view maintains all indicators
5. **Selection Testing**: Verify bulk operations exclude source language

This implementation provides a robust, user-friendly interface for managing languages while clearly indicating and protecting the source language.
