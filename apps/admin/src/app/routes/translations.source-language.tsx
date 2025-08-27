import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SourceLanguagePage } from '@/features/translations/pages/source-language-page'

const searchSchema = z.object({
  search: z.string().optional(),
  sortBy: z.enum(['key', 'value', 'updated']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
})

export const Route = createFileRoute('/translations/source-language')({
  component: SourceLanguagePage,
  validateSearch: searchSchema,
})