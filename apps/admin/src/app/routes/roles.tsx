import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RolesPage } from '@/features/roles/pages/roles-page'

const searchSchema = z.object({
  search: z.string().optional(),
  hasPermission: z.string().optional(),
  parentRole: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/roles')({
  component: RolesPage,
  validateSearch: searchSchema,
})