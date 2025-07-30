import type { ReactNode } from 'react';
import { ConditionalAuthProvider } from './conditional-auth-provider';
import { QueryProvider } from './query-provider';
import { ReleaseProvider } from './release-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ConditionalAuthProvider>
      <QueryProvider>
        <ReleaseProvider>
          {children}
        </ReleaseProvider>
      </QueryProvider>
    </ConditionalAuthProvider>
  );
}