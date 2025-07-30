import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, Plus, Rocket, RotateCcw, GitCompare, Loader2, Check, Trash2, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useRelease } from '@/app/providers/release-provider';
import type {
  Release,
  ReleaseListResponse,
  CreateReleaseRequest,
  PreviewDiffResponse,
} from '@cms/contracts/types/releases';
import { MoreHorizontal } from 'lucide-react';
import { ReleaseDetailsDrawer } from '../components/release-details-drawer';

export function ReleasesPage() {
  const queryClient = useQueryClient();
  const { activeRelease, setActiveRelease, refreshReleases } = useRelease();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [diffData, setDiffData] = useState<PreviewDiffResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRelease, setDrawerRelease] = useState<Release | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState<CreateReleaseRequest>({
    name: '',
    description: '',
  });

  // Fetch releases
  const { data, isLoading, error } = useQuery({
    queryKey: ['releases', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<ReleaseListResponse>('/releases', {
        params: { limit: 100 },
      });
      return response.data;
    },
  });

  // Create release mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateReleaseRequest) => {
      const response = await apiClient.post<Release>('/releases', data);
      return response.data;
    },
    onSuccess: (newRelease) => {
      toast.success('Release created successfully', {
        description: `${newRelease.name} has been created.`,
      });
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      // Switch to the new release and refresh the list
      setActiveRelease(newRelease);
      refreshReleases();
    },
    onError: (error: any) => {
      toast.error('Failed to create release', {
        description: error.response?.data?.message || 'An error occurred',
      });
    },
  });

  // Deploy release mutation
  const deployMutation = useMutation({
    mutationFn: async (releaseId: number) => {
      const response = await apiClient.post(`/releases/${releaseId}/deploy`, {
        confirmationToken: 'DEPLOY-CONFIRMED',
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Release deployed successfully', {
        description: 'The release is now live in production.',
      });
      refreshReleases();
      setDeployDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to deploy release', {
        description: error.response?.data?.message || 'An error occurred',
      });
    },
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: async (targetReleaseId: number) => {
      const response = await apiClient.post('/releases/rollback', {
        targetReleaseId,
        confirmationToken: 'ROLLBACK-CONFIRMED',
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Rollback completed successfully', {
        description: 'The previous release is now active.',
      });
      refreshReleases();
      setRollbackDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to rollback', {
        description: error.response?.data?.message || 'An error occurred',
      });
    },
  });

  // Preview diff mutation
  const diffMutation = useMutation({
    mutationFn: async ({ fromId, toId }: { fromId: number; toId: number }) => {
      const response = await apiClient.post<PreviewDiffResponse>('/releases/diff', {
        fromReleaseId: fromId,
        toReleaseId: toId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setDiffData(data);
      setDiffDialogOpen(true);
    },
    onError: (error: any) => {
      toast.error('Failed to generate diff', {
        description: error.response?.data?.message || 'An error occurred',
      });
    },
  });

  const releases = data?.releases || [];

  // Filter releases based on search and status
  const filteredReleases = releases.filter((release) => {
    const matchesSearch = !searchTerm || 
      release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      release.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || release.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: Release['status']) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'CLOSED':
        return 'secondary';
      case 'DEPLOYED':
        return 'default'; // Changed from 'success' as Badge doesn't have this variant
      case 'ROLLED_BACK':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDeploy = (release: Release) => {
    setSelectedRelease(release);
    setDeployDialogOpen(true);
  };

  const handleRollback = (release: Release) => {
    setSelectedRelease(release);
    setRollbackDialogOpen(true);
  };

  const handlePreviewDiff = (fromRelease: Release, toRelease: Release) => {
    diffMutation.mutate({ fromId: fromRelease.id, toId: toRelease.id });
  };

  const getCurrentDeployedRelease = () => {
    return releases.find(r => r.status === 'DEPLOYED');
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-lg text-muted-foreground">Failed to load releases</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['releases'] })} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Release Management</h1>
          <p className="text-muted-foreground">
            Manage content releases with Git-like branching and atomic deployments
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Release
        </Button>
      </div>

      {/* Active Release Card */}
      {activeRelease && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Release</CardTitle>
              <Badge variant={getStatusVariant(activeRelease.status)}>
                {activeRelease.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{activeRelease.name}</p>
                {activeRelease.description && (
                  <p className="text-sm text-muted-foreground">{activeRelease.description}</p>
                )}
              </div>
              {activeRelease.deploySeq && (
                <div className="text-right">
                  <p className="text-sm font-medium">Deploy #{activeRelease.deploySeq}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeRelease.deployedAt && formatDate(activeRelease.deployedAt)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Releases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Releases</CardTitle>
              <CardDescription>
                View and manage all releases in the system
              </CardDescription>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search releases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="DEPLOYED">Deployed</SelectItem>
                <SelectItem value="ROLLED_BACK">Rolled Back</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No releases match your filters' 
                  : 'No releases found'}
              </p>
              {releases.length === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
                  Create your first release
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Deployed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReleases.map((release) => (
                  <TableRow 
                    key={release.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setDrawerRelease(release);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{release.name}</p>
                        {release.description && (
                          <p className="text-sm text-muted-foreground">{release.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusVariant(release.status)}>
                          {release.status}
                        </Badge>
                        {release.conflicts?.hasConflicts && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center space-x-1 cursor-help">
                                  <AlertTriangle className="h-4 w-4 text-destructive" />
                                  <span className="text-xs text-destructive">
                                    {release.conflicts.totalCount}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-semibold">Release Conflicts</p>
                                  {release.conflicts.parallelCount > 0 && (
                                    <p className="text-sm">{release.conflicts.parallelCount} parallel work conflicts</p>
                                  )}
                                  {release.conflicts.overwriteCount > 0 && (
                                    <p className="text-sm">{release.conflicts.overwriteCount} overwrite conflicts</p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {release.changeCount !== undefined && release.changeCount > 0 ? (
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {release.changeCount} {release.changeCount === 1 ? 'change' : 'changes'}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No changes</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDate(release.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">by {release.createdBy}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {release.deployedAt ? (
                        <div>
                          <p className="text-sm">{formatDate(release.deployedAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            #{release.deploySeq} by {release.deployedBy}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {/* Status-specific actions */}
                          {release.status === 'OPEN' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setActiveRelease(release)}
                                disabled={activeRelease?.id === release.id}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                Set as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRelease(release);
                                  // TODO: Implement close dialog
                                }}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Close Release
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRelease(release);
                                  // TODO: Implement delete dialog
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {release.status === 'CLOSED' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setActiveRelease(release)}
                                disabled={activeRelease?.id === release.id}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                Set as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeploy(release)}
                                className="font-semibold"
                              >
                                <Rocket className="mr-2 h-4 w-4" />
                                Deploy to Production
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRelease(release);
                                  // TODO: Implement reopen
                                }}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Re-open
                              </DropdownMenuItem>
                              {getCurrentDeployedRelease() && (
                                <DropdownMenuItem
                                  onClick={() => handlePreviewDiff(getCurrentDeployedRelease()!, release)}
                                >
                                  <GitCompare className="mr-2 h-4 w-4" />
                                  Preview Changes
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {release.status === 'DEPLOYED' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setActiveRelease(release)}
                                disabled={activeRelease?.id === release.id}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                Set as Active
                              </DropdownMenuItem>
                              {release.deploySeq && release.deploySeq > 1 && (
                                <DropdownMenuItem onClick={() => handleRollback(release)}>
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Rollback
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handlePreviewDiff(getCurrentDeployedRelease()!, release)}
                              >
                                <GitCompare className="mr-2 h-4 w-4" />
                                View Changes
                              </DropdownMenuItem>
                            </>
                          )}
                          {release.status === 'ROLLED_BACK' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setActiveRelease(release)}
                                disabled={activeRelease?.id === release.id}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                Set as Active
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeploy(release)}
                              >
                                <Rocket className="mr-2 h-4 w-4" />
                                Re-deploy
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Release Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Release</DialogTitle>
            <DialogDescription>
              Create a new release to start making content changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Release Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Campaign 2025"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the changes in this release..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to deploy "{selectedRelease?.name}"? This will make all changes live.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => selectedRelease && deployMutation.mutate(selectedRelease.id)}
              disabled={deployMutation.isPending}
            >
              {deployMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deploy to Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback Release</DialogTitle>
            <DialogDescription>
              Are you sure you want to rollback? This will restore the previous release instantly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRelease && rollbackMutation.mutate(selectedRelease.id)}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Dialog */}
      <Dialog open={diffDialogOpen} onOpenChange={setDiffDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Changes</DialogTitle>
            <DialogDescription>
              Comparing "{diffData?.fromRelease.name}" to "{diffData?.toRelease.name}"
            </DialogDescription>
          </DialogHeader>
          {diffData && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Summary</p>
                    <p className="text-xs text-muted-foreground">
                      Total changes: {diffData.summary.totalChanges}
                    </p>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-green-600">{diffData.summary.added}</p>
                      <p className="text-xs text-muted-foreground">Added</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-blue-600">{diffData.summary.modified}</p>
                      <p className="text-xs text-muted-foreground">Modified</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-red-600">{diffData.summary.deleted}</p>
                      <p className="text-xs text-muted-foreground">Deleted</p>
                    </div>
                  </div>
                </div>

                {diffData.changes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No changes found</p>
                ) : (
                  <div className="space-y-2">
                    {diffData.changes.map((change, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                change.changeType === 'ADDED'
                                  ? 'default'
                                  : change.changeType === 'MODIFIED'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {change.changeType}
                            </Badge>
                            <span className="font-medium">{change.entityType}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">ID: {change.entityId}</span>
                        </div>
                        {change.differences && (
                          <div className="mt-2 space-y-1 text-sm">
                            {Object.entries(change.differences).map(([key, diff]) => (
                              <div key={key} className="font-mono">
                                <span className="text-muted-foreground">{key}:</span>
                                {typeof diff === 'object' && diff !== null && 'from' in diff && 'to' in diff ? (
                                  <>
                                    <span className="text-red-600 line-through ml-2">
                                      {String(diff.from)}
                                    </span>
                                    <span className="text-green-600 ml-2">
                                      {String(diff.to)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="ml-2">{JSON.stringify(diff)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDiffDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Details Drawer */}
      <ReleaseDetailsDrawer
        release={drawerRelease}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerRelease(null);
        }}
        onDeploy={(release) => {
          setDrawerOpen(false);
          handleDeploy(release);
        }}
        onCloseRelease={() => {
          setDrawerOpen(false);
          // TODO: Implement close release functionality
          toast.info('Close release functionality not yet implemented');
        }}
        onReopen={() => {
          setDrawerOpen(false);
          // TODO: Implement reopen functionality
          toast.info('Reopen functionality not yet implemented');
        }}
      />
    </div>
  );
}