import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState } from 'react';
import { mockAnomalies } from '~/data/mockAdmin';
import { AlertTriangle, Eye, Snowflake, Shield, X, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/anomalies/')({
  component: AnomaliesPage,
});

type TabType = 'all' | 'critical' | 'warning' | 'cleared' | 'whitelisted';

interface TradeDetail {
  time: string;
  type: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  amount: number;
  price: number;
  pnl?: number;
}

function AnomaliesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [anomalies, setAnomalies] = useState(mockAnomalies);
  const [selectedAnomaly, setSelectedAnomaly] = useState<number | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Mock trade details for wash trading drawer
  const mockTrades: TradeDetail[] = [
    { time: '14:02:11', type: 'BUY', outcome: 'YES', amount: 200, price: 0.61 },
    { time: '14:08:33', type: 'SELL', outcome: 'YES', amount: 200, price: 0.63, pnl: 6.5 },
    { time: '14:09:01', type: 'BUY', outcome: 'YES', amount: 200, price: 0.61 },
    { time: '14:15:44', type: 'SELL', outcome: 'YES', amount: 200, price: 0.64, pnl: 9.8 },
    { time: '14:16:12', type: 'BUY', outcome: 'YES', amount: 200, price: 0.62 },
    { time: '14:22:03', type: 'SELL', outcome: 'YES', amount: 200, price: 0.63, pnl: 4.2 },
    { time: '14:23:45', type: 'BUY', outcome: 'YES', amount: 200, price: 0.61 },
  ];

  const filteredAnomalies = anomalies.filter((a) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'critical') return a.severity === 'critical';
    if (activeTab === 'warning') return a.severity === 'warning';
    if (activeTab === 'cleared') return a.status === 'reviewed';
    if (activeTab === 'whitelisted') return a.status === 'whitelisted';
    return true;
  });

  const criticalCount = anomalies.filter((a) => a.severity === 'critical' && a.status === 'open').length;
  const warningCount = anomalies.filter((a) => a.severity === 'warning' && a.status === 'open').length;
  const clearedCount = anomalies.filter((a) => a.status === 'reviewed').length;

  const handleViewTrades = (anomalyId: number) => {
    setSelectedAnomaly(anomalyId);
    setShowDrawer(true);
  };

  const handleFreezeWallet = (wallet: string) => {
    if (confirm(`Freeze wallet ${wallet}? This will block all future trades.`)) {
      toast.success(`❄️ Wallet ${wallet} frozen`);
    }
  };

  const handlePauseTrading = (market: string) => {
    if (confirm(`Pause trading on ${market}? Market will enter Under Review status.`)) {
      toast.success(`⚠️ Trading paused on ${market}`);
    }
  };

  const handleWhitelist = (id: number) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'whitelisted' as const } : a))
    );
    toast.success('✅ Added to whitelist · Future detections ignored');
  };

  const handleDismiss = (id: number) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'dismissed' as const } : a))
    );
    toast.success('Flag dismissed');
  };

  const handleMarkReviewed = (id: number) => {
    setAnomalies((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'reviewed' as const } : a))
    );
    toast.success('Marked as reviewed');
  };

  const handleExport = () => {
    toast.success('📊 Report exported to CSV');
  };

  const handleManualScan = () => {
    toast.loading('Running manual scan...', { duration: 2000 });
    setTimeout(() => {
      toast.success('Scan complete · No new anomalies detected');
    }, 2000);
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'critical' ? '🔴' : '🟡';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WASH_TRADING':
        return 'WASH TRADING';
      case 'PRICE_MANIPULATION':
        return 'PRICE MANIPULATION';
      case 'COORDINATED_TRADING':
        return 'COORDINATED TRADING';
      case 'UNUSUAL_VOLUME':
        return 'UNUSUAL VOLUME';
      case 'SYBIL_PATTERN':
        return 'SYBIL PATTERN';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Anomaly Detection" breadcrumbs={['Security']} />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-syne font-bold mb-2">Anomaly Detection</h1>
          <p className="text-gray-400">AI-assisted fraud prevention · Last scan: 2 min ago</p>
        </div>

        {/* Summary Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔴</span>
              <span className="text-sm text-gray-400">Critical:</span>
              <span className="text-xl font-mono font-bold text-red-500">{criticalCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🟡</span>
              <span className="text-sm text-gray-400">Warning:</span>
              <span className="text-xl font-mono font-bold text-yellow-500">{warningCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <span className="text-sm text-gray-400">Cleared:</span>
              <span className="text-xl font-mono font-bold text-green-500">{clearedCount}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleManualScan}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Run manual scan
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {(['all', 'critical', 'warning', 'cleared', 'whitelisted'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 font-medium transition-colors relative capitalize
                ${activeTab === tab ? 'text-brand-green' : 'text-gray-400 hover:text-white'}
              `}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-green" />
              )}
            </button>
          ))}
        </div>

        {/* Anomaly Cards */}
        <div className="space-y-4">
          {filteredAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`
                border rounded-xl p-6 space-y-4
                ${
                  anomaly.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{getSeverityIcon(anomaly.severity)}</span>
                    <h3 className="font-syne font-bold text-lg">
                      {getTypeLabel(anomaly.type)} · {anomaly.severity === 'critical' ? 'Critical' : 'Warning'}
                    </h3>
                  </div>
                  {anomaly.wallet && (
                    <div className="text-sm text-gray-400 font-mono mb-1">
                      Wallet: {anomaly.wallet}
                    </div>
                  )}
                  {anomaly.market && (
                    <div className="text-sm text-gray-400 font-mono mb-1">
                      Market: {anomaly.market}
                    </div>
                  )}
                  <div className="text-sm text-gray-300 mb-1">Pattern: {anomaly.detail}</div>
                  <div className="text-sm text-gray-400 font-mono">
                    Volume involved: ${anomaly.volume.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-400 font-mono">
                  Detected: {anomaly.detectedAt}
                </div>
              </div>

              {/* Actions */}
              {anomaly.status === 'open' && (
                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  {anomaly.wallet && anomaly.type === 'WASH_TRADING' && (
                    <button
                      onClick={() => handleViewTrades(anomaly.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View trades
                    </button>
                  )}
                  {anomaly.wallet && (
                    <button
                      onClick={() => handleFreezeWallet(anomaly.wallet!)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                    >
                      <Snowflake className="w-4 h-4" />
                      Freeze wallet
                    </button>
                  )}
                  {anomaly.market && anomaly.type === 'UNUSUAL_VOLUME' && (
                    <button
                      onClick={() => handlePauseTrading(anomaly.market!)}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Pause trading
                    </button>
                  )}
                  {anomaly.market && (
                    <button
                      onClick={() => handleMarkReviewed(anomaly.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      Mark as reviewed
                    </button>
                  )}
                  <button
                    onClick={() => handleWhitelist(anomaly.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Whitelist
                  </button>
                  <button
                    onClick={() => handleDismiss(anomaly.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trade Details Drawer */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="bg-brand-bg border-l border-white/10 w-full max-w-2xl h-full overflow-y-auto p-6 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-syne font-bold mb-2">Trade Details</h3>
                <div className="text-sm text-gray-400 font-mono">Wallet: 0x7f3a...b291</div>
                <div className="text-sm text-gray-400 font-mono">
                  Total volume: $3,200 · 14 trades
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-2 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trades Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      Outcome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-mono text-gray-400 uppercase">
                      P&L
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockTrades.map((trade, index) => (
                    <tr key={index} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-gray-400">{trade.time}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`
                            px-2 py-1 rounded text-xs font-mono
                            ${
                              trade.type === 'BUY'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }
                          `}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">{trade.outcome}</td>
                      <td className="px-4 py-3 font-mono">${trade.amount}</td>
                      <td className="px-4 py-3 font-mono">${trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono">
                        {trade.pnl ? (
                          <span className="text-green-500">+${trade.pnl.toFixed(1)}</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">P&L from wash:</span>
                  <span className="font-mono text-red-500">est. +$87 in fees extracted</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Risk score:</span>
                  <span className="font-mono font-bold text-red-500">94/100 🔴</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
