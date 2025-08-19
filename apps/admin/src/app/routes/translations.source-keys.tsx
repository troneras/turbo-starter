import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SourceKeysPage } from '@/features/translations/pages/source-keys-page'

const searchSchema = z.object({
  locale: z.string().optional(),
})

export const Route = createFileRoute('/translations/source-keys')({
  component: SourceKeysPage,
  validateSearch: searchSchema,
})