import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { useApiAuthStore } from '~/store/useApiAuthStore';
import { apiRequest } from '~/lib/predictioApi';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/me/')({
  component: MePage,
});

type MeResponse = {
  walletAddress?: string;
  apiKeyId?: string;
  permissions?: string[];
  keyPrefix?: string;
  paperMode?: boolean;
};

function MePage() {
  const { developerApiKey, setDeveloperApiKey, clearDeveloperApiKey } = useApiAuthStore();
  const [input, setInput] = useState(developerApiKey);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  async function refresh() {
    if (!developerApiKey) {
      setMe(null);
      return;
    }
    setLoading(true);
    const r = await apiRequest<MeResponse>('/api/me', { developerApiKey });
    setLoading(false);
    if (!r.ok) {
      setMe(null);
      const code = r.error?.error?.code || `HTTP_${r.status}`;
      toast.error(`/api/me failed: ${code}`);
      return;
    }
    setMe(r.data);
  }

  useEffect(() => {
    refresh().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [developerApiKey]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <Header />

      <div className="max-w-3xl mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-2">/me</h1>
        <p className="text-[#999999] mb-8">
          Developer API key introspection. This is the “always logged in” primitive for bots.
        </p>

        <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-6">
          <div className="flex flex-col gap-3">
            <label className="text-sm text-[#999999]">Developer API key (Authorization Bearer)</label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="pk_live_..."
              className="w-full px-3 py-2 rounded bg-[#0A0A0A] border border-white/10 font-mono text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeveloperApiKey(input);
                  toast.success('Developer key saved');
                }}
                className="px-4 py-2 bg-[#00D97E] text-black font-semibold rounded hover:bg-[#00D97E]/90 transition-all"
              >
                Save key
              </button>
              <button
                type="button"
                onClick={() => {
                  clearDeveloperApiKey();
                  setInput('');
                  setMe(null);
                  toast.success('Developer key cleared');
                }}
                className="px-4 py-2 border border-white/10 rounded hover:bg-white/5 transition-all"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => refresh()}
                disabled={!developerApiKey || loading}
                className="ml-auto px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Current identity</h2>
          {!developerApiKey ? (
            <p className="text-[#999999]">Set a developer API key to view identity.</p>
          ) : me ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#0A0A0A] border border-white/10 rounded p-4">
                <div className="text-[#999999] mb-1">walletAddress</div>
                <div className="font-mono break-all">{me.walletAddress || '-'}</div>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded p-4">
                <div className="text-[#999999] mb-1">apiKeyId</div>
                <div className="font-mono break-all">{me.apiKeyId || '-'}</div>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded p-4">
                <div className="text-[#999999] mb-1">keyPrefix</div>
                <div className="font-mono break-all">{me.keyPrefix || '-'}</div>
              </div>
              <div className="bg-[#0A0A0A] border border-white/10 rounded p-4">
                <div className="text-[#999999] mb-1">permissions</div>
                <div className="font-mono break-all">{(me.permissions || []).join(', ') || '-'}</div>
              </div>
            </div>
          ) : (
            <p className="text-[#999999]">No data yet (try Refresh).</p>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

