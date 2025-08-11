import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { BrandsPage } from '@/features/brands/pages/brands-page';

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
});

export const Route = createFileRoute('/brands')({
  component: BrandsPage,
  validateSearch: searchSchema,
});