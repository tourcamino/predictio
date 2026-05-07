import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { BarChart3, Target, PlusCircle, CheckCircle, Users, TrendingUp, Settings, LogOut, Zap, AlertTriangle, FileText, Briefcase, ListChecks } from 'lucide-react';
import { useAdmin } from '~/store/useAdminStore';
import { mockAnomalies } from '~/data/mockAdmin';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: BarChart3 },
  { label: 'Event Curation', path: '/admin/event-curation', icon: ListChecks },
  { label: 'Markets', path: '/admin/markets', icon: Target },
  { label: 'Create Market', path: '/admin/create', icon: PlusCircle },
  { label: 'Resolve Markets', path: '/admin/resolve', icon: CheckCircle },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
  { label: '⚡ Growth Engine', path: '/admin/growth', icon: Zap },
  { label: 'Blog Manager', path: '/admin/blog', icon: FileText },
  { label: 'Careers Manager', path: '/admin/careers', icon: Briefcase },
  { label: 'Anomalies', path: '/admin/anomalies', icon: AlertTriangle },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const criticalAnomalies = mockAnomalies.filter(
    (a) => a.severity === 'critical' && a.status === 'open'
  ).length;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-black border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="shrink-0 p-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-brand-green rounded-full"></div>
          <span className="text-lg font-syne font-bold">PREDICTIO ADMIN</span>
        </div>
        <div className="inline-block px-2 py-0.5 bg-brand-green/20 border border-brand-green/30 rounded text-xs font-mono text-brand-green">
          INTERNAL
        </div>
      </div>

      {/* Navigation — scrolls so footer (Logout) stays on screen */}
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || 
                          (item.path === '/admin/dashboard' && currentPath === '/admin');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'text-brand-green bg-brand-green/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-green rounded-r animate-slide-in-left" />
              )}
              <Icon size={18} />
              <span>{item.label}</span>
              {/* Show badge for Anomalies if there are critical issues */}
              {item.path === '/admin/anomalies' && criticalAnomalies > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {criticalAnomalies}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-white/10 space-y-3 bg-black">
        <div className="text-xs text-gray-500 font-mono">
          Logged in as: <span className="text-white">admin</span>
        </div>
        <button
          type="button"
          onClick={() => {
            logout();
            void navigate({ to: '/admin' });
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
