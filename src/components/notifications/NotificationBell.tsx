import { Bell } from 'lucide-react';
import { useNotificationStore } from '~/store/notificationStore';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export function NotificationBell() {
  const { unreadCount, toggleOpen, setUnreadCount } = useNotificationStore();
  const { address, isConnected } = useWallet();
  const trpc = useTRPC();

  // Fetch unread count from DB
  const notificationsQuery = useQuery({
    ...trpc.getNotifications.queryOptions({
      walletAddress: address || '',
      limit: 1, // We only need the count, not the actual notifications
      unreadOnly: true,
    }),
    enabled: !!address && isConnected,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Update local state when unread count changes
  useEffect(() => {
    if (notificationsQuery.data) {
      setUnreadCount(notificationsQuery.data.unreadCount);
    }
  }, [notificationsQuery.data, setUnreadCount]);

  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={toggleOpen}
      className="relative p-2 text-gray-300 hover:text-brand-green transition-colors rounded-lg hover:bg-white/5"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5" />
      
      {hasUnread && (
        <>
          {/* Pulsing dot for new notifications */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-green rounded-full animate-pulse" />
          
          {/* Badge with unread count */}
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-brand-green text-brand-bg text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </>
      )}
    </button>
  );
}
