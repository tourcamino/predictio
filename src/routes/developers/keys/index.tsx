import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Key, Copy, Eye, EyeOff, RotateCw, Trash2, Activity, AlertTriangle } from 'lucide-react';
import { Header } from '~/components/Header';
import { useWalletStore } from '~/store/useWalletStore';
import toast from 'react-hot-toast';
import { useApiAuthStore } from '~/store/useApiAuthStore';
import { apiRequest, type ApiErrorShape } from '~/lib/predictioApi';

export const Route = createFileRoute('/developers/keys/')({
  component: APIKeysPage,
});

interface APIKey {
  id: string;
  keyPrefix: string;
  keySuffix: string;
  fullKey?: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  paperMode: boolean;
  isActive: boolean;
  permissions: string[];
  usage24h: { count24h: number; avgLatencyMs24h: number | null };
}

function ShowKeyModal({ apiKey, onClose }: {
  apiKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#00D97E]/30 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center gap-2 text-yellow-500 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-xl font-bold">Save this key now</h3>
        </div>
        
        <p className="text-sm text-[#999999] mb-4">
          You won't see it again. Store it securely.
        </p>

        <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4 mb-6">
          <pre className="text-sm font-mono text-[#E5E5E5] break-all">
            {apiKey}
          </pre>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00D97E] text-black font-semibold rounded hover:bg-[#00D97E]/90 transition-all"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all"
          >
            I've saved it
          </button>
        </div>
      </div>
    </div>
  );
}

function APIKeysPage() {
  const { isConnected, address, openWalletModal } = useWalletStore();
  const { adminApiKey, setAdminApiKey, clearAdminApiKey, developerApiKey, setDeveloperApiKey, clearDeveloperApiKey } =
    useApiAuthStore();
  const [adminKeyInput, setAdminKeyInput] = useState(adminApiKey);
  const [developerKeyInput, setDeveloperKeyInput] = useState(developerApiKey);

  const walletAddress = useMemo(() => (address ? address.toLowerCase() : ''), [address]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showFullKey, setShowFullKey] = useState(false);

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(false);

  const activeKey = keys.find((k) => k.isActive) || null;

  async function refreshKeys() {
    if (!adminApiKey) return;
    if (!walletAddress) return;
    setLoading(true);
    const r = await apiRequest<{ keys: any[] }>(`/api/admin/wallet/${walletAddress}/keys`, { adminApiKey });
    setLoading(false);
    if (!r.ok) {
      toast.error(`List keys failed: ${(r.error as ApiErrorShape)?.error?.code || `HTTP_${r.status}`}`);
      return;
    }
    const normalized: APIKey[] = (r.data.keys || []).map((k: any) => ({
      id: String(k.id),
      keyPrefix: String(k.keyPrefix),
      keySuffix: String(k.keySuffix),
      createdAt: new Date(k.createdAt),
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt) : null,
      paperMode: Boolean(k.paperMode),
      isActive: Boolean(k.isActive),
      permissions: Array.isArray(k.permissions) ? k.permissions.map((p: any) => String(p)) : [],
      usage24h: {
        count24h: Number(k.usage24h?.count24h || 0),
        avgLatencyMs24h: k.usage24h?.avgLatencyMs24h == null ? null : Number(k.usage24h.avgLatencyMs24h),
      },
    }));
    setKeys(normalized);
  }

  useEffect(() => {
    refreshKeys().catch(() => null);
     
  }, [adminApiKey, walletAddress]);

  const handleGenerate = (key: string) => {
    setNewKey(key);
    setShowKeyModal(true);

    // Also store as developer key for "always logged in"
    setDeveloperApiKey(key);
    setDeveloperKeyInput(key);
    toast.success('Saved as Developer API key');

    refreshKeys().catch(() => null);
  };

  const handleCopy = (prefix: string, suffix: string) => {
    navigator.clipboard.writeText(`${prefix}****...${suffix}`);
    toast.success('Key copied');
  };

  const handleCreateKey = async () => {
    if (!walletAddress) return;
    if (!adminApiKey) {
      toast.error('Set ADMIN key first');
      return;
    }
    setLoading(true);
    const r = await apiRequest<{
      apiKey: string;
      id: string;
      keyPrefix: string;
      keySuffix: string;
      permissions: string[];
      createdAt: string;
    }>('/api/developer/keys', {
      method: 'POST',
      adminApiKey,
      body: { walletAddress, label: 'UI', permissions: ['read', 'trade', 'stream'] },
    });
    setLoading(false);
    if (!r.ok) {
      toast.error(`Create failed: ${(r.error as ApiErrorShape)?.error?.code || `HTTP_${r.status}`}`);
      return;
    }
    handleGenerate(r.data.apiKey);
  };

  const handleRevokeById = async (id: string) => {
    if (!adminApiKey) {
      toast.error('Set ADMIN key first');
      return;
    }
    if (!confirm('Revoke API key? This cannot be undone.')) return;
    setLoading(true);
    const r = await apiRequest('/api/developer/keys/revoke', {
      method: 'POST',
      adminApiKey,
      body: { id },
    });
    setLoading(false);
    if (!r.ok) {
      toast.error(`Revoke failed: ${(r.error as ApiErrorShape)?.error?.code || `HTTP_${r.status}`}`);
      return;
    }
    toast.success('API key revoked');
    refreshKeys().catch(() => null);
  };

  const handleRotateKeys = async () => {
    if (!walletAddress) return;
    if (!adminApiKey) {
      toast.error('Set ADMIN key first');
      return;
    }
    if (!confirm('Rotate keys for this wallet? All active keys will be revoked and a new one will be created.')) return;
    setLoading(true);
    const r = await apiRequest<{
      created: boolean;
      apiKey?: string;
      revoked: number;
    }>(`/api/admin/wallet/${walletAddress}/rotate-keys?confirm=true`, {
      method: 'POST',
      adminApiKey,
      body: { createNew: true, label: 'Rotated (UI)', permissions: ['read', 'trade', 'stream'] },
    });
    setLoading(false);
    if (!r.ok) {
      toast.error(`Rotate failed: ${(r.error as ApiErrorShape)?.error?.code || `HTTP_${r.status}`}`);
      return;
    }
    toast.success(`Rotated (revoked ${r.data.revoked})`);
    if (r.data.apiKey) handleGenerate(r.data.apiKey);
    refreshKeys().catch(() => null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
        <Header />
        
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="text-center max-w-md">
            <Key className="w-16 h-16 text-[#00D97E] mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Connect your wallet to manage API keys</h1>
            <p className="text-[#999999] mb-8">
              Sign in with your wallet to generate and manage your Predictio API keys.
            </p>
            <button
              onClick={openWalletModal}
              className="px-8 py-3 bg-[#00D97E] text-black font-semibold rounded-lg hover:bg-[#00D97E]/90 transition-all"
            >
              Connect wallet
            </button>
          </div>
        </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Keys</h1>
            <p className="text-[#999999]">
              for {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>

        {/* Local auth storage (always logged in) */}
        <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Local keys (browser)</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm text-[#999999] mb-2">Admin key (x-predictio-key)</label>
              <div className="flex gap-2">
                <input
                  value={adminKeyInput}
                  onChange={(e) => setAdminKeyInput(e.target.value)}
                  placeholder="ADMIN_API_KEY ..."
                  className="flex-1 px-3 py-2 rounded bg-[#0A0A0A] border border-white/10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAdminApiKey(adminKeyInput);
                    toast.success('Admin key saved');
                  }}
                  className="px-4 py-2 bg-[#00D97E] text-black font-semibold rounded hover:bg-[#00D97E]/90 transition-all"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAdminApiKey();
                    setAdminKeyInput('');
                    toast.success('Admin key cleared');
                  }}
                  className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-[#999999] mt-2">
                Needed for listing/creating/revoking keys (admin-only endpoints).
              </p>
            </div>

            <div>
              <label className="block text-sm text-[#999999] mb-2">Developer API key (Authorization Bearer)</label>
              <div className="flex gap-2">
                <input
                  value={developerKeyInput}
                  onChange={(e) => setDeveloperKeyInput(e.target.value)}
                  placeholder="pk_live_..."
                  className="flex-1 px-3 py-2 rounded bg-[#0A0A0A] border border-white/10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    setDeveloperApiKey(developerKeyInput);
                    toast.success('Developer key saved');
                  }}
                  className="px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearDeveloperApiKey();
                    setDeveloperKeyInput('');
                    toast.success('Developer key cleared');
                  }}
                  className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all"
                >
                  Clear
                </button>
              </div>
              <p className="text-xs text-[#999999] mt-2">
                Used for bot requests and for `GET /api/me` (see <span className="font-mono">/me</span> page).
              </p>
            </div>
          </div>
        </div>

        {/* Active Key Panel */}
        {activeKey ? (
          <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Active API Key</h2>
            
            <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <code className="text-lg font-mono text-[#E5E5E5]">
                  {showFullKey && activeKey.fullKey
                    ? activeKey.fullKey
                    : `${activeKey.keyPrefix}****...${activeKey.keySuffix}`}
                </code>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(activeKey.keyPrefix, activeKey.keySuffix)}
                    className="p-2 hover:bg-[#00D97E]/10 rounded transition-all"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {activeKey.fullKey && (
                    <button
                      onClick={() => setShowFullKey(!showFullKey)}
                      className="p-2 hover:bg-[#00D97E]/10 rounded transition-all"
                      title={showFullKey ? 'Hide' : 'Show'}
                    >
                      {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#999999]">Created:</span>
                  <span className="ml-2 text-[#E5E5E5]">{formatDate(activeKey.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[#999999]">Last used:</span>
                  <span className="ml-2 text-[#E5E5E5]">
                    {activeKey.lastUsedAt ? formatTimeAgo(activeKey.lastUsedAt) : 'never'}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">Requests (24h):</span>
                  <span className="ml-2 text-[#E5E5E5]">{activeKey.usage24h.count24h.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#999999]">Permissions:</span>
                  <span className="ml-2 text-[#E5E5E5]">{activeKey.permissions.join(', ') || '-'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRotateKeys}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all"
              >
                <RotateCw className="w-4 h-4" />
                Rotate Key
              </button>
              <button
                onClick={() => handleRevokeById(activeKey.id)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 rounded hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Revoke
              </button>
              <button
                onClick={() => refreshKeys()}
                disabled={!adminApiKey || loading}
                className="ml-auto px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-12 text-center mb-6">
            <Key className="w-12 h-12 text-[#00D97E] mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No API key yet</h2>
            <p className="text-[#999999] mb-6 max-w-md mx-auto">
              Generate an API key by signing a message with your wallet. You'll see the key once — save it securely.
            </p>
            <button
              onClick={handleCreateKey}
              disabled={loading}
              className="px-6 py-3 bg-[#00D97E] text-black font-semibold rounded-lg hover:bg-[#00D97E]/90 transition-all"
            >
              {loading ? 'Generating…' : 'Generate API Key'}
            </button>
          </div>
        )}

        {/* Usage Stats */}
        {activeKey && (
          <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Usage Statistics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                  <div className="text-2xl font-bold text-[#00D97E] mb-1">
                    {activeKey.usage24h.count24h.toLocaleString()}
                  </div>
                  <div className="text-sm text-[#999999]">Requests (24h)</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                  <div className="text-2xl font-bold text-[#00D97E] mb-1">
                    {activeKey.usage24h.avgLatencyMs24h == null
                      ? '—'
                      : Math.round(activeKey.usage24h.avgLatencyMs24h)}
                  </div>
                  <div className="text-sm text-[#999999]">Avg latency ms (24h)</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                  <div className="text-2xl font-bold text-[#00D97E] mb-1">
                    {activeKey.paperMode ? 'PAPER' : 'LIVE'}
                  </div>
                  <div className="text-sm text-[#999999]">Mode</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                  <div className="text-2xl font-bold text-[#00D97E] mb-1">
                    {activeKey.keyPrefix.slice(0, 10)}…
                  </div>
                  <div className="text-sm text-[#999999]">Key prefix</div>
              </div>
            </div>

            <div className="text-xs text-[#999999] text-center">
              Tip: use admin usage endpoints for deeper analytics.
            </div>
          </div>
        )}
      </div>


      {showKeyModal && (
        <ShowKeyModal
          apiKey={newKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  );
}

