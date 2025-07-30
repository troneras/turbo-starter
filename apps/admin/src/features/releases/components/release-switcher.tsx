import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRelease } from '@/app/providers/release-provider';
import { apiClient } from '@/lib/api-client';
import type { Release, ReleaseListResponse } from '@cms/contracts/types/releases';
import { cn } from '@/lib/utils';

interface ReleaseSwitcherProps {
  onCreateNew?: () => void;
}

export function ReleaseSwitcher({ onCreateNew }: ReleaseSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { activeRelease, setActiveRelease } = useRelease();

  const { data, isLoading } = useQuery({
    queryKey: ['releases', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<ReleaseListResponse>('/releases', {
        params: { limit: 50 },
      });
      return response.data;
    },
    // Use default staleTime from QueryClient (5 minutes)
  });

  const releases = data?.releases || [];

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

  const getStatusLabel = (status: Release['status']) => {
    switch (status) {
      case 'OPEN':
        return 'Open';
      case 'CLOSED':
        return 'Closed';
      case 'DEPLOYED':
        return 'Deployed';
      case 'ROLLED_BACK':
        return 'Rolled Back';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <Skeleton className="h-8 w-[200px]" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {activeRelease ? activeRelease.name : 'Select release...'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {activeRelease && (
              <Badge variant={getStatusVariant(activeRelease.status)} className="ml-auto">
                {getStatusLabel(activeRelease.status)}
              </Badge>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search releases..." />
          <CommandList>
            <CommandEmpty>No releases found.</CommandEmpty>
            <CommandGroup heading="Releases">
              {releases.map((release) => (
                <CommandItem
                  key={release.id}
                  value={release.name}
                  onSelect={() => {
                    setActiveRelease(release);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center space-x-2">
                      <Check
                        className={cn(
                          'h-4 w-4',
                          activeRelease?.id === release.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div>
                        <p className="font-medium">{release.name}</p>
                        {release.deploySeq && (
                          <p className="text-xs text-muted-foreground">
                            Deploy #{release.deploySeq}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(release.status)} className="ml-2">
                      {getStatusLabel(release.status)}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      onCreateNew();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new release
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}