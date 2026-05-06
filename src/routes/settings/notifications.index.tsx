import { createFileRoute } from '@tanstack/react-router';
import { useSettingsStore } from '~/store/settingsStore';
import { AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/settings/notifications/')({
  component: NotificationsSettings,
});

function NotificationsSettings() {
  const { notificationPreferences, updateNotificationPreference } = useSettingsStore();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">Notifications</h2>
        <p className="text-gray-400 text-sm">Manage how and when you receive notifications</p>
      </div>

      {/* In-app Notifications Header */}
      <div>
        <h3 className="font-semibold mb-1">In-app notifications</h3>
        <p className="text-sm text-gray-400">Show notifications inside the app (bell icon)</p>
      </div>

      {/* Trade Events */}
      <div>
        <h4 className="font-medium mb-3 text-brand-green">Trade events</h4>
        <div className="space-y-3 ml-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.tradeFilled}
              onChange={(e) => updateNotificationPreference('tradeFilled', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Order filled</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.tradePartialFill}
              onChange={(e) => updateNotificationPreference('tradePartialFill', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Order partial fill</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.tradeFailed}
              onChange={(e) => updateNotificationPreference('tradeFailed', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Order failed</span>
          </label>
        </div>
      </div>

      {/* Position Events */}
      <div>
        <h4 className="font-medium mb-3 text-brand-green">Position events</h4>
        <div className="space-y-3 ml-4">
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={notificationPreferences.positionProfitMilestone}
                onChange={(e) => updateNotificationPreference('positionProfitMilestone', e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
              />
              <span className="text-sm">Profit milestones</span>
            </label>
            <div className="ml-8 flex gap-2">
              <span className="text-xs text-gray-400">Notify when position reaches:</span>
              {[25, 50, 100, 200].map((pct) => (
                <label key={pct} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.profitMilestones.includes(pct)}
                    onChange={(e) => {
                      const newMilestones = e.target.checked
                        ? [...notificationPreferences.profitMilestones, pct].sort((a, b) => a - b)
                        : notificationPreferences.profitMilestones.filter((m) => m !== pct);
                      updateNotificationPreference('profitMilestones', newMilestones);
                    }}
                    disabled={!notificationPreferences.positionProfitMilestone}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0 disabled:opacity-50"
                  />
                  <span className="text-xs">+{pct}%</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={notificationPreferences.positionLossWarning}
                onChange={(e) => updateNotificationPreference('positionLossWarning', e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
              />
              <span className="text-sm">Loss warnings</span>
            </label>
            <div className="ml-8 flex gap-2">
              <span className="text-xs text-gray-400">Notify when position drops:</span>
              {[25, 50].map((pct) => (
                <label key={pct} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.lossWarnings.includes(pct)}
                    onChange={(e) => {
                      const newWarnings = e.target.checked
                        ? [...notificationPreferences.lossWarnings, pct].sort((a, b) => a - b)
                        : notificationPreferences.lossWarnings.filter((w) => w !== pct);
                      updateNotificationPreference('lossWarnings', newWarnings);
                    }}
                    disabled={!notificationPreferences.positionLossWarning}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0 disabled:opacity-50"
                  />
                  <span className="text-xs">-{pct}%</span>
                </label>
              ))}
            </div>
          </div>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.positionPriceMoved}
              onChange={(e) => updateNotificationPreference('positionPriceMoved', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Price moved {'>'}15% (1h)</span>
          </label>
        </div>
      </div>

      {/* Market Events */}
      <div>
        <h4 className="font-medium mb-3 text-brand-green">Market events</h4>
        <div className="space-y-3 ml-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.marketResolved}
              onChange={(e) => updateNotificationPreference('marketResolved', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Market resolved</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.claimAvailable}
              onChange={(e) => updateNotificationPreference('claimAvailable', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Claim available</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.marketEndingSoon}
              onChange={(e) => updateNotificationPreference('marketEndingSoon', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Market ending in {'<'}1h</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.marketEndingIn24h}
              onChange={(e) => updateNotificationPreference('marketEndingIn24h', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Market ending in {'<'}24h</span>
          </label>
        </div>
      </div>

      {/* Wallet Events */}
      <div>
        <h4 className="font-medium mb-3 text-brand-green">Wallet events</h4>
        <div className="space-y-3 ml-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.depositReceived}
              onChange={(e) => updateNotificationPreference('depositReceived', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Deposit received</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.withdrawalConfirmed}
              onChange={(e) => updateNotificationPreference('withdrawalConfirmed', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Withdrawal confirmed</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.lowEthGas}
              onChange={(e) => updateNotificationPreference('lowEthGas', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Low ETH for gas</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.lowUsdcBalance}
              onChange={(e) => updateNotificationPreference('lowUsdcBalance', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Low USDC balance</span>
          </label>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Toast notifications</h3>
        <p className="text-sm text-gray-400 mb-4">Show ephemeral popups for important events</p>
        <div className="space-y-3 ml-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notificationPreferences.toastEnabled}
              onChange={(e) => updateNotificationPreference('toastEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm">Enable toast notifications</span>
          </label>
          <div className="ml-8">
            <label className="text-sm text-gray-400 block mb-2">
              Auto-dismiss after:
            </label>
            <select
              value={notificationPreferences.toastDurationMs}
              onChange={(e) => updateNotificationPreference('toastDurationMs', parseInt(e.target.value))}
              disabled={!notificationPreferences.toastEnabled}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-green/50 focus:outline-none disabled:opacity-50"
            >
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={7000}>7s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer ml-8">
            <input
              type="checkbox"
              checked={notificationPreferences.toastSoundEnabled}
              onChange={(e) => updateNotificationPreference('toastSoundEnabled', e.target.checked)}
              disabled={!notificationPreferences.toastEnabled}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0 disabled:opacity-50"
            />
            <span className="text-sm">Play sound on critical events</span>
          </label>
        </div>
      </div>

      {/* Browser Notifications */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Browser notifications (optional)</h3>
        <p className="text-sm text-gray-400 mb-4">
          Receive alerts even when Predictio tab is closed
        </p>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={notificationPreferences.browserNotificationsEnabled}
              onChange={(e) => updateNotificationPreference('browserNotificationsEnabled', e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
            />
            <span className="text-sm font-medium">Enable browser notifications</span>
          </label>
          
          {notificationPreferences.browserNotificationsEnabled && (
            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission();
                }
              }}
              className="px-4 py-2 bg-brand-green/20 text-brand-green rounded-lg text-sm font-medium hover:bg-brand-green/30 transition-colors"
            >
              Request permission
            </button>
          )}
          
          <div className="mt-4 space-y-1 text-sm text-gray-400">
            <p>Only critical events are sent:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Market resolved</li>
              <li>Trade failed</li>
              <li>Claim available</li>
            </ul>
          </div>
          
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>No tracking. No marketing. Ever.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
