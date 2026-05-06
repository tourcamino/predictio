import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';

interface AMMOrdersModalProps {
  onClose: () => void;
}

export function AMMOrdersModal({ onClose }: AMMOrdersModalProps) {
  const trpc = useTRPC();
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'FILLED' | 'CANCELLED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const ordersQuery = useQuery(
    trpc.getAmmOrders.queryOptions({
      status: statusFilter,
      page: currentPage,
      pageSize: 20,
    })
  );

  const orders = ordersQuery.data?.orders || [];
  const pagination = ordersQuery.data?.pagination;

  // Format time
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'FILLED':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'CANCELLED':
        return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-[#0A0E17] border border-white/10 p-6 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-syne font-bold text-white">
                    AMM Orders Log
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-4">
                  {(['ALL', 'ACTIVE', 'FILLED', 'CANCELLED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                      }}
                      className={`
                        px-4 py-2 rounded font-mono text-sm transition-colors
                        ${statusFilter === status
                          ? 'bg-brand-cyan text-black font-bold'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }
                      `}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  {ordersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No orders found
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Time
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Market
                          </th>
                          <th className="text-left py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Side
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Price
                          </th>
                          <th className="text-right py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Size
                          </th>
                          <th className="text-center py-3 px-4 text-xs font-mono text-gray-400 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono text-sm text-gray-300">
                              {formatTime(order.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-sm text-white max-w-xs truncate">
                              {order.marketName}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`
                                  font-mono text-xs font-bold px-2 py-1 rounded
                                  ${order.side === 'YES'
                                    ? 'bg-green-500/20 text-green-500'
                                    : 'bg-red-500/20 text-red-500'
                                  }
                                `}
                              >
                                {order.side}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-sm text-right text-white">
                              {order.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono text-sm text-right text-white">
                              ${Math.round(order.size)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`
                                  inline-block px-2 py-1 rounded text-xs font-mono border
                                  ${getStatusColor(order.status)}
                                `}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-400">
                      Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} orders)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={!pagination.hasPrevPage}
                        className="p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} className="text-white" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={!pagination.hasNextPage}
                        className="p-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
