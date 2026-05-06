import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AdminSidebar } from '~/components/admin/AdminSidebar';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
  beforeLoad: ({ location }) => {
    // Check if we're on the login page
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      return;
    }

    // For all other admin routes, check authentication
    const authData = localStorage.getItem('predictio_admin_auth');
    if (authData) {
      const { state } = JSON.parse(authData);
      if (!state?.isAuthenticated) {
        throw redirect({ to: '/admin' });
      }
    } else {
      throw redirect({ to: '/admin' });
    }
  },
});

function AdminLayout() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <AdminSidebar />
      <div className="ml-60">
        <Outlet />
      </div>
    </div>
  );
}
