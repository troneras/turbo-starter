import { useState, useEffect } from 'react';
import { useSearch, useNavigate, Outlet, useMatches } from '@tanstack/react-router';
import {
    ArrowLeft,
    Search,
    Edit2,
    SortAsc,
    SortDesc
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/app/hooks/use-auth';
import { useSourceLanguageTranslations } from '../hooks/use-source-language-translations';

export function SourceLanguagePage() {
    const navigate = useNavigate();
    const searchParams = useSearch({ from: '/translations/source-language' });
    const { hasPermission } = useAuth();
    const matches = useMatches();

    // Check if we're on a child route (like edit page)
    const hasChildRoute = matches.some(match =>
        match.routeId.includes('/translations/source-language/$key')
    );

    // Initialize state from URL parameters
    const [searchFilter, setSearchFilter] = useState(searchParams?.search || '');
    const [sortBy, setSortBy] = useState<'key' | 'value' | 'updated'>(searchParams?.sortBy || 'key');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(searchParams?.sortOrder || 'asc');
    const [page, setPage] = useState(searchParams?.page || 1);
    const [pageSize] = useState(searchParams?.pageSize || 50);

    // Sync URL parameters with component state
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const params: Record<string, any> = {};
            if (searchFilter) params.search = searchFilter;
            if (sortBy !== 'key') params.sortBy = sortBy;
            if (sortOrder !== 'asc') params.sortOrder = sortOrder;
            if (page > 1) params.page = page;
            if (pageSize !== 50) params.pageSize = pageSize;

            // Only navigate if params actually changed
            const currentSearch = searchParams?.search || '';
            const currentSortBy = searchParams?.sortBy || 'key';
            const currentSortOrder = searchParams?.sortOrder || 'asc';
            const currentPage = searchParams?.page || 1;

            if (
                searchFilter !== currentSearch ||
                sortBy !== currentSortBy ||
                sortOrder !== currentSortOrder ||
                page !== currentPage
            ) {
                navigate({
                    to: '/translations/source-language',
                    search: params,
                    replace: true,
                });
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [searchFilter, sortBy, sortOrder, page]);

    // Fetch data
    const {
        data: translationsData,
        isLoading,
        error
    } = useSourceLanguageTranslations({
        search: searchFilter || undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        page,
        pageSize
    });

    const canEditTranslations = hasPermission('translations:update');

    const handleSort = (field: 'key' | 'value' | 'updated') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPage(1); // Reset to first page when sorting
    };

    const handleEdit = (translation: any) => {
        navigate({
            to: '/translations/source-language/$key/edit',
            params: { key: translation.entityKey }
        });
    };

    // If we're on a child route, render the outlet instead
    if (hasChildRoute) {
        return <Outlet />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: '/translations' })}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Languages
                    </Button>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-red-600">
                            Error loading source language translations: {error.message}
                        </div>
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
                        onClick={() => navigate({ to: '/translations' })}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Languages
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Source Language
                        </h1>
                        <p className="text-muted-foreground">
                            {translationsData?.pagination?.total || 0} translation keys
                        </p>
                    </div>
                </div>
            </div>

            {/* Translations Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Source Language Translations</CardTitle>
                    <CardDescription>
                        Manage source language translation keys and values
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    {/* Search Filter */}
                    <div className="mb-6">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search keys or values..."
                                value={searchFilter}
                                onChange={(e) => {
                                    setSearchFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort('key')}
                                            className="h-auto p-0 font-medium"
                                        >
                                            Key
                                            {sortBy === 'key' && (
                                                sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort('value')}
                                            className="h-auto p-0 font-medium"
                                        >
                                            String
                                            {sortBy === 'value' && (
                                                sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleSort('updated')}
                                            className="h-auto p-0 font-medium"
                                        >
                                            Updated
                                            {sortBy === 'updated' && (
                                                sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <div className="flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                                                <span className="ml-2">Loading translations...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : translationsData?.data?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No translations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    translationsData?.data?.map((translation) => (
                                        <TableRow key={translation.id}>
                                            <TableCell>
                                                <div className="font-mono text-sm">
                                                    {translation.entityKey}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-md">
                                                    <div className="text-sm">
                                                        {translation.value || (
                                                            <span className="text-muted-foreground italic">No value</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">
                                                    {translation.updatedAt
                                                        ? new Date(translation.updatedAt).toLocaleDateString()
                                                        : new Date(translation.createdAt).toLocaleDateString()
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canEditTranslations && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(translation)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {translationsData?.pagination && translationsData.pagination.total > pageSize && (
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, translationsData.pagination.total)} of {translationsData.pagination.total} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm">
                                    Page {page} of {Math.ceil(translationsData.pagination.total / pageSize)}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= Math.ceil(translationsData.pagination.total / pageSize)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}