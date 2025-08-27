import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { EditSourceKeyPage } from '@/features/translations/pages/edit-source-key-page'

const paramsSchema = z.object({
  key: z.string(),
})

export const Route = createFileRoute('/translations/source-language/$key/edit')({
  component: EditSourceKeyPage,
  params: paramsSchema,
})