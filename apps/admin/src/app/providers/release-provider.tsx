import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Release, ReleaseListResponse } from '@cms/contracts/types/releases';
import { toast } from 'sonner';

interface ReleaseContextValue {
  activeRelease: Release | null;
  isLoading: boolean;
  setActiveRelease: (release: Release | null) => void;
  refreshReleases: () => void;
}

const ReleaseContext = createContext<ReleaseContextValue | null>(null);

const ACTIVE_RELEASE_KEY = 'activeReleaseId';

export function ReleaseProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeReleaseId, setActiveReleaseId] = useState<number | null>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem(ACTIVE_RELEASE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  // Fetch all releases to find the active one
  const { data: releasesData, isLoading } = useQuery({
    queryKey: ['releases', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<ReleaseListResponse>('/releases', {
        params: { limit: 100 },
      });
      return response.data;
    },
    // Use default staleTime from QueryClient (5 minutes)
  });

  // Find the active release from the list
  const activeRelease = releasesData?.releases.find(r => r.id === activeReleaseId) || null;

  // If no active release is set, default to the deployed one
  useEffect(() => {
    if (!activeReleaseId && releasesData?.releases.length) {
      const deployedRelease = releasesData.releases.find(r => r.status === 'DEPLOYED');
      if (deployedRelease) {
        setActiveReleaseId(deployedRelease.id);
      }
    }
  }, [activeReleaseId, releasesData]);

  // Update API client headers when active release changes
  useEffect(() => {
    if (activeReleaseId) {
      apiClient.defaults.headers['X-CMS-Release'] = activeReleaseId.toString();
      localStorage.setItem(ACTIVE_RELEASE_KEY, activeReleaseId.toString());
    } else {
      delete apiClient.defaults.headers['X-CMS-Release'];
      localStorage.removeItem(ACTIVE_RELEASE_KEY);
    }
  }, [activeReleaseId]);

  const setActiveRelease = (release: Release | null) => {
    setActiveReleaseId(release?.id || null);
    if (release) {
      toast.success(`Switched to release: ${release.name}`, {
        description: `Status: ${release.status}`,
      });
    }
  };

  const refreshReleases = () => {
    queryClient.invalidateQueries({ queryKey: ['releases'] });
  };

  return (
    <ReleaseContext.Provider
      value={{
        activeRelease,
        isLoading,
        setActiveRelease,
        refreshReleases,
      }}
    >
      {children}
    </ReleaseContext.Provider>
  );
}

export function useRelease() {
  const context = useContext(ReleaseContext);
  if (!context) {
    throw new Error('useRelease must be used within a ReleaseProvider');
  }
  return context;
}