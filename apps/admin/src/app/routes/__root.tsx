import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Layout from '../layouts/shell'
import { AuthLayout } from '../layouts/auth-layout'

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
        </>
      );
    }
    
    return (
      <>
        <Layout>
          <Outlet />
        </Layout>
        <TanStackRouterDevtools />
      </>
    );
  },
})
