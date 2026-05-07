import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Bell, LogOut } from 'lucide-react';
import { useAdmin } from '~/store/useAdminStore';

interface AdminTopBarProps {
  title: string;
  breadcrumbs?: string[];
}

export function AdminTopBar({ title, breadcrumbs = [] }: AdminTopBarProps) {
  const navigate = useNavigate();
  const { logout } = useAdmin();
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleLogout = () => {
    logout();
    void navigate({ to: '/admin' });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toUTCString().split(' ')[4]; // HH:MM:SS
  };

  return (
    <div className="h-16 border-b border-white/10 bg-black/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Admin</span>
        {breadcrumbs.map((crumb, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{crumb}</span>
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="text-gray-600">/</span>
          <span className="text-white font-medium">{title}</span>
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Live badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono font-bold text-green-500">LIVE</span>
        </div>

        {/* Clock */}
        <div className="text-sm font-mono text-gray-400">
          {formatTime(currentTime)} <span className="text-gray-600">UTC</span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-gray-400" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={16} aria-hidden />
          Logout
        </button>
      </div>
    </div>
  );
}
