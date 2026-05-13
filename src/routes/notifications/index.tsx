import { createFileRoute, Link } from '@tanstack/react-router';
import { Bell, ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import { GuestPageState } from '~/components/GuestPageState';
import { WalletGateModal } from '~/components/WalletGateModal';
import { useWalletGate } from '~/hooks/useWalletGate';
import { useWallet } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { normalizeWalletForQuery } from '~/utils/walletQuery';

export const Route = createFileRoute('/notifications/')({
  component: NotificationsPage,
});

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'TRADE_FILLED':
      return '✅';
    case 'MARKET_RESOLVED':
      return '🏁';
    case 'POSITION_OPENED':
      return '📈';
    case 'MARKET_CLOSING_SOON':
      return '⏰';
    case 'LEADERBOARD_CHANGE':
      return '🏆';
    default:
      return '📬';
  }
}

function NotificationsPage() {
  const { address, isConnected } = useWallet();
  const walletKey = normalizeWalletForQuery(address);
  const { requireWallet, showGateModal, closeGateModal } = useWalletGate();
  const trpc = useTRPC();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const notificationsQuery = useQuery({
    ...trpc.getNotifications.queryOptions({
      walletAddress: walletKey,
      limit: 100,
      unreadOnly: filter === 'unread',
    }),
    enabled: !!walletKey && isConnected,
    refetchInterval: 90_000,
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation(
    trpc.markNotificationRead.mutationOptions()
  );

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read && walletKey) {
      await markReadMutation.mutateAsync({
        notificationId: notif.id,
        walletAddress: walletKey,
      });
      
      // Refetch to update UI
      notificationsQuery.refetch();
    }
  };

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back link */}
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-syne text-4xl font-bold mb-2">Notifications</h1>
          <p className="text-gray-400">
            Stay updated on your positions, market resolutions, and leaderboard changes
          </p>
        </div>

        {!isConnected ? (
          <div className="bg-white/5 rounded-lg p-12">
            <GuestPageState
              title="👀 Watching as guest"
              description="Connect wallet to view your notifications"
              onConnect={() => requireWallet()}
            />
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-brand-green/20 text-brand-green'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === 'unread'
                    ? 'bg-brand-green/20 text-brand-green'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-brand-green text-brand-bg text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notifications list */}
            {notificationsQuery.isLoading ? (
              <div className="bg-white/5 rounded-lg p-12 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-brand-green" />
                <p className="text-gray-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white/5 rounded-lg p-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h2 className="font-syne text-2xl font-bold mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h2>
                <p className="text-gray-400">
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : 'Notifications will appear here when you trade or markets resolve'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors ${
                      !notif.read ? 'border-l-4 border-brand-green' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-3xl flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h3 className="font-semibold text-lg flex items-center gap-2">
                            {!notif.read && (
                              <span className="w-2 h-2 bg-brand-green rounded-full flex-shrink-0 animate-pulse" />
                            )}
                            {notif.title}
                          </h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-gray-400 mb-3">{notif.message}</p>
                        <div className="flex items-center gap-4">
                          {notif.marketId && (
                            <Link
                              to="/markets/$marketId"
                              params={{ marketId: notif.marketId }}
                              onClick={() => handleNotificationClick(notif)}
                              className="text-sm text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1"
                            >
                              View market <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                          {!notif.read && (
                            <button
                              onClick={() => handleNotificationClick(notif)}
                              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      
      <WalletGateModal isOpen={showGateModal} onClose={closeGateModal} />
    </div>
  );
}

