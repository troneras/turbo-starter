import { createFileRoute } from '@tanstack/react-router'
import { KeysPage } from '@/features/translations/pages/keys-page'

export const Route = createFileRoute('/keys')({
    component: KeysPage,
})