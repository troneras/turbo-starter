import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LanguagesPage } from '@/features/languages/pages/languages-page'

const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/languages')({
  component: LanguagesPage,
  validateSearch: searchSchema,
})