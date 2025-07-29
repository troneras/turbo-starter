import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Layout from '../layouts/shell'
import { AuthLayout } from '../layouts/auth-layout'
import { AuthGuard } from '../layouts/auth-guard'
import { TestDevTools } from '@/components/test-devtools'
import { Toaster } from "@/components/ui/sonner"

export const Route = createRootRoute({
  component: () => {
    const location = useLocation();
    const isAuthRoute = location.pathname === '/login';

    if (isAuthRoute) {
      return (
        <>
          <AuthLayout>
            <Outlet />
          </AuthLayout>
          <TanStackRouterDevtools />
          <TestDevTools />
        </>
      );
    }

    return (
      <>
        <AuthGuard>
          <Layout>
            <Outlet />
          </Layout>
        </AuthGuard>
        <TanStackRouterDevtools />
        <TestDevTools />
        <Toaster />
      </>
    );
  },
})
