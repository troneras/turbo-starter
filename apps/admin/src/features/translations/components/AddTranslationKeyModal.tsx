import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface AddTranslationKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading?: boolean;
    onSubmit?: (data: {
        sourceKey: string;
        sourceContent: string;
        translationNote?: string;
        autoTranslateWithAI: boolean;
        stringType: string;
        hasCharacterLimit: boolean;
        characterLimit?: number;
    }) => void;
}

export function AddTranslationKeyModal({
    isOpen,
    onClose,
    onSubmit,
    isLoading = false
}: AddTranslationKeyModalProps) {
    const [sourceKey, setSourceKey] = useState('');
    const [sourceContent, setSourceContent] = useState('');
    const [translationNote, setTranslationNote] = useState('');
    const [autoTranslateWithAI, setAutoTranslateWithAI] = useState(true);
    const [stringType] = useState('Plain string'); // Fixed for now
    const [hasCharacterLimit, setHasCharacterLimit] = useState(false);
    const [characterLimit, setCharacterLimit] = useState(20);

    const handleSubmit = () => {
        if (!sourceKey.trim() || !sourceContent.trim()) {
            return; // Basic validation
        }

        onSubmit?.({
            sourceKey: sourceKey.trim(),
            sourceContent: sourceContent.trim(),
            translationNote: translationNote.trim() || undefined,
            autoTranslateWithAI,
            stringType,
            hasCharacterLimit,
            characterLimit: hasCharacterLimit ? characterLimit : undefined,
        });

        // Reset form
        setSourceKey('');
        setSourceContent('');
        setTranslationNote('');
        setAutoTranslateWithAI(true);
        setHasCharacterLimit(false);
        setCharacterLimit(20);

        onClose();
    };

    const handleClose = () => {
        // Reset form on close
        setSourceKey('');
        setSourceContent('');
        setTranslationNote('');
        setAutoTranslateWithAI(true);
        setHasCharacterLimit(false);
        setCharacterLimit(20);

        onClose();
    };

    const currentCharacterCount = sourceContent.length;
    const isOverLimit = hasCharacterLimit && currentCharacterCount > characterLimit;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add a new key</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Source key */}
                    <div className="space-y-2">
                        <Label htmlFor="source-key">Source key</Label>
                        <Input
                            id="source-key"
                            value={sourceKey}
                            onChange={(e) => setSourceKey(e.target.value)}
                            placeholder="login.email.label"
                        />
                    </div>

                    {/* Auto-translate with AI checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="auto-translate"
                            checked={autoTranslateWithAI}
                            onCheckedChange={(checked) => setAutoTranslateWithAI(checked as boolean)}
                        />
                        <Label
                            htmlFor="auto-translate"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Auto-translate with AI
                        </Label>
                    </div>

                    {/* String type */}
                    <div className="space-y-2">
                        <Label htmlFor="string-type">String type</Label>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>📄</span>
                            <span>{stringType}</span>
                        </div>
                    </div>

                    {/* Source content */}
                    <div className="space-y-2">
                        <Label htmlFor="source-content">Source content</Label>
                        <Textarea
                            id="source-content"
                            value={sourceContent}
                            onChange={(e) => setSourceContent(e.target.value)}
                            placeholder="Introduce your email"
                            className={`min-h-[120px] ${isOverLimit ? 'border-red-500' : ''}`}
                        />
                    </div>

                    {/* Character limit */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="character-limit"
                                checked={hasCharacterLimit}
                                onCheckedChange={(checked) => setHasCharacterLimit(checked as boolean)}
                            />
                            <Label
                                htmlFor="character-limit"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Set character limit
                            </Label>
                        </div>

                        {hasCharacterLimit && (
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="number"
                                        value={characterLimit}
                                        onChange={(e) => setCharacterLimit(parseInt(e.target.value) || 0)}
                                        className="w-20"
                                        min="1"
                                    />
                                    <span className="text-muted-foreground">/</span>
                                    <span className={isOverLimit ? 'text-red-500' : 'text-muted-foreground'}>
                                        {currentCharacterCount}
                                    </span>
                                </div>
                                {isOverLimit && (
                                    <span className="text-red-500 text-xs">Over limit</span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Translation note */}
                    <div className="space-y-2">
                        <Label htmlFor="translation-note" className="text-blue-600">
                            Translation note <span className="text-muted-foreground">optional</span>
                        </Label>
                        <Textarea
                            id="translation-note"
                            value={translationNote}
                            onChange={(e) => setTranslationNote(e.target.value)}
                            placeholder="Text above the email field in the login form"
                            className="min-h-[80px]"
                        />
                        <div className="text-right text-xs text-muted-foreground">
                            {translationNote.length}/1024
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                        CLOSE
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!sourceKey.trim() || !sourceContent.trim() || isOverLimit || isLoading}
                    >
                        {isLoading ? 'SAVING...' : 'SAVE & ADD NEXT'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
