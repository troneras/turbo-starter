import { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TranslationTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  showCharLimit?: boolean;
  charLimit?: number;
  onCharLimitChange?: (enabled: boolean, limit?: number) => void;
  disabled?: boolean;
  error?: string;
  language?: string;
}

export const TranslationTextEditor = forwardRef<
  HTMLTextAreaElement,
  TranslationTextEditorProps
>(({
  value = '',
  onChange,
  placeholder = 'Enter translation...',
  className,
  showCharLimit = true,
  charLimit,
  onCharLimitChange,
  disabled = false,
  error,
  language = 'en',
}, ref) => {
  const [hasCharLimit, setHasCharLimit] = useState(!!charLimit);
  const [limitValue, setLimitValue] = useState(charLimit || 100);
  const charCount = value?.length || 0;
  const isOverLimit = hasCharLimit && limitValue && charCount > limitValue;

  const handleCharLimitToggle = (checked: boolean) => {
    setHasCharLimit(checked);
    onCharLimitChange?.(checked, checked ? limitValue : undefined);
  };

  const handleLimitValueChange = (newLimit: string) => {
    const numValue = parseInt(newLimit, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setLimitValue(numValue);
      if (hasCharLimit) {
        onCharLimitChange?.(true, numValue);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Language indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-lg">🇬🇧</span>
          <span className="font-medium">English</span>
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{language}</span>
        </span>
      </div>

      {/* Main text editor */}
      <div className="relative">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'min-h-[120px] resize-none font-sans text-base',
            isOverLimit && 'border-destructive focus:ring-destructive',
            error && 'border-destructive focus:ring-destructive',
            className
          )}
        />
        
        {/* Character count */}
        {showCharLimit && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground pointer-events-none">
            <span className={cn(isOverLimit && 'text-destructive font-medium')}>
              {charCount}
            </span>
            {hasCharLimit && limitValue && (
              <span>/{limitValue}</span>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Character limit control */}
      {showCharLimit && (
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="char-limit"
              checked={hasCharLimit}
              onCheckedChange={handleCharLimitToggle}
              disabled={disabled}
            />
            <Label
              htmlFor="char-limit"
              className="text-sm font-normal cursor-pointer"
            >
              Set character limit
            </Label>
          </div>
          
          {hasCharLimit && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={limitValue}
                onChange={(e) => handleLimitValueChange(e.target.value)}
                disabled={disabled}
                min={1}
                className="w-20 h-8 text-sm"
              />
              <span className="text-sm text-muted-foreground">
                {!hasCharLimit ? 'Unlimited' : `${limitValue} characters`}
              </span>
            </div>
          )}
          
          {!hasCharLimit && (
            <span className="text-sm text-muted-foreground">Unlimited</span>
          )}
        </div>
      )}
    </div>
  );
});

TranslationTextEditor.displayName = 'TranslationTextEditor';