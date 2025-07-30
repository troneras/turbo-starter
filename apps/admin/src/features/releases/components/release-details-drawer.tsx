import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Rocket, AlertTriangle, FileText, Check, Calendar, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import type { Release, PreviewDiffResponse } from '@cms/contracts/types/releases';

interface ReleaseDetailsDrawerProps {
  release: Release | null;
  open: boolean;
  onClose: () => void;
  onDeploy?: (release: Release) => void;
  onReopen?: (release: Release) => void;
  onCloseRelease?: (release: Release) => void;
}

export function ReleaseDetailsDrawer({
  release,
  open,
  onClose,
  onDeploy,
  onReopen,
  onCloseRelease,
}: ReleaseDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Reset tab when drawer opens
  useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open]);

  // Fetch current deployed release for diff
  const { data: deployedRelease } = useQuery({
    queryKey: ['releases', 'deployed'],
    queryFn: async () => {
      const response = await apiClient.get<{ releases: Release[] }>('/releases', {
        params: { status: 'DEPLOYED', limit: 1 },
      });
      return response.data.releases[0] || null;
    },
    enabled: open && release?.status === 'CLOSED',
  });

  // Fetch diff data
  const { data: diffData, isLoading: isDiffLoading } = useQuery({
    queryKey: ['releases', 'diff', deployedRelease?.id, release?.id],
    queryFn: async () => {
      if (!deployedRelease || !release) return null;
      const response = await apiClient.post<PreviewDiffResponse>('/releases/diff', {
        fromReleaseId: deployedRelease.id,
        toReleaseId: release.id,
      });
      return response.data;
    },
    enabled: !!deployedRelease && !!release && release.status === 'CLOSED' && activeTab === 'changes',
  });

  if (!release) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusVariant = (status: Release['status']) => {
    switch (status) {
      case 'OPEN':
        return 'default';
      case 'CLOSED':
        return 'secondary';
      case 'DEPLOYED':
        return 'default';
      case 'ROLLED_BACK':
        return 'destructive';
      default:
        return 'default';
    }
  };


  const showDeployBanner = release.status === 'CLOSED' && !release.conflicts?.hasConflicts;
  const showConflictWarning = release.status === 'CLOSED' && release.conflicts?.hasConflicts;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{release.name}</SheetTitle>
            <Badge variant={getStatusVariant(release.status)}>
              {release.status}
            </Badge>
          </div>
          {release.description && (
            <SheetDescription>{release.description}</SheetDescription>
          )}
        </SheetHeader>

        {/* Deploy Banner */}
        {showDeployBanner && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Ready to Deploy</AlertTitle>
            <AlertDescription className="text-green-700">
              All checks passed • {release.changeCount || 0} changes • No conflicts
            </AlertDescription>
            <Button
              onClick={() => onDeploy?.(release)}
              className="mt-3"
              size="sm"
              variant="default"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Deploy to Production
            </Button>
          </Alert>
        )}

        {/* Conflict Warning */}
        {showConflictWarning && (
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Deployment Blocked</AlertTitle>
            <AlertDescription>
              This release has {release.conflicts?.totalCount} conflicts that must be resolved:
              {release.conflicts?.parallelCount && release.conflicts.parallelCount > 0 && (
                <span className="block mt-1">
                  • {release.conflicts.parallelCount} parallel work conflicts
                </span>
              )}
              {release.conflicts?.overwriteCount && release.conflicts.overwriteCount > 0 && (
                <span className="block">
                  • {release.conflicts.overwriteCount} overwrite conflicts
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="changes">
              Changes {release.changeCount ? `(${release.changeCount})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {/* Release Info */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Release Information</h3>
                <dl className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground flex items-center">
                      <Calendar className="mr-2 h-4 w-4" />
                      Created
                    </dt>
                    <dd>{formatDate(release.createdAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-muted-foreground flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Created by
                    </dt>
                    <dd>{release.createdBy}</dd>
                  </div>
                  {release.deployedAt && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-muted-foreground flex items-center">
                          <Rocket className="mr-2 h-4 w-4" />
                          Deployed
                        </dt>
                        <dd>{formatDate(release.deployedAt)}</dd>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <dt className="text-muted-foreground">Deploy Sequence</dt>
                        <dd>#{release.deploySeq}</dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              <Separator />

              {/* Statistics */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-semibold">{release.changeCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Changes</p>
                  </div>
                  {release.conflicts && (
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-semibold text-destructive">
                        {release.conflicts.totalCount}
                      </p>
                      <p className="text-sm text-muted-foreground">Conflicts</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4">
                {release.status === 'OPEN' && (
                  <Button 
                    onClick={() => onCloseRelease?.(release)} 
                    className="w-full"
                    variant="outline"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Close Release
                  </Button>
                )}
                {release.status === 'CLOSED' && !release.conflicts?.hasConflicts && (
                  <>
                    <Button 
                      onClick={() => onDeploy?.(release)} 
                      className="w-full"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy to Production
                    </Button>
                    <Button 
                      onClick={() => onReopen?.(release)} 
                      className="w-full"
                      variant="outline"
                    >
                      Re-open for Editing
                    </Button>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="changes" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {isDiffLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : diffData && diffData.changes.length > 0 ? (
                <div className="space-y-3">
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
                          <span className="font-medium capitalize">
                            {change.entityType.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ID: {change.entityId}
                        </span>
                      </div>
                      
                      {change.differences && (
                        <div className="mt-2 space-y-1 text-sm">
                          {Object.entries(change.differences).map(([key, diff]) => (
                            <div key={key} className="font-mono text-xs">
                              <span className="text-muted-foreground">{key}:</span>
                              {typeof diff === 'object' && diff !== null && 'from' in diff && 'to' in diff ? (
                                <div className="ml-4">
                                  <div className="text-red-600">
                                    - {String(diff.from)}
                                  </div>
                                  <div className="text-green-600">
                                    + {String(diff.to)}
                                  </div>
                                </div>
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-2" />
                  <p>No changes in this release</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}