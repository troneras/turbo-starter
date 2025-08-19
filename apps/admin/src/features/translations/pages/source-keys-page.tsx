import { useState, useMemo } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import {
    ArrowLeft,
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    Copy,
    Clock,
    Tag,
    FileText,
    Hash,
    ChevronRight,
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/hooks/use-auth';

// Mock source key data
interface SourceKey {
    id: number;
    key: string;
    value: string;
    description?: string;
    tags: string[];
    state: 'active' | 'deprecated' | 'draft';
    priority: 'normal' | 'high' | 'low';
    maxLength?: number;
    createdAt: string;
    updatedAt: string;
    usageCount: number;
}

// Generate mock source keys
function generateMockSourceKeys(): SourceKey[] {
    return [
        {
            id: 1,
            key: 'affirmative_affirmation',
            value: 'Affirmative, it is so Test!',
            description: 'Confirmation message for affirmative actions',
            tags: ['ui', 'confirmation'],
            state: 'active',
            priority: 'normal',
            maxLength: 50,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
            usageCount: 12
        },
        {
            id: 2,
            key: 'afternoon_delight',
            value: 'Basking in the cosmic glow - good afternoon!',
            description: 'Afternoon greeting message',
            tags: ['greeting', 'time-based'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-16T14:30:00Z',
            updatedAt: '2024-01-16T14:30:00Z',
            usageCount: 8
        },
        {
            id: 3,
            key: 'apology_statement',
            value: 'Apologies, a meteoric slip on my part.',
            description: 'Error acknowledgment message',
            tags: ['error', 'apology'],
            state: 'active',
            priority: 'high',
            createdAt: '2024-01-17T09:15:00Z',
            updatedAt: '2024-01-18T11:20:00Z',
            usageCount: 25
        },
        {
            id: 4,
            key: 'cosmic_farewell',
            value: 'Farewell, intergalactic friend!',
            description: 'Goodbye message',
            tags: ['greeting', 'farewell'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-18T16:45:00Z',
            updatedAt: '2024-01-18T16:45:00Z',
            usageCount: 15
        },
        {
            id: 5,
            key: 'courteous_plea',
            value: 'If it pleases, your assistance is sought.',
            description: 'Polite request for help',
            tags: ['request', 'polite'],
            state: 'active',
            priority: 'normal',
            maxLength: 100,
            createdAt: '2024-01-19T11:00:00Z',
            updatedAt: '2024-01-19T11:00:00Z',
            usageCount: 6
        },
        {
            id: 6,
            key: 'galactic_welcome',
            value: 'Step into the cosmic embrace - welcome!',
            description: 'Welcome message for new users',
            tags: ['greeting', 'welcome', 'onboarding'],
            state: 'active',
            priority: 'high',
            createdAt: '2024-01-20T08:30:00Z',
            updatedAt: '2024-01-20T08:30:00Z',
            usageCount: 42
        },
        {
            id: 7,
            key: 'gratitude_expression',
            value: 'Infinite thanks, you\'re a stellar being!',
            description: 'Thank you message',
            tags: ['gratitude', 'positive'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-21T13:20:00Z',
            updatedAt: '2024-01-21T13:20:00Z',
            usageCount: 18
        },
        {
            id: 8,
            key: 'inquisitive_query',
            value: 'Curious minds inquire: How art thou?',
            description: 'Question about user state',
            tags: ['question', 'greeting'],
            state: 'active',
            priority: 'low',
            createdAt: '2024-01-22T10:45:00Z',
            updatedAt: '2024-01-22T10:45:00Z',
            usageCount: 3
        },
        {
            id: 9,
            key: 'lalala_ddfasdf',
            value: 'adsfadsfa',
            description: 'Test key - needs review',
            tags: ['test'],
            state: 'draft',
            priority: 'low',
            createdAt: '2024-01-23T15:30:00Z',
            updatedAt: '2024-01-23T15:30:00Z',
            usageCount: 0
        },
        {
            id: 10,
            key: 'morning_celebration',
            value: 'Rise and shine, oh radiant one! Good morning!',
            description: 'Morning greeting',
            tags: ['greeting', 'time-based', 'morning'],
            state: 'active',
            priority: 'normal',
            maxLength: 60,
            createdAt: '2024-01-24T07:00:00Z',
            updatedAt: '2024-01-24T07:00:00Z',
            usageCount: 20
        },
        {
            id: 11,
            key: 'negative_negation',
            value: 'Negative, the answer lies beyond the horizon.',
            description: 'Negative response message',
            tags: ['response', 'negative'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-25T12:15:00Z',
            updatedAt: '2024-01-25T12:15:00Z',
            usageCount: 9
        },
        {
            id: 12,
            key: 'polite_interjection',
            value: 'Kindly pardon, a gentle request awaits.',
            description: 'Polite interruption message',
            tags: ['polite', 'request'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-26T14:00:00Z',
            updatedAt: '2024-01-26T14:00:00Z',
            usageCount: 7
        },
        {
            id: 13,
            key: 'app.title',
            value: 'CMS Translation Platform',
            description: 'Application title shown in header',
            tags: ['app', 'branding'],
            state: 'active',
            priority: 'high',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            usageCount: 100
        },
        {
            id: 14,
            key: 'error.network_failure',
            value: 'Network connection failed. Please check your internet.',
            description: 'Network error message',
            tags: ['error', 'network'],
            state: 'active',
            priority: 'high',
            createdAt: '2024-01-10T09:00:00Z',
            updatedAt: '2024-01-10T09:00:00Z',
            usageCount: 5
        },
        {
            id: 15,
            key: 'form.submit_button',
            value: 'Submit',
            description: 'Generic form submit button label',
            tags: ['form', 'action'],
            state: 'active',
            priority: 'normal',
            maxLength: 20,
            createdAt: '2024-01-05T11:30:00Z',
            updatedAt: '2024-01-05T11:30:00Z',
            usageCount: 55
        },
        {
            id: 16,
            key: 'user.profile_updated',
            value: 'Your profile has been successfully updated.',
            description: 'Success message after profile update',
            tags: ['user', 'success', 'profile'],
            state: 'active',
            priority: 'normal',
            createdAt: '2024-01-12T16:20:00Z',
            updatedAt: '2024-01-12T16:20:00Z',
            usageCount: 14
        }
    ];
}

const priorityColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    normal: 'bg-blue-100 text-blue-700 border-blue-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200'
};

const stateColors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    deprecated: 'bg-gray-100 text-gray-700 border-gray-200'
};

export function SourceKeysPage() {
    const navigate = useNavigate();
    const searchParams = useSearch({ from: '/translations/source-keys' });
    const locale = searchParams.locale || 'en';
    const { hasPermission } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [stateFilter, setStateFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'key' | 'updated' | 'usage'>('key');

    // Mock data
    const sourceKeys = useMemo(() => generateMockSourceKeys(), []);

    // Extract all unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        sourceKeys.forEach(key => key.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [sourceKeys]);

    // Filter and sort keys
    const filteredKeys = useMemo(() => {
        let filtered = sourceKeys;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(key =>
                key.key.toLowerCase().includes(query) ||
                key.value.toLowerCase().includes(query) ||
                key.description?.toLowerCase().includes(query) ||
                key.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        // State filter
        if (stateFilter !== 'all') {
            filtered = filtered.filter(key => key.state === stateFilter);
        }

        // Priority filter
        if (priorityFilter !== 'all') {
            filtered = filtered.filter(key => key.priority === priorityFilter);
        }

        // Tag filter
        if (tagFilter !== 'all') {
            filtered = filtered.filter(key => key.tags.includes(tagFilter));
        }

        // Sort
        switch (sortBy) {
            case 'updated':
                filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                break;
            case 'usage':
                filtered.sort((a, b) => b.usageCount - a.usageCount);
                break;
            default:
                filtered.sort((a, b) => a.key.localeCompare(b.key));
        }

        return filtered;
    }, [sourceKeys, searchQuery, stateFilter, priorityFilter, tagFilter, sortBy]);

    const canManageKeys = hasPermission('translations:create') || hasPermission('translations:edit');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: '/translations' })}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Languages
                    </Button>
                    <div className="h-8 w-px bg-border" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            Source Keys
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                                {locale.toUpperCase()}
                            </Badge>
                        </h1>
                        <p className="text-muted-foreground">
                            {filteredKeys.length} translation keys
                        </p>
                    </div>
                </div>
                {canManageKeys && (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Key
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sourceKeys.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {sourceKeys.filter(k => k.state === 'active').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Draft Keys</CardTitle>
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {sourceKeys.filter(k => k.state === 'draft').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tags Used</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{allTags.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Keys Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Translation Keys</CardTitle>
                    <CardDescription>
                        Manage source language keys and their metadata
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 mb-6">
                        <div className="flex-1 min-w-64">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search keys, values, or tags..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select value={stateFilter} onValueChange={setStateFilter}>
                            <SelectTrigger className="w-36">
                                <Filter className="mr-2 h-4 w-4" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All States</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="deprecated">Deprecated</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={tagFilter} onValueChange={setTagFilter}>
                            <SelectTrigger className="w-36">
                                <Tag className="mr-2 h-4 w-4" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Tags</SelectItem>
                                {allTags.map(tag => (
                                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="key">Sort by Key</SelectItem>
                                <SelectItem value="updated">Sort by Updated</SelectItem>
                                <SelectItem value="usage">Sort by Usage</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>State</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>String</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead className="text-center">Usage</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredKeys.map((key) => (
                                    <TableRow key={key.id} className="group">
                                        <TableCell>
                                            <Badge variant="outline" className={stateColors[key.state]}>
                                                {key.state}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={priorityColors[key.priority]}>
                                                {key.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-mono text-sm font-medium">{key.key}</div>
                                                {key.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {key.description}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-96">
                                                <div className="text-sm">{key.value}</div>
                                                {key.maxLength && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Max length: {key.maxLength}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {key.tags.map(tag => (
                                                    <Badge key={tag} variant="secondary" className="text-xs">
                                                        <Tag className="h-3 w-3 mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <div className="text-sm font-medium">{key.usageCount}</div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Used in {key.usageCount} place{key.usageCount !== 1 ? 's' : ''}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => { }}>
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        Edit Key
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { }}>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Duplicate Key
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { }}>
                                                        <Clock className="mr-2 h-4 w-4" />
                                                        View History
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => { }}
                                                        className="text-red-600"
                                                        disabled={key.usageCount > 0}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Key
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
