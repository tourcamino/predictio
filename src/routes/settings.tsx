import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { 
  TrendingUp, 
  Monitor, 
  Bell, 
  Shield, 
  Settings2,
  Info 
} from 'lucide-react';

export const Route = createFileRoute('/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  const categories = [
    { id: 'trading', label: 'Trading', icon: TrendingUp, path: '/settings/trading' },
    { id: 'display', label: 'Display', icon: Monitor, path: '/settings/display' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications' },
    { id: 'privacy', label: 'Privacy', icon: Shield, path: '/settings/privacy' },
    { id: 'advanced', label: 'Advanced', icon: Settings2, path: '/settings/advanced' },
    { id: 'about', label: 'About', icon: Info, path: '/settings/about' },
  ];

  return (
    <div className="min-h-screen bg-brand-bg pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-syne font-bold mb-2">Settings</h1>
          <p className="text-gray-400">Manage your preferences and account settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 lg:sticky lg:top-24">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.id}
                    to={category.path}
                    activeProps={{
                      className: 'bg-brand-green/20 text-brand-green border-brand-green/30',
                    }}
                    inactiveProps={{
                      className: 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent',
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{category.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
