import { createFileRoute } from '@tanstack/react-router';
import { AdminTopBar } from '~/components/admin/AdminTopBar';
import { useState } from 'react';
import { Eye, EyeOff, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/admin/settings/')({
  component: AdminSettings,
});

function AdminSettings() {
  const [platformLive, setPlatformLive] = useState(true);
  const [newMarketCreation, setNewMarketCreation] = useState(true);
  const [autoResolution, setAutoResolution] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [operatorFee, setOperatorFee] = useState('0.8');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [notifications, setNotifications] = useState({
    largeBet: true,
    resolutionRequired: true,
    userMilestone: false,
    dailyReport: true,
  });

  const handleSaveFee = () => {
    toast.success('Operator fee updated successfully');
  };

  const handleRegenerateKey = () => {
    toast.success('API key regenerated successfully');
  };

  return (
    <div className="min-h-screen">
      <AdminTopBar title="Settings" />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-syne font-bold">Platform Settings</h1>

          {/* Platform Status */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-syne font-bold mb-4">Platform Status</h3>
            
            <SettingToggle
              label="Platform Status"
              description="Master switch for the entire platform"
              enabled={platformLive}
              onChange={setPlatformLive}
              statusText={platformLive ? '🟢 LIVE' : '🔴 OFFLINE'}
            />
            
            <SettingToggle
              label="New Market Creation"
              description="Allow creation of new prediction markets"
              enabled={newMarketCreation}
              onChange={setNewMarketCreation}
            />
            
            <SettingToggle
              label="Auto-Resolution (Azuro)"
              description="Enable automatic market resolution via Azuro Oracle"
              enabled={autoResolution}
              onChange={setAutoResolution}
            />
            
            <SettingToggle
              label="Maintenance Mode"
              description="Disable all user actions for maintenance"
              enabled={maintenanceMode}
              onChange={setMaintenanceMode}
              variant="danger"
            />
          </div>

          {/* Fee Settings */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-4">Fee Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Operator Fee
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={operatorFee}
                      onChange={(e) => setOperatorFee(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-green transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                  <button
                    onClick={handleSaveFee}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-green hover:bg-brand-green/90 text-black rounded-lg font-medium transition-colors"
                  >
                    <Save size={16} />
                    Save
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Current revenue: $33,600 USDC (0.8% of $4.2M volume)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fee Wallet Address
                </label>
                <input
                  type="text"
                  value="0x7f3a8b2c4e2b9f1a6d5c8e7f9a2b4c6d8e0f1a3b"
                  readOnly
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Where platform fees are collected
                </p>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-4">API Keys</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Azuro API Key
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value="sk-azuro-1234567890abcdef1234567890abcdef"
                      readOnly
                      className="w-full px-4 py-2.5 pr-12 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={handleRegenerateKey}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw size={16} />
                    Regenerate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Oracle Endpoint
                </label>
                <input
                  type="url"
                  value="https://oracle.azuro.org/v1"
                  readOnly
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-syne font-bold mb-4">Notification Settings</h3>
            <p className="text-sm text-gray-400 mb-4">
              Configure email alerts for important platform events
            </p>
            
            <div className="space-y-3">
              <NotificationToggle
                label="Large bet alert (> $1,000)"
                enabled={notifications.largeBet}
                onChange={(value) => setNotifications({ ...notifications, largeBet: value })}
              />
              <NotificationToggle
                label="Market resolution required"
                enabled={notifications.resolutionRequired}
                onChange={(value) => setNotifications({ ...notifications, resolutionRequired: value })}
              />
              <NotificationToggle
                label="New user milestone (1k, 5k, 10k)"
                enabled={notifications.userMilestone}
                onChange={(value) => setNotifications({ ...notifications, userMilestone: value })}
              />
              <NotificationToggle
                label="Daily volume report"
                enabled={notifications.dailyReport}
                onChange={(value) => setNotifications({ ...notifications, dailyReport: value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({
  label,
  description,
  enabled,
  onChange,
  statusText,
  variant = 'default',
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  statusText?: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-medium">{label}</span>
          {statusText && (
            <span className={`text-xs font-mono font-bold ${enabled ? 'text-green-500' : 'text-red-500'}`}>
              {statusText}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${enabled 
            ? variant === 'danger' ? 'bg-red-500' : 'bg-brand-green'
            : 'bg-white/20'
          }
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${enabled ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}

function NotificationToggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green"
      />
    </label>
  );
}
