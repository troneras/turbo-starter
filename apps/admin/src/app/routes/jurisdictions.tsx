import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { JurisdictionsPage } from '@/features/jurisdictions/pages/jurisdictions-page'

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  region: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/jurisdictions')({
  component: JurisdictionsPage,
  validateSearch: searchSchema,
})