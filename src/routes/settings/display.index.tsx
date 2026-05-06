import { createFileRoute } from '@tanstack/react-router';
import { useSettingsStore } from '~/store/settingsStore';

export const Route = createFileRoute('/settings/display/')({
  component: DisplaySettings,
});

function DisplaySettings() {
  const {
    theme,
    currency,
    numberFormat,
    timezone,
    compactMode,
    animationsEnabled,
    priceFlashAnimations,
    celebrationAnimations,
    update,
  } = useSettingsStore();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">Display & theme</h2>
        <p className="text-gray-400 text-sm">Customize how Predictio looks and feels</p>
      </div>

      {/* Theme */}
      <div>
        <h3 className="font-semibold mb-3">Theme</h3>
        <div className="flex gap-2">
          {(['dark', 'light', 'auto'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update('theme', t)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors capitalize ${
                theme === t
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Auto follows your system preference.
        </p>
      </div>

      {/* Currency */}
      <div>
        <h3 className="font-semibold mb-3">Currency display</h3>
        <div className="flex gap-2">
          {(['USD', 'EUR', 'GBP', 'USDC'] as const).map((c) => (
            <button
              key={c}
              onClick={() => update('currency', c)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                currency === c
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Balances shown in selected currency (FX rate cached daily).
        </p>
      </div>

      {/* Number Format */}
      <div>
        <h3 className="font-semibold mb-3">Number format</h3>
        <div className="flex gap-2">
          <button
            onClick={() => update('numberFormat', 'en')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              numberFormat === 'en'
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            1,234.56
          </button>
          <button
            onClick={() => update('numberFormat', 'de')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              numberFormat === 'de'
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            1.234,56
          </button>
          <button
            onClick={() => update('numberFormat', 'fr')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              numberFormat === 'fr'
                ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
            }`}
          >
            1 234.56
          </button>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <h3 className="font-semibold mb-3">Timezone</h3>
        <select
          value={timezone}
          onChange={(e) => update('timezone', e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-green/50 focus:outline-none"
        >
          <option value="America/New_York">America/New York (EST/EDT)</option>
          <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
          <option value="America/Chicago">America/Chicago (CST/CDT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
          <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
          <option value="UTC">UTC</option>
        </select>
        <p className="text-sm text-gray-400 mt-2">
          Current: {timezone}
        </p>
      </div>

      {/* Compact Mode */}
      <div>
        <h3 className="font-semibold mb-3">Compact mode</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={compactMode}
            onChange={(e) => update('compactMode', e.target.checked)}
            className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
          />
          <div>
            <div className="text-sm font-medium">Reduce padding, denser UI</div>
            <div className="text-xs text-gray-400">
              More information per screen (desktop only)
            </div>
          </div>
        </label>
      </div>

      {/* Animations */}
      <div>
        <h3 className="font-semibold mb-3">Animations</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={animationsEnabled}
              onChange={(e) => update('animationsEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Enable all animations</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer ml-8">
            <input
              type="checkbox"
              checked={priceFlashAnimations}
              onChange={(e) => update('priceFlashAnimations', e.target.checked)}
              disabled={!animationsEnabled}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0 disabled:opacity-50"
            />
            <span className="text-sm">Enable price flash animations</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer ml-8">
            <input
              type="checkbox"
              checked={celebrationAnimations}
              onChange={(e) => update('celebrationAnimations', e.target.checked)}
              disabled={!animationsEnabled}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0 disabled:opacity-50"
            />
            <span className="text-sm">Enable celebration on claim</span>
          </label>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Reduce motion: follows system prefers-reduced-motion.
        </p>
      </div>
    </div>
  );
}
