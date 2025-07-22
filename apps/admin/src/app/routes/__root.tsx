import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Layout from '../layouts/shell'
import { AuthLayout } from '../layouts/auth-layout'
import { TestDevTools } from '@/components/test-devtools'

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
        <Layout>
          <Outlet />
        </Layout>
        <TanStackRouterDevtools />
        <TestDevTools />
      </>
    );
  },
})
