import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/translations')({
  component: () => <Outlet />,
})