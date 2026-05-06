import { createFileRoute } from '@tanstack/react-router';
import { CHAIN_CONFIG } from '~/config/chain';
import { ExternalLink, Code, X, MessageCircle, FileText } from 'lucide-react';

export const Route = createFileRoute('/settings/about/')({
  component: AboutSettings,
});

function AboutSettings() {
  const version = 'v0.9.0-beta';
  const buildHash = 'a3f9c2d';
  const buildDate = 'Apr 29, 2026';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-syne font-bold mb-2">About Predictio</h2>
        <p className="text-gray-400 text-sm">Version and system information</p>
      </div>

      {/* Version Info */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Version:</span>
          <span className="font-medium">{version}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Build:</span>
          <span className="font-mono text-xs">{buildHash} ({buildDate})</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Last updated:</span>
          <span>2 days ago</span>
        </div>
        <button className="w-full mt-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
          Check for updates
        </button>
      </div>

      {/* Chain Info */}
      <div>
        <h3 className="font-semibold mb-3">Chain</h3>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Network:</span>
            <span className="font-medium">{CHAIN_CONFIG.chainName || 'Demo Mode'}</span>
          </div>
          {CHAIN_CONFIG.chainId && (
            <div className="flex justify-between">
              <span className="text-gray-400">Chain ID:</span>
              <span className="font-mono">{CHAIN_CONFIG.chainId}</span>
            </div>
          )}
          {CHAIN_CONFIG.explorerUrl && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Explorer:</span>
              <a
                href={CHAIN_CONFIG.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-green hover:text-brand-green/80 transition-colors flex items-center gap-1"
              >
                View <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {CHAIN_CONFIG.contracts.marketFactory && (
          <div className="mt-3">
            <p className="text-sm text-gray-400 mb-2">Contract addresses:</p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Factory:</span>
                <span>{CHAIN_CONFIG.contracts.marketFactory || 'TBD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Orderbook:</span>
                <span>{CHAIN_CONFIG.contracts.orderbook || 'TBD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Resolver:</span>
                <span>{CHAIN_CONFIG.contracts.resolver || 'TBD'}</span>
              </div>
            </div>
            {CHAIN_CONFIG.explorerUrl && (
              <a
                href={`${CHAIN_CONFIG.explorerUrl}/address/${CHAIN_CONFIG.contracts.marketFactory}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-brand-green hover:text-brand-green/80 transition-colors mt-2"
              >
                View all on explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Links */}
      <div>
        <h3 className="font-semibold mb-3">Links</h3>
        <div className="space-y-2">
          {[
            { label: 'Website', url: 'https://predictio.live', icon: ExternalLink },
            { label: 'Documentation', url: '/developers/docs', icon: FileText },
            { label: 'GitHub', url: 'https://github.com', icon: Code },
            { label: 'Discord', url: 'https://discord.com', icon: MessageCircle },
            { label: 'X', url: 'https://twitter.com', icon: X },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.url}
                target={link.url.startsWith('http') ? '_blank' : undefined}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="text-sm">{link.label}</span>
                <Icon className="w-4 h-4 text-gray-400" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Legal */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Legal</h3>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-gray-300 mb-4">
          <p className="mb-2">
            Predictio is a permissionless DeFi protocol. Use at your own risk.
            Trading prediction markets involves financial risk.
          </p>
          <p className="text-yellow-500 font-medium">
            Not available in all jurisdictions.
          </p>
        </div>
        <a
          href="/risk-disclosure"
          className="inline-flex items-center gap-1 text-sm text-brand-green hover:text-brand-green/80 transition-colors"
        >
          Read full disclaimer <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* License */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">License</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>App:</span>
            <span className="font-medium text-white">MIT License</span>
          </div>
          <div className="flex justify-between">
            <span>Smart contracts:</span>
            <span className="font-medium text-white">GPL-3.0</span>
          </div>
        </div>
      </div>

      {/* Acknowledgments */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="font-semibold mb-3">Acknowledgments</h3>
        <p className="text-sm text-gray-400">
          Built with: Next.js, TanStack Router, wagmi, ethers.js, Zustand, Tailwind CSS, 
          Shiki, lightweight-charts, Fuse.js, Lucide Icons, and more.
        </p>
      </div>
    </div>
  );
}
