import { createFileRoute } from '@tanstack/react-router'
import { SimpleTranslationsPage } from '@/features/translations/pages/simple-translations-page'

export const Route = createFileRoute('/translations-simple')({
  component: SimpleTranslationsPage,
})