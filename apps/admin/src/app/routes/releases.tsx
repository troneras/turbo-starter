import { createFileRoute } from '@tanstack/react-router';
import { ReleasesPage } from '@/features/releases/pages/releases-page';

export const Route = createFileRoute('/releases')({
  component: ReleasesPage,
});