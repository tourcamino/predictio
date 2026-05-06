import { useState, useEffect, useRef } from 'react';
import { X, Check, ExternalLink, Bell, Loader2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useNotificationStore } from '~/store/notificationStore';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'MARKET_RESOLVED':
      return '🏁';
    case 'POSITION_OPENED':
      return '📈';
    case 'MARKET_CLOSING_SOON':
      return '⏰';
    case 'LEADERBOARD_CHANGE':
      return '🏆';
    case 'COMMISSION_UPDATE':
      return '🎉';
    case 'NEW_FOLLOWER':
      return '👤';
    case 'FOLLOWER_MILESTONE':
      return '⭐';
    case 'NEW_ANALYST_PREDICTION':
      return '🎯';
    case 'LP_FEE_EARNED':
      return '💰';
    default:
      return '📬';
  }
}

export function NotificationCenter() {
  const {
    notifications,
    isOpen,
    setOpen,
    setNotifications,
    setUnreadCount,
    markReadLocally,
    markAllReadLocally,
    isLoading,
    setLoading,
  } = useNotificationStore();
  const { address } = useWallet();
  const trpc = useTRPC();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from DB
  const notificationsQuery = useQuery({
    ...trpc.getNotifications.queryOptions({
      walletAddress: address || '',
      limit: 50,
    }),
    enabled: !!address && isOpen,
    refetchInterval: 30000, // Refetch every 30 seconds when open
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation(
    trpc.markNotificationRead.mutationOptions()
  );

  // Mark all as read mutation
  const markAllReadMutation = useMutation(
    trpc.markAllNotificationsRead.mutationOptions()
  );

  // Update local state when data changes
  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data.notifications);
      setUnreadCount(notificationsQuery.data.unreadCount);
      setLoading(false);
    }
  }, [notificationsQuery.data, setNotifications, setUnreadCount, setLoading]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, setOpen]);

  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read && address) {
      // Optimistic update
      markReadLocally(notif.id);
      
      // Update in DB
      await markReadMutation.mutateAsync({
        notificationId: notif.id,
        walletAddress: address,
      });
    }
    
    // For LP fee notifications, navigate to liquidity page if no specific market
    if (notif.type === 'LP_FEE_EARNED') {
      if (!notif.marketId || notif.marketId === 'protocol-vault') {
        window.location.href = '/liquidity';
        setOpen(false);
      } else if (notif.marketId) {
        // For individual market LP fees, still go to the market page
        setOpen(false);
      }
    } else if (notif.marketId) {
      setOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!address) return;
    
    // Optimistic update
    markAllReadLocally();
    
    // Update in DB
    await markAllReadMutation.mutateAsync({
      walletAddress: address,
    });
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-brand-bg border border-brand-green/30 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-syne font-semibold text-lg">Notifications</h3>
        <div className="flex items-center gap-2">
          {hasNotifications && (
            <button
              onClick={handleMarkAllRead}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || notificationsQuery.isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-brand-green" />
            <p className="text-sm text-gray-400">Loading notifications...</p>
          </div>
        ) : !hasNotifications ? (
          <div className="p-8 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.slice(0, 5).map((notif) => (
              <div
                key={notif.id}
                className={`px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer ${
                  !notif.read ? 'bg-brand-green/5' : ''
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm text-white flex items-center gap-2">
                        {!notif.read && (
                          <span className="w-2 h-2 bg-brand-green rounded-full flex-shrink-0" />
                        )}
                        {notif.title}
                      </h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{notif.message}</p>
                    {notif.marketId && notif.type !== 'LP_FEE_EARNED' && (
                      <Link
                        to="/markets/$marketId"
                        params={{ marketId: notif.marketId }}
                        className="text-xs text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1 mt-2"
                      >
                        View market <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {notif.type === 'LP_FEE_EARNED' && (
                      <Link
                        to="/liquidity"
                        className="text-xs text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1 mt-2"
                      >
                        View vault <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center">
        <Link
          to="/notifications"
          onClick={() => setOpen(false)}
          className="text-sm text-brand-green hover:text-brand-green/80 transition-colors"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
