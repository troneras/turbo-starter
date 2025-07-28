import { createFileRoute } from '@tanstack/react-router'
import { LanguagesPage } from '@/features/languages/pages/languages-page'

export const Route = createFileRoute('/languages')({
  component: LanguagesPage,
})