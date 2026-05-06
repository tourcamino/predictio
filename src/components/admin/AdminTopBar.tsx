import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface AdminTopBarProps {
  title: string;
  breadcrumbs?: string[];
}

export function AdminTopBar({ title, breadcrumbs = [] }: AdminTopBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

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
        <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Bell size={18} className="text-gray-400" />
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </div>
  );
}
