import { createFileRoute } from '@tanstack/react-router';
import { useSettingsStore } from '~/store/settingsStore';

export const Route = createFileRoute('/settings/trading/')({
  component: TradingSettings,
});

function TradingSettings() {
  const {
    slippageTolerance,
    defaultOrderType,
    confirmModalEnabled,
    quickSellPercentages,
    advancedMode,
    keyboardShortcuts,
    update,
  } = useSettingsStore();

  const slippageOptions = [50, 100, 200, 500]; // 0.5%, 1%, 2%, 5%

  const toggleQuickSellPercentage = (pct: number) => {
    const newPercentages = quickSellPercentages.includes(pct)
      ? quickSellPercentages.filter((p) => p !== pct)
      : [...quickSellPercentages, pct].sort((a, b) => a - b);
    update('quickSellPercentages', newPercentages);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">Trading preferences</h2>
        <p className="text-gray-400 text-sm">Configure your default trading settings</p>
      </div>

      {/* Default Slippage */}
      <div>
        <h3 className="font-semibold mb-3">Default slippage tolerance</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {slippageOptions.map((bps) => (
            <button
              key={bps}
              onClick={() => update('slippageTolerance', bps)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                slippageTolerance === bps
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {(bps / 100).toFixed(1)}%
            </button>
          ))}
          <input
            type="number"
            value={slippageTolerance / 100}
            onChange={(e) => update('slippageTolerance', Math.max(0, parseFloat(e.target.value) || 0) * 100)}
            className="w-24 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-green/50 focus:outline-none"
            placeholder="Custom"
            step="0.1"
            min="0"
            max="50"
          />
        </div>
        <p className="text-sm text-gray-400">
          Applied by default to all trades. Can be overridden per trade.
        </p>
      </div>

      {/* Default Order Type */}
      <div>
        <h3 className="font-semibold mb-3">Default order type</h3>
        <div className="flex gap-2">
          <button
            onClick={() => update('defaultOrderType', 'market')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              defaultOrderType === 'market'
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => update('defaultOrderType', 'limit')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              defaultOrderType === 'limit'
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            Limit
          </button>
        </div>
      </div>

      {/* Confirm Modal */}
      <div>
        <h3 className="font-semibold mb-3">Confirm modal</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmModalEnabled}
            onChange={(e) => update('confirmModalEnabled', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium">Show confirmation modal on trades</div>
            <div className="text-xs text-gray-400">
              Uncheck for one-click trading (advanced users only)
            </div>
          </div>
        </label>
      </div>

      {/* Quick Sell Percentages */}
      <div>
        <h3 className="font-semibold mb-3">Quick sell percentages</h3>
        <div className="flex flex-wrap gap-2 mb-2">
          {[10, 25, 33, 50, 66, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => toggleQuickSellPercentage(pct)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                quickSellPercentages.includes(pct)
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          Customize buttons shown in sell controls.
        </p>
      </div>

      {/* Advanced Mode */}
      <div>
        <h3 className="font-semibold mb-3">Advanced mode</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={advancedMode}
            onChange={(e) => update('advancedMode', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium">Enable advanced trading mode</div>
            <div className="text-xs text-gray-400">
              Unlocks: limit orders, keyboard shortcuts, time-in-force options
            </div>
          </div>
        </label>
      </div>

      {/* Keyboard Shortcuts */}
      <div>
        <h3 className="font-semibold mb-3">Keyboard shortcuts</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={keyboardShortcuts}
            onChange={(e) => update('keyboardShortcuts', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium">Enable keyboard shortcuts</div>
            <div className="text-xs text-gray-400">
              Shortcuts: S (sell), B (buy), 1-4 (size %), Enter (submit), Esc (cancel)
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
