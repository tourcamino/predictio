import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Terminal, Shield, BarChart3, Check, X, AlertCircle, MessageCircle, ExternalLink } from 'lucide-react';
import { useWalletStore } from '~/store/useWalletStore';
import { MetaTags } from '~/components/MetaTags';

export const Route = createFileRoute('/developers/')({
  component: DevelopersLandingPage,
});

const CODE_EXAMPLES = {
  python: `from predictio import Client
from eth_account import Account

# Sign once with your wallet, use API key forever
account = Account.from_key("0x...")
client = Client(wallet=account)

# Stream real-time orderbook
async for update in client.stream.orderbook("0x3a..."):
    if update.spread_bps > 300:
        # Your strategy here
        await client.orders.create(
            market_id=update.market_id,
            side="YES",
            size=100
        )`,
  typescript: `import { Predictio } from '@predictio/sdk';
import { Wallet } from 'ethers';

const wallet = new Wallet("0x...");
const client = new Predictio({ wallet });

// Stream real-time orderbook
client.stream.orderbook('0x3a...').on('update', async (update) => {
  if (update.spread_bps > 300) {
    // Your strategy here
    await client.orders.create({
      marketId: update.market_id,
      side: 'YES',
      size: 100,
    });
  }
});`,
  rust: `use predictio::{Client, Side};
use ethers::prelude::*;

let wallet: LocalWallet = "0x...".parse()?;
let client = Client::new(wallet, Chain::Base).await?;

// Stream real-time orderbook
let mut stream = client.stream().orderbook("0x3a...").await?;
while let Some(update) = stream.next().await {
    if update.spread_bps > 300 {
        // Your strategy here
        client.orders().create(
            OrderRequest::new(&update.market_id, Side::Yes, 100.0)
        ).await?;
    }
}`,
};

function CodePreview() {
  const [language, setLanguage] = useState<'python' | 'typescript' | 'rust'>('python');
  const [displayedCode, setDisplayedCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedCode('');
    setCurrentIndex(0);
  }, [language]);

  useEffect(() => {
    const code = CODE_EXAMPLES[language];
    if (currentIndex < code.length) {
      const timeout = setTimeout(() => {
        setDisplayedCode(code.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, language]);

  return (
    <div className="bg-[#0A0A0A] border border-[#00D97E]/30 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#111111] border-b border-[#00D97E]/20">
        {(['python', 'typescript', 'rust'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1.5 text-sm font-mono rounded transition-all ${
              language === lang
                ? 'bg-[#00D97E] text-black'
                : 'text-gray-400 hover:text-[#00D97E]'
            }`}
          >
            {lang === 'python' ? 'Python' : lang === 'typescript' ? 'TypeScript' : 'Rust'}
          </button>
        ))}
      </div>
      <pre className="p-6 overflow-x-auto text-sm">
        <code className="font-mono text-[#E5E5E5]">{displayedCode}</code>
      </pre>
    </div>
  );
}

function DevelopersLandingPage() {
  const { openWalletModal, isConnected } = useWalletStore();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <MetaTags
        title="Developer API — Predictio.live"
        description="Build trading bots and integrations with the Predictio.live REST API and npm SDK."
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      {/* Hero Section */}
      <section className="relative pb-20 px-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111111_1px,transparent_1px),linear-gradient(to_bottom,#111111_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Trade Predictio from your terminal
            </h1>
            <p className="text-xl text-[#999999] max-w-3xl mx-auto mb-8">
              Wallet-authenticated REST & WebSocket API for prediction markets. Pure DeFi. 
              No accounts, no KYC, no rate-limited paid tiers.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={openWalletModal}
                className="px-8 py-3 bg-[#00D97E] text-black font-semibold rounded-lg hover:bg-[#00D97E]/90 transition-all"
              >
                {isConnected ? 'Manage API Keys →' : 'Connect wallet to generate API key'}
              </button>
              <Link
                to="/developers/docs"
                className="px-8 py-3 border border-[#00D97E]/30 text-[#00D97E] font-semibold rounded-lg hover:bg-[#00D97E]/10 transition-all"
              >
                Read the docs →
              </Link>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <CodePreview />
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-8">
              <BarChart3 className="w-12 h-12 text-[#00D97E] mb-4" />
              <h3 className="text-xl font-bold mb-3">Raw market data</h3>
              <p className="text-[#999999]">
                Orderbook snapshots, trade streams, cross-market spreads. REST and WebSocket. 
                Sub-second latency.
              </p>
            </div>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-8">
              <Shield className="w-12 h-12 text-[#00D97E] mb-4" />
              <h3 className="text-xl font-bold mb-3">Wallet-native auth</h3>
              <p className="text-[#999999]">
                Sign once, use forever. Your API key is cryptographically bound to your wallet. 
                No email, no password, no KYC.
              </p>
            </div>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-8">
              <Terminal className="w-12 h-12 text-[#00D97E] mb-4" />
              <h3 className="text-xl font-bold mb-3">On-chain transparency</h3>
              <p className="text-[#999999]">
                Every trade is on-chain and verifiable. Leaderboards are derived from public data. 
                No opt-in, no gatekeepers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-[#111111]/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Predictio?</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border border-[#00D97E]/20 rounded-lg overflow-hidden">
              <thead className="bg-[#111111]">
                <tr>
                  <th className="px-6 py-4 text-left font-mono text-sm">Feature</th>
                  <th className="px-6 py-4 text-center font-mono text-sm">Predictio</th>
                  <th className="px-6 py-4 text-center font-mono text-sm">Polymarket</th>
                  <th className="px-6 py-4 text-center font-mono text-sm">Kalshi</th>
                  <th className="px-6 py-4 text-center font-mono text-sm">CEX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00D97E]/10">
                <tr>
                  <td className="px-6 py-4 text-[#999999]">Wallet-only auth</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#999999]">Free API access</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#999999]">WebSocket streams</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#999999]">Paper trading SDK</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#999999]">On-chain trades</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-[#999999]">Sports-focused</td>
                  <td className="px-6 py-4 text-center"><Check className="w-5 h-5 text-[#00D97E] mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" /></td>
                  <td className="px-6 py-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Data Feeds Preview */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Live data feeds</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
              <h3 className="font-mono text-sm text-[#00D97E] mb-4">Orderbook snapshot</h3>
              <pre className="text-xs font-mono text-[#999999] overflow-x-auto">
{`{
  "market_id": "0x3a...",
  "bids": [
    [0.64, 1200],
    [0.63, 3400],
    [0.62, 5100]
  ],
  "asks": [
    [0.66, 800],
    [0.67, 2200],
    [0.68, 4500]
  ],
  "spread_bps": 200,
  "mid": 0.65,
  "timestamp": 1730376000123
}`}
              </pre>
            </div>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
              <h3 className="font-mono text-sm text-[#00D97E] mb-4">Cross-market spreads</h3>
              <pre className="text-xs font-mono text-[#999999] overflow-x-auto">
{`{
  "pair": ["0x3a...", "0x7b..."],
  "relationship": "correlated",
  "spread_pct": 0.034,
  "implied_arb_bps": 120,
  "timestamp": 1730376000
}`}
              </pre>
            </div>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6">
              <h3 className="font-mono text-sm text-[#00D97E] mb-4">Volume anomaly</h3>
              <pre className="text-xs font-mono text-[#999999] overflow-x-auto">
{`{
  "market_id": "0x3a...",
  "volume_5m_usd": 45000,
  "volume_zscore": 3.8,
  "price_impact_bps": 180,
  "timestamp": 1730376000
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Builders Section */}
      <section className="py-20 px-4 bg-[#111111]/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Join the builders on Predictio</h2>
          <p className="text-[#999999] mb-8">
            500+ unique wallets trading via API
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://github.com/predictio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#111111] border border-[#00D97E]/30 rounded-lg hover:bg-[#00D97E]/10 transition-all"
            >
              <ExternalLink className="w-5 h-5" />
              <span>SDK Examples</span>
            </a>
            <a
              href="https://discord.gg/predictio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-[#111111] border border-[#00D97E]/30 rounded-lg hover:bg-[#00D97E]/10 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Developer Discord</span>
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#00D97E]/20 to-[#00D97E]/5 border border-[#00D97E]/30 rounded-lg p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to connect?</h2>
            <p className="text-[#999999] mb-8 max-w-2xl mx-auto">
              Generate your API key in 30 seconds. Sign one message, you're done.
            </p>
            <button
              onClick={openWalletModal}
              className="px-8 py-3 bg-[#00D97E] text-black font-semibold rounded-lg hover:bg-[#00D97E]/90 transition-all"
            >
              Connect wallet →
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

