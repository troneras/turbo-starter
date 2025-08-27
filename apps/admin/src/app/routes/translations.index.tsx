import { createFileRoute } from '@tanstack/react-router'
import { TranslationsPage } from '@/features/translations/pages/translations-page'

export const Route = createFileRoute('/translations/')({
  component: TranslationsPage,
})