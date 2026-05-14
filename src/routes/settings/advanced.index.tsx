import { createFileRoute } from '@tanstack/react-router';
import { useSettingsStore } from '~/store/settingsStore';
import { CHAIN_CONFIG } from '~/config/chain';
import { isPredictioTestnet } from '~/lib/economySurface';
import { Download, Upload, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/settings/advanced/')({
  component: AdvancedSettings,
});

function AdvancedSettings() {
  const {
    customRpcUrl,
    gasBufferPct,
    wsAutoReconnect,
    wsFallbackPolling,
    debugPanelVisible,
    logWebSocketMessages,
    update,
    exportSettings,
    importSettings,
    resetToDefaults,
  } = useSettingsStore();

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = event.target?.result as string;
            const success = importSettings(json);
            if (success) {
              toast.success('Settings imported successfully');
            } else {
              toast.error('Failed to import settings');
            }
          } catch (error) {
            toast.error('Invalid settings file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportSettings = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `predictio-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Settings exported');
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      resetToDefaults();
      toast.success('Settings reset to defaults');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">Advanced</h2>
        <p className="text-gray-400 text-sm">Power user options and developer tools</p>
      </div>

      {/* Network */}
      <div>
        <h3 className="font-semibold mb-3">Network</h3>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Current network:</span>
            <span className="font-medium">{CHAIN_CONFIG.chainName || 'Demo Mode'}</span>
          </div>
          {CHAIN_CONFIG.rpcUrl && (
            <div className="flex justify-between">
              <span className="text-gray-400">RPC URL:</span>
              <span className="font-mono text-xs">{CHAIN_CONFIG.rpcUrl}</span>
            </div>
          )}
        </div>

        {debugPanelVisible && (
          <div className="mt-4 rounded-lg border border-brand-green/25 bg-brand-green/5 p-4 text-xs text-gray-300 space-y-2">
            <p className="font-semibold text-brand-green text-sm">Economic / network surface (debug)</p>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Testnet mode</span>
              <span className="font-mono">{isPredictioTestnet() ? 'yes' : 'no'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Expected chain id</span>
              <span className="font-mono">{CHAIN_CONFIG.chainId ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Seeded LP label (UI)</span>
              <span className="text-right text-gray-200">Platform-seeded liquidity</span>
            </div>
            <p className="text-[11px] text-gray-500 pt-1 border-t border-white/10">
              Shown for support / QA only. Not a financial or on-chain attestation.
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Custom RPC (optional)</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customRpcUrl || ''}
              onChange={(e) => update('customRpcUrl', e.target.value || null)}
              placeholder="https://your-rpc-url..."
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-green/50 focus:outline-none"
            />
            <button
              onClick={() => toast.success('RPC connection tested (mock)')}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Test
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Use your own RPC endpoint for better reliability.
          </p>
        </div>
      </div>

      {/* Gas Settings */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Gas settings</h3>
        <div>
          <label className="block text-sm mb-2">
            Gas buffer: <span className="font-medium text-brand-green">{gasBufferPct}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={gasBufferPct}
            onChange={(e) => update('gasBufferPct', parseInt(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-400 mt-2">
            Applied to estimates to prevent underpriced transactions.
          </p>
        </div>
      </div>

      {/* Real-time */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Real-time</h3>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">WebSocket:</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></span>
              <span className="text-sm font-medium text-brand-green">Connected</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Messages/min:</span>
            <span>142</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Reconnects (24h):</span>
            <span>2</span>
          </div>
          <button
            onClick={() => toast.success('Reconnected (mock)')}
            className="mt-3 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Reconnect now
          </button>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wsAutoReconnect}
              onChange={(e) => update('wsAutoReconnect', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Auto-reconnect on disconnect</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wsFallbackPolling}
              onChange={(e) => update('wsFallbackPolling', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Fallback to polling if offline</span>
          </label>
        </div>
      </div>

      {/* Developer Tools */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Developer tools</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={debugPanelVisible}
              onChange={(e) => update('debugPanelVisible', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Show debug panel</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={logWebSocketMessages}
              onChange={(e) => update('logWebSocketMessages', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Log WebSocket messages</span>
          </label>
        </div>
      </div>

      {/* Export / Import */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Export / Import settings</h3>
        <div className="flex gap-2">
          <button
            onClick={handleExportSettings}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export settings as JSON
          </button>
          <button
            onClick={handleImportSettings}
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import settings from JSON
          </button>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Reset</h3>
        <button
          onClick={handleResetSettings}
          className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset all settings to defaults
        </button>
      </div>
    </div>
  );
}
