import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { UsersPage } from '@/features/users/pages/users-page'

const searchSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/users')({
  component: UsersPage,
  validateSearch: searchSchema,
})