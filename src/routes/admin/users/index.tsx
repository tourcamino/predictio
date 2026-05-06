import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { mockUsers } from '~/data/mockAdmin';
import { Eye, Flag, Ban, AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/admin/users/')({
  component: AdminUsers,
});

function AdminUsers() {
  const [filter, setFilter] = useState<'all' | 'flagged' | 'frozen'>('all');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimeAgo = (date: Date) => {
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return `${Math.floor((Date.now() - date.getTime()) / (1000 * 60))}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  const filteredUsers = mockUsers.filter((user) => {
    if (filter === 'flagged') return user.isFlagged;
    if (filter === 'frozen') return user.isFrozen;
    return true;
  });

  const flaggedCount = mockUsers.filter((u) => u.isFlagged).length;
  const frozenCount = mockUsers.filter((u) => u.isFrozen).length;

  const riskAlerts = mockUsers.filter(u => u.riskFlags.length > 0);

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Users" />
      
      <div className="p-6 space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Total Users</div>
            <div className="text-2xl font-mono font-bold">12,847</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">Active Today</div>
            <div className="text-2xl font-mono font-bold text-green-500">3,241</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">New This Week</div>
            <div className="text-2xl font-mono font-bold text-blue-500">847</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">New Today</div>
            <div className="text-2xl font-mono font-bold text-yellow-500">234</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                filter === 'all'
                  ? 'bg-brand-green text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }
            `}
          >
            All
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                filter === 'flagged'
                  ? 'bg-brand-green text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }
            `}
          >
            Flagged ({flaggedCount})
          </button>
          <button
            onClick={() => setFilter('frozen')}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${
                filter === 'frozen'
                  ? 'bg-brand-green text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }
            `}
          >
            Frozen ({frozenCount})
          </button>
        </div>

        {/* Risk Alerts */}
        {riskAlerts.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={20} />
              <h3 className="font-syne font-bold text-red-500">Risk Alerts ({riskAlerts.length})</h3>
            </div>
            <div className="space-y-2">
              {riskAlerts.map((user) => (
                <div key={user.address} className="space-y-1">
                  {user.riskFlags.map((flag, index) => (
                    <div key={index} className="text-sm text-gray-300 font-mono">
                      • {user.address.slice(0, 10)}... — {flag}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Wallet</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">First Seen</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Last Active</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Predictions</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Volume</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">P&L</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Win Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.address} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm">
                          {user.address.slice(0, 10)}...{user.address.slice(-8)}
                        </div>
                        {user.isFlagged && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs font-mono text-yellow-500">
                            ⚠ Flagged
                          </span>
                        )}
                        {user.isFrozen && (
                          <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-xs font-mono text-blue-400">
                            ❄ Frozen
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">
                      {formatDate(user.firstSeen)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-400">
                      {formatTimeAgo(user.lastActive)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      {user.predictions}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      ${user.volume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <span className={user.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {user.pnl >= 0 ? '+' : ''}${user.pnl.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-white">
                      {user.winRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono font-bold ${getRiskScoreColor(user.riskScore)}`}>
                        {user.riskScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.status === 'active' ? (
                        <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-mono text-green-500">
                          🟢 Active
                        </span>
                      ) : user.status === 'review' ? (
                        <span className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded text-xs font-mono text-yellow-500">
                          ⚠️ Review
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-xs font-mono text-red-500">
                          🔴 Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="View">
                          <Eye size={16} className="text-gray-400" />
                        </button>
                        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Flag">
                          <Flag size={16} className="text-yellow-500" />
                        </button>
                        {user.status === 'review' && (
                          <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Suspend">
                            <Ban size={16} className="text-red-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
