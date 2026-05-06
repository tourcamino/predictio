import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Key, Copy, Eye, EyeOff, RotateCw, Trash2, Activity, AlertTriangle } from 'lucide-react';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { useWalletStore } from '~/store/useWalletStore';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/developers/keys/')({
  component: APIKeysPage,
});

interface APIKey {
  id: string;
  prefix: string;
  fullKey?: string;
  createdAt: Date;
  lastUsedAt: Date;
  requests24h: number;
  permissions: string[];
}

function GenerateKeyModal({ isOpen, onClose, onGenerate }: {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (key: string) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { address } = useWalletStore();

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate EIP-712 signing and key generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockKey = `pk_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    onGenerate(mockKey);
    
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111111] border border-[#00D97E]/30 rounded-lg max-w-lg w-full p-6">
        <h3 className="text-xl font-bold mb-4">Generate API Key</h3>
        
        <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4 mb-6">
          <p className="text-sm text-[#999999] mb-2">You will sign a message with your wallet:</p>
          <pre className="text-xs font-mono text-[#E5E5E5] overflow-x-auto">
{`Generate Predictio API key for ${address?.slice(0, 6)}...${address?.slice(-4)}
nonce: 8f3a...
expires: 2026-05-01T00:00:00Z`}
          </pre>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-[#00D97E] text-black font-semibold rounded hover:bg-[#00D97E]/90 transition-all disabled:opacity-50"
          >
            {isGenerating ? 'Waiting for signature...' : 'Sign & Generate'}
          </button>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showFullKey, setShowFullKey] = useState(false);
  
  // Mock API key data
  const [apiKey, setApiKey] = useState<APIKey | null>({
    id: '1',
    prefix: 'pk_live_abc',
    createdAt: new Date('2024-04-12'),
    lastUsedAt: new Date(Date.now() - 2 * 60 * 1000),
    requests24h: 14203,
    permissions: ['read', 'trade', 'stream'],
  });

  const handleGenerate = (key: string) => {
    setNewKey(key);
    setShowGenerateModal(false);
    setShowKeyModal(true);
    
    // Update state with new key
    setApiKey({
      id: Math.random().toString(),
      prefix: key.slice(0, 12),
      fullKey: key,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      requests24h: 0,
      permissions: ['read', 'trade', 'stream'],
    });
  };

  const handleRevoke = () => {
    if (confirm('Revoke API key? This cannot be undone.')) {
      setApiKey(null);
      toast.success('API key revoked');
    }
  };

  const handleCopy = () => {
    if (apiKey?.prefix) {
      navigator.clipboard.writeText(apiKey.prefix + '****');
      toast.success('Key prefix copied');
    }
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
        
        <Footer />
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

        {/* Active Key Panel */}
        {apiKey ? (
          <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Active API Key</h2>
            
            <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <code className="text-lg font-mono text-[#E5E5E5]">
                  {showFullKey && apiKey.fullKey ? apiKey.fullKey : `${apiKey.prefix}****...****`}
                </code>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 hover:bg-[#00D97E]/10 rounded transition-all"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {apiKey.fullKey && (
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
                  <span className="ml-2 text-[#E5E5E5]">{formatDate(apiKey.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[#999999]">Last used:</span>
                  <span className="ml-2 text-[#E5E5E5]">{formatTimeAgo(apiKey.lastUsedAt)}</span>
                </div>
                <div>
                  <span className="text-[#999999]">Requests (24h):</span>
                  <span className="ml-2 text-[#E5E5E5]">{apiKey.requests24h.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#999999]">Permissions:</span>
                  <span className="ml-2 text-[#E5E5E5]">{apiKey.permissions.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-[#00D97E]/30 rounded hover:bg-[#00D97E]/10 transition-all"
              >
                <RotateCw className="w-4 h-4" />
                Rotate Key
              </button>
              <button
                onClick={handleRevoke}
                className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-500 rounded hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Revoke
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
              onClick={() => setShowGenerateModal(true)}
              className="px-6 py-3 bg-[#00D97E] text-black font-semibold rounded-lg hover:bg-[#00D97E]/90 transition-all"
            >
              Generate API Key
            </button>
          </div>
        )}

        {/* Usage Stats */}
        {apiKey && (
          <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Usage Statistics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                <div className="text-2xl font-bold text-[#00D97E] mb-1">14,203</div>
                <div className="text-sm text-[#999999]">Requests today</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                <div className="text-2xl font-bold text-[#00D97E] mb-1">387k</div>
                <div className="text-sm text-[#999999]">This month</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                <div className="text-2xl font-bold text-[#00D97E] mb-1">12</div>
                <div className="text-sm text-[#999999]">Errors (24h)</div>
              </div>
              <div className="bg-[#0A0A0A] border border-[#00D97E]/20 rounded p-4">
                <div className="text-2xl font-bold text-[#00D97E] mb-1">847/1000</div>
                <div className="text-sm text-[#999999]">Rate limit</div>
              </div>
            </div>

            <div className="text-xs text-[#999999] text-center">
              Detailed analytics coming soon
            </div>
          </div>
        )}
      </div>

      <Footer />

      <GenerateKeyModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
      />

      {showKeyModal && (
        <ShowKeyModal
          apiKey={newKey}
          onClose={() => setShowKeyModal(false)}
        />
      )}
    </div>
  );
}
