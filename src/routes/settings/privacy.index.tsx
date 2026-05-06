import { createFileRoute } from '@tanstack/react-router';
import { useSettingsStore } from '~/store/settingsStore';
import { useWalletStore } from '~/store/useWalletStore';
import { Download, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/settings/privacy/')({
  component: PrivacySettings,
});

function PrivacySettings() {
  const { analyticsEnabled, showOnLeaderboard, showEnsNames, update, exportSettings } = useSettingsStore();
  const { address } = useWalletStore();

  const handleClearLocalData = () => {
    if (confirm('Are you sure? This will clear all local preferences and notification history.')) {
      localStorage.clear();
      toast.success('Local data cleared');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExportData = () => {
    const data = {
      settings: exportSettings(),
      wallet: address,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">Privacy & data</h2>
        <p className="text-gray-400 text-sm">Control your data and privacy preferences</p>
      </div>

      {/* Local Data */}
      <div>
        <h3 className="font-semibold mb-3">Local data</h3>
        <p className="text-sm text-gray-400 mb-4">
          Predictio stores the following on your device:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 mb-4 ml-2">
          <li>Wallet connection state</li>
          <li>UI preferences (this page)</li>
          <li>Recent searches</li>
          <li>Notification history (last 500)</li>
          <li>Recent recipient addresses</li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={handleClearLocalData}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear all local data
          </button>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export local data
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Analytics</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={analyticsEnabled}
            onChange={(e) => update('analyticsEnabled', e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium mb-1">Allow anonymous analytics</div>
            <div className="text-xs text-gray-400 mb-2">
              We use Plausible (privacy-first, no cookies).
              No personal data, no tracking across sites.
            </div>
            <a
              href="https://plausible.io/data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-green hover:text-brand-green/80 transition-colors"
            >
              Learn more about what we collect →
            </a>
          </div>
        </label>
      </div>

      {/* Wallet Visibility */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Wallet visibility</h3>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">
                {address ? `Your wallet ${address.slice(0, 10)}...${address.slice(-8)}` : 'No wallet connected'}
              </p>
              <p className="text-sm text-gray-400">
                Your trades and positions are on-chain and publicly verifiable by anyone.
                This cannot be changed.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            If you want additional privacy, consider using a fresh wallet for Predictio activity.
          </p>
          <a
            href="https://ethereum.org/en/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-green hover:text-brand-green/80 transition-colors inline-block mt-2"
          >
            Learn about on-chain privacy →
          </a>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="font-semibold mb-3">Leaderboard</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnLeaderboard}
            onChange={(e) => update('showOnLeaderboard', e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium mb-1">Show my wallet on public leaderboard</div>
            <div className="text-xs text-gray-400">
              Note: your on-chain activity is public regardless.
              This toggle only hides your address from the leaderboard UI (soft privacy).
            </div>
          </div>
        </label>
      </div>

      {/* ENS Display */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">ENS display</h3>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showEnsNames}
            onChange={(e) => update('showEnsNames', e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium mb-1">Show ENS names when available</div>
            <div className="text-xs text-gray-400">
              Resolves and displays ENS names for addresses throughout the app.
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
