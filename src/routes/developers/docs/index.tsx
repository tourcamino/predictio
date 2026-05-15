import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Book, Copy, Check, ChevronRight, AlertTriangle, Zap, Code2, Terminal, Globe } from 'lucide-react';
import { Header } from '~/components/Header';

export const Route = createFileRoute('/developers/docs/')({
  component: DocsPage,
});

const DOC_SECTIONS = [
  {
    title: 'Getting Started',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'rate-limits', label: 'Rate Limits' },
      { id: 'quickstart', label: 'Quickstart' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { id: 'markets', label: 'Markets' },
      { id: 'orderbook', label: 'Orderbook' },
      { id: 'orders', label: 'Orders & Fills' },
    ],
  },
  {
    title: 'REST API',
    items: [
      { id: 'rest-auth', label: 'Authentication' },
      { id: 'rest-markets', label: 'Markets' },
      { id: 'rest-orders', label: 'Orders' },
      { id: 'rest-account', label: 'Account' },
      { id: 'rest-feeds', label: 'Data Feeds' },
    ],
  },
  {
    title: 'WebSocket API',
    items: [
      { id: 'ws-connection', label: 'Connection & Auth' },
      { id: 'ws-channels', label: 'Channels' },
      { id: 'ws-orderbook', label: 'Orderbook Stream' },
      { id: 'ws-trades', label: 'Trades Stream' },
    ],
  },
  {
    title: 'SDKs',
    items: [
      { id: 'sdk-python', label: 'Python' },
      { id: 'sdk-typescript', label: 'TypeScript' },
      { id: 'sdk-rust', label: 'Rust' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { id: 'error-handling', label: 'Error Handling' },
      { id: 'best-practices', label: 'Best Practices' },
      { id: 'troubleshooting', label: 'Troubleshooting' },
    ],
  },
];

const CODE_EXAMPLES = {
  python: `from predictio import Client
from eth_account import Account

# Initialize client with your wallet
account = Account.from_key("0x...")
client = Client(wallet=account)

# Fetch open markets
markets = client.markets.list(status="open")

# Place an order
order = client.orders.create(
    market_id="0x3a...",
    side="YES",
    size=100,
    type="market"
)`,
  typescript: `import { Predictio } from '@predictio/sdk';
import { Wallet } from 'ethers';

// Initialize client with your wallet
const wallet = new Wallet("0x...");
const client = new Predictio({ wallet });

// Fetch open markets
const markets = await client.markets.list({ status: 'open' });

// Place an order
const order = await client.orders.create({
  marketId: '0x3a...',
  side: 'YES',
  size: 100,
  type: 'market',
});`,
  curl: `# Request a challenge
curl https://api.predictio.live/v1/auth/challenge?wallet=0xYour...

# Use the API key
curl https://api.predictio.live/v1/markets \\
  -H "Authorization: Bearer pk_live_..."`,
};

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-[#0A0A0A] border border-[#00D97E]/20 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#111111] border-b border-[#00D97E]/20">
        <span className="text-xs font-mono text-[#999999]">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-[#999999] hover:text-[#00D97E] transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono text-[#E5E5E5]">{code}</code>
      </pre>
    </div>
  );
}

function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [language, setLanguage] = useState<'python' | 'typescript' | 'curl'>('python');

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5]">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 border-r border-[#00D97E]/20 min-h-screen sticky top-0 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Book className="w-5 h-5 text-[#00D97E]" />
              <h2 className="font-bold">Documentation</h2>
            </div>

            <nav className="space-y-6">
              {DOC_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-[#999999] uppercase mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-all ${
                            activeSection === item.id
                              ? 'bg-[#00D97E]/10 text-[#00D97E]'
                              : 'text-[#999999] hover:text-[#E5E5E5]'
                          }`}
                        >
                          {item.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 lg:px-12 py-12 max-w-4xl">
          {/* Introduction */}
          <section id="introduction" className="mb-16">
            <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
            <p className="text-lg text-[#999999] mb-6">
              Welcome to the Predictio API. This guide will help you get started with wallet-authenticated trading in minutes.
            </p>
            
            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold mb-3">Key Features</h3>
              <ul className="space-y-2 text-[#999999]">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-[#00D97E] mt-1 flex-shrink-0" />
                  <span>Wallet-native authentication via EIP-712 signatures</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-[#00D97E] mt-1 flex-shrink-0" />
                  <span>REST API for market data, orders, and account info</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-[#00D97E] mt-1 flex-shrink-0" />
                  <span>WebSocket streams for real-time orderbook and trade data</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-[#00D97E] mt-1 flex-shrink-0" />
                  <span>Official SDKs for Python, TypeScript, and Rust</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 text-[#00D97E] mt-1 flex-shrink-0" />
                  <span>Paper trading mode for strategy backtesting</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <strong>Base URL:</strong> <code className="font-mono">https://api.predictio.live</code>
              </p>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Authentication</h2>
            <p className="text-[#999999] mb-4">
              Predictio uses wallet-signed API keys. No accounts, no passwords. Here's how it works:
            </p>

            <div className="space-y-4 mb-6">
              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#00D97E]/20 rounded-full flex items-center justify-center text-[#00D97E] font-bold">
                    1
                  </div>
                  <h3 className="font-bold">Request a challenge</h3>
                </div>
                <p className="text-sm text-[#999999] ml-11">
                  Call GET /v1/auth/challenge with your wallet address to receive a nonce.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#00D97E]/20 rounded-full flex items-center justify-center text-[#00D97E] font-bold">
                    2
                  </div>
                  <h3 className="font-bold">Sign with your wallet</h3>
                </div>
                <p className="text-sm text-[#999999] ml-11">
                  Sign the EIP-712 typed data message with your wallet's private key.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#00D97E]/20 rounded-full flex items-center justify-center text-[#00D97E] font-bold">
                    3
                  </div>
                  <h3 className="font-bold">Receive your API key</h3>
                </div>
                <p className="text-sm text-[#999999] ml-11">
                  Submit the signature to POST /v1/auth/verify to receive your API key.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-[#00D97E]/20 rounded-full flex items-center justify-center text-[#00D97E] font-bold">
                    4
                  </div>
                  <h3 className="font-bold">Use the key</h3>
                </div>
                <p className="text-sm text-[#999999] ml-11">
                  Include your API key in the Authorization header for all requests.
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-400">
                <strong>Important:</strong> Your API key is shown only once. Store it securely. 
                Generating a new key will revoke the old one.
              </p>
            </div>
          </section>

          {/* Rate Limits */}
          <section id="rate-limits" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Rate Limits</h2>
            <p className="text-[#999999] mb-4">
              Predictio API has flat rate limits—identical for everyone. No paid tiers.
            </p>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-[#0A0A0A] border-b border-[#00D97E]/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-mono">Resource</th>
                    <th className="px-4 py-3 text-left text-sm font-mono">Limit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00D97E]/10">
                  <tr>
                    <td className="px-4 py-3 text-sm text-[#999999]">REST requests</td>
                    <td className="px-4 py-3 text-sm font-mono">1,000 per minute per key</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-[#999999]">WebSocket connections</td>
                    <td className="px-4 py-3 text-sm font-mono">10 concurrent per key</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-[#999999]">Order placement</td>
                    <td className="px-4 py-3 text-sm font-mono">100 per minute per key</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm text-[#999999]">Paper mode requests</td>
                    <td className="px-4 py-3 text-sm font-mono">Unlimited (client-side)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-sm text-[#999999]">
              Every response includes rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset.
            </p>
          </section>

          {/* Quickstart */}
          <section id="quickstart" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Quickstart</h2>
            <p className="text-[#999999] mb-4">
              Get started in 5 minutes with our official SDKs:
            </p>

            <div className="flex items-center gap-2 mb-4">
              {(['python', 'typescript', 'curl'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-2 rounded text-sm font-mono transition-all ${
                    language === lang
                      ? 'bg-[#00D97E] text-black'
                      : 'bg-[#111111] text-[#999999] hover:text-[#E5E5E5]'
                  }`}
                >
                  {lang === 'python' ? 'Python' : lang === 'typescript' ? 'TypeScript' : 'cURL'}
                </button>
              ))}
            </div>

            <CodeBlock code={CODE_EXAMPLES[language]} language={language} />

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <a
                href="https://pypi.org/project/predictio"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 hover:bg-[#00D97E]/5 transition-all"
              >
                <div className="text-sm font-mono text-[#00D97E] mb-1">pip install predictio</div>
                <div className="text-xs text-[#999999]">Python SDK</div>
              </a>
              <a
                href="https://www.npmjs.com/package/@predictio/sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 hover:bg-[#00D97E]/5 transition-all"
              >
                <div className="text-sm font-mono text-[#00D97E] mb-1">npm install @predictio/sdk</div>
                <div className="text-xs text-[#999999]">TypeScript SDK</div>
              </a>
              <a
                href="https://crates.io/crates/predictio"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 hover:bg-[#00D97E]/5 transition-all"
              >
                <div className="text-sm font-mono text-[#00D97E] mb-1">cargo add predictio</div>
                <div className="text-xs text-[#999999]">Rust SDK</div>
              </a>
            </div>
          </section>

          {/* REST API - Authentication */}
          <section id="rest-auth" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">REST API: Authentication</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/auth/challenge</h3>
                <p className="text-[#999999] mb-4">Request a challenge to sign with your wallet.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/auth/challenge?wallet=0xYourAddress"`}
                />
                
                <p className="text-sm text-[#999999] mt-4 mb-2">Response:</p>
                <CodeBlock
                  language="json"
                  code={`{
  "challenge": {
    "types": { ... },
    "primaryType": "PredictioAuth",
    "domain": { ... },
    "message": {
      "wallet": "0xYourAddress",
      "nonce": "abc123...",
      "expires": 1234567890
    }
  },
  "nonce": "abc123...",
  "expires_at": 1234567890
}`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">POST /v1/auth/verify</h3>
                <p className="text-[#999999] mb-4">Verify your signature and receive an API key.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl -X POST "https://api.predictio.live/v1/auth/verify" \\
  -H "Content-Type: application/json" \\
  -d '{
    "wallet": "0xYourAddress",
    "nonce": "abc123...",
    "signature": "0x..."
  }'`}
                />
                
                <p className="text-sm text-[#999999] mt-4 mb-2">Response:</p>
                <CodeBlock
                  language="json"
                  code={`{
  "api_key": "pk_live_...",
  "wallet": "0xYourAddress",
  "created_at": 1234567890,
  "rate_limit": {
    "rest": "1000/min",
    "ws_connections": 10
  }
}`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">POST /v1/auth/revoke</h3>
                <p className="text-[#999999] mb-4">Revoke your current API key.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl -X POST "https://api.predictio.live/v1/auth/revoke" \\
  -H "Authorization: Bearer pk_live_..."`}
                />
              </div>
            </div>
          </section>

          {/* REST API - Markets */}
          <section id="rest-markets" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">REST API: Markets</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/markets</h3>
                <p className="text-[#999999] mb-4">List all markets with optional filters.</p>
                
                <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 mb-4">
                  <h4 className="font-bold mb-2">Query Parameters</h4>
                  <ul className="space-y-2 text-sm text-[#999999]">
                    <li><code className="text-[#00D97E]">sport</code> - Filter by sport slug (e.g. soccer lane uses <code className="text-[#00D97E]">football</code>, plus basketball, tennis, …)</li>
                    <li><code className="text-[#00D97E]">status</code> - Filter by status ("open", "closed", "resolved")</li>
                    <li><code className="text-[#00D97E]">sort</code> - Sort by "volume" or "closes_at"</li>
                    <li><code className="text-[#00D97E]">limit</code> - Results per page (default: 20, max: 100)</li>
                    <li><code className="text-[#00D97E]">offset</code> - Pagination offset</li>
                  </ul>
                </div>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/markets?sport=football&status=open&limit=10"`}
                />
                
                <p className="text-sm text-[#999999] mt-4 mb-2">Response:</p>
                <CodeBlock
                  language="json"
                  code={`{
  "markets": [
    {
      "id": "market-123",
      "title": "Will Team A win?",
      "sport": "football",
      "status": "open",
      "yes_price": 0.65,
      "no_price": 0.35,
      "volume": 125000,
      "liquidity": 50000,
      "closes_at": "2024-12-31T23:59:59Z"
    }
  ],
  "total": 247,
  "page": 1
}`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/markets/:id</h3>
                <p className="text-[#999999] mb-4">Get detailed information about a specific market.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/markets/market-123"`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/markets/:id/orderbook</h3>
                <p className="text-[#999999] mb-4">Get the current orderbook for a market.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/markets/market-123/orderbook"`}
                />
                
                <p className="text-sm text-[#999999] mt-4 mb-2">Response:</p>
                <CodeBlock
                  language="json"
                  code={`{
  "market_id": "market-123",
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
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/markets/:id/trades</h3>
                <p className="text-[#999999] mb-4">Get recent trades for a market.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/markets/market-123/trades?limit=50"`}
                />
              </div>
            </div>
          </section>

          {/* REST API - Orders */}
          <section id="rest-orders" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">REST API: Orders</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3">POST /v1/orders</h3>
                <p className="text-[#999999] mb-4">Place a new order.</p>
                
                <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 mb-4">
                  <h4 className="font-bold mb-2">Request Body</h4>
                  <ul className="space-y-2 text-sm text-[#999999]">
                    <li><code className="text-[#00D97E]">market_id</code> - Market identifier (required)</li>
                    <li><code className="text-[#00D97E]">side</code> - "YES" or "NO" (required)</li>
                    <li><code className="text-[#00D97E]">size</code> - Order size in USDC (required)</li>
                    <li><code className="text-[#00D97E]">type</code> - "market" or "limit" (default: "market")</li>
                    <li><code className="text-[#00D97E]">price</code> - Limit price (required for limit orders)</li>
                  </ul>
                </div>
                
                <CodeBlock
                  language="bash"
                  code={`curl -X POST "https://api.predictio.live/v1/orders" \\
  -H "Authorization: Bearer pk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "market_id": "market-123",
    "side": "YES",
    "size": 100,
    "type": "market"
  }'`}
                />
                
                <p className="text-sm text-[#999999] mt-4 mb-2">Response:</p>
                <CodeBlock
                  language="json"
                  code={`{
  "order_id": "order-456",
  "market_id": "market-123",
  "side": "YES",
  "size": 100,
  "price": 0.65,
  "shares": 153.85,
  "status": "filled",
  "timestamp": 1730376000123
}`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/orders</h3>
                <p className="text-[#999999] mb-4">List your orders.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/orders?status=open&limit=50" \\
  -H "Authorization: Bearer pk_live_..."`}
                />
              </div>
            </div>
          </section>

          {/* REST API - Account */}
          <section id="rest-account" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">REST API: Account</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/account/positions</h3>
                <p className="text-[#999999] mb-4">Get your current open positions.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/account/positions" \\
  -H "Authorization: Bearer pk_live_..."`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/account/fills</h3>
                <p className="text-[#999999] mb-4">Get your order fill history.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/account/fills?limit=100" \\
  -H "Authorization: Bearer pk_live_..."`}
                />
              </div>
            </div>
          </section>

          {/* REST API - Data Feeds */}
          <section id="rest-feeds" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">REST API: Data Feeds</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/feeds/spreads</h3>
                <p className="text-[#999999] mb-4">Get cross-market spread opportunities.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/feeds/spreads?min_bps=50"`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/feeds/volume-anomalies</h3>
                <p className="text-[#999999] mb-4">Detect unusual volume spikes.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/feeds/volume-anomalies?window=5m"`}
                />
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3">GET /v1/feeds/liquidity-gaps</h3>
                <p className="text-[#999999] mb-4">Find markets with thin liquidity.</p>
                
                <CodeBlock
                  language="bash"
                  code={`curl "https://api.predictio.live/v1/feeds/liquidity-gaps"`}
                />
              </div>
            </div>
          </section>

          {/* WebSocket Connection */}
          <section id="ws-connection" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">WebSocket: Connection & Auth</h2>
            <p className="text-[#999999] mb-4">
              Connect to our WebSocket API for real-time data streams.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-400">
                <strong>WebSocket URL:</strong> <code className="font-mono">wss://api.predictio.live/ws</code>
              </p>
            </div>

            <CodeBlock
              language="javascript"
              code={`const ws = new WebSocket('wss://api.predictio.live/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    api_key: 'pk_live_...'
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};`}
            />
          </section>

          {/* WebSocket Channels */}
          <section id="ws-channels" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">WebSocket: Channels</h2>
            <p className="text-[#999999] mb-4">
              Subscribe to different data channels after authentication.
            </p>

            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 mb-6">
              <h4 className="font-bold mb-2">Available Channels</h4>
              <ul className="space-y-2 text-sm text-[#999999]">
                <li><code className="text-[#00D97E]">orderbook:market-id</code> - Real-time orderbook updates</li>
                <li><code className="text-[#00D97E]">trades:market-id</code> - Live trade feed</li>
                <li><code className="text-[#00D97E]">markets</code> - Market metadata updates</li>
                <li><code className="text-[#00D97E]">account</code> - Your order and position updates</li>
              </ul>
            </div>

            <CodeBlock
              language="javascript"
              code={`// Subscribe to channels
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: [
    'orderbook:market-123',
    'trades:market-123',
    'account'
  ]
}));

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  channels: ['orderbook:market-123']
}));`}
            />
          </section>

          {/* WebSocket Orderbook */}
          <section id="ws-orderbook" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">WebSocket: Orderbook Stream</h2>
            
            <CodeBlock
              language="javascript"
              code={`ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['orderbook:market-123']
}));

// Receive updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.channel === 'orderbook') {
    console.log('Bids:', data.bids);
    console.log('Asks:', data.asks);
    console.log('Spread:', data.spread_bps, 'bps');
  }
};`}
            />

            <p className="text-sm text-[#999999] mt-4 mb-2">Message format:</p>
            <CodeBlock
              language="json"
              code={`{
  "channel": "orderbook",
  "market_id": "market-123",
  "bids": [[0.64, 1200], [0.63, 3400]],
  "asks": [[0.66, 800], [0.67, 2200]],
  "spread_bps": 200,
  "mid": 0.65,
  "timestamp": 1730376000123
}`}
            />
          </section>

          {/* WebSocket Trades */}
          <section id="ws-trades" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">WebSocket: Trades Stream</h2>
            
            <CodeBlock
              language="javascript"
              code={`ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['trades:market-123']
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.channel === 'trades') {
    console.log('New trade:', data.side, data.size, '@', data.price);
  }
};`}
            />

            <p className="text-sm text-[#999999] mt-4 mb-2">Message format:</p>
            <CodeBlock
              language="json"
              code={`{
  "channel": "trades",
  "market_id": "market-123",
  "trade_id": "trade-789",
  "side": "YES",
  "size": 100,
  "price": 0.65,
  "timestamp": 1730376000123
}`}
            />
          </section>

          {/* Error Handling */}
          <section id="error-handling" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Error Handling</h2>
            
            <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4 mb-6">
              <h4 className="font-bold mb-2">HTTP Status Codes</h4>
              <ul className="space-y-2 text-sm text-[#999999]">
                <li><code className="text-[#00D97E]">200</code> - Success</li>
                <li><code className="text-[#00D97E]">400</code> - Bad Request (invalid parameters)</li>
                <li><code className="text-[#00D97E]">401</code> - Unauthorized (invalid or missing API key)</li>
                <li><code className="text-[#00D97E]">404</code> - Not Found (market or resource doesn't exist)</li>
                <li><code className="text-[#00D97E]">429</code> - Rate Limit Exceeded</li>
                <li><code className="text-[#00D97E]">500</code> - Internal Server Error</li>
              </ul>
            </div>

            <p className="text-sm text-[#999999] mb-2">Error response format:</p>
            <CodeBlock
              language="json"
              code={`{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}`}
            />

            <div className="mt-6">
              <h4 className="font-bold mb-3">Handling Rate Limits</h4>
              <CodeBlock
                language="python"
                code={`import time
from predictio import Client

client = Client(wallet=account)

try:
    markets = client.markets.list()
except RateLimitError as e:
    # Wait and retry
    time.sleep(e.retry_after)
    markets = client.markets.list()`}
              />
            </div>
          </section>

          {/* Best Practices */}
          <section id="best-practices" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Best Practices</h2>
            
            <div className="space-y-4">
              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00D97E]" />
                  Use WebSockets for Real-Time Data
                </h4>
                <p className="text-sm text-[#999999]">
                  For orderbook and trade data, use WebSocket streams instead of polling REST endpoints. 
                  This reduces latency and conserves rate limits.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-[#00D97E]" />
                  Implement Exponential Backoff
                </h4>
                <p className="text-sm text-[#999999]">
                  When encountering rate limits or errors, implement exponential backoff with jitter 
                  to avoid thundering herd problems.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#00D97E]" />
                  Test with Paper Trading
                </h4>
                <p className="text-sm text-[#999999]">
                  Use paper trading mode to test your strategies without risking real funds. 
                  Simply pass <code className="text-[#00D97E]">paper=True</code> when initializing the client.
                </p>
              </div>

              <div className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-4">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#00D97E]" />
                  Handle Network Failures Gracefully
                </h4>
                <p className="text-sm text-[#999999]">
                  Always implement connection retry logic and handle WebSocket disconnections. 
                  Our SDKs include automatic reconnection with exponential backoff.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Troubleshooting</h2>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  "Invalid signature" error
                </h4>
                <p className="text-sm text-[#999999] mb-2">
                  Ensure you're signing the exact challenge message returned by the API. 
                  Check that your wallet library is correctly implementing EIP-712 signatures.
                </p>
                <CodeBlock
                  language="python"
                  code={`# Correct: Sign the full structured data
signature = account.sign_message(challenge)

# Incorrect: Don't hash or modify the challenge
# signature = account.sign_message(hash(challenge))  # ❌`}
                />
              </div>

              <div>
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  WebSocket connection drops
                </h4>
                <p className="text-sm text-[#999999] mb-2">
                  WebSocket connections may drop due to network issues or inactivity. 
                  Implement automatic reconnection logic:
                </p>
                <CodeBlock
                  language="javascript"
                  code={`let reconnectDelay = 1000;

function connect() {
  const ws = new WebSocket('wss://api.predictio.live/ws');
  
  ws.onclose = () => {
    console.log('Disconnected, reconnecting in', reconnectDelay, 'ms');
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000); // Max 30s
  };
  
  ws.onopen = () => {
    reconnectDelay = 1000; // Reset on successful connection
  };
}`}
                />
              </div>

              <div>
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Rate limit exceeded
                </h4>
                <p className="text-sm text-[#999999]">
                  If you're hitting rate limits, consider:
                </p>
                <ul className="list-disc list-inside text-sm text-[#999999] space-y-1 mt-2">
                  <li>Using WebSocket streams instead of polling REST endpoints</li>
                  <li>Caching market data that doesn't change frequently</li>
                  <li>Batching requests where possible</li>
                  <li>Implementing client-side rate limiting to stay under 1000 req/min</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section>
            <h2 className="text-3xl font-bold mb-4">Next Steps</h2>
            <div className="grid gap-4">
              <a
                href="/developers/keys"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 hover:bg-[#00D97E]/5 transition-all group"
              >
                <h3 className="font-bold mb-2 group-hover:text-[#00D97E] transition-colors">
                  Generate your API key →
                </h3>
                <p className="text-sm text-[#999999]">
                  Connect your wallet and generate your API key in 30 seconds.
                </p>
              </a>
              <a
                href="https://github.com/predictio/sdk-examples"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 hover:bg-[#00D97E]/5 transition-all group"
              >
                <h3 className="font-bold mb-2 group-hover:text-[#00D97E] transition-colors">
                  Browse examples →
                </h3>
                <p className="text-sm text-[#999999]">
                  Check out our GitHub repository for example strategies and integrations.
                </p>
              </a>
              <a
                href="https://discord.gg/predictio"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#111111] border border-[#00D97E]/20 rounded-lg p-6 hover:bg-[#00D97E]/5 transition-all group"
              >
                <h3 className="font-bold mb-2 group-hover:text-[#00D97E] transition-colors">
                  Join our Discord →
                </h3>
                <p className="text-sm text-[#999999]">
                  Get help from our developer community and the Predictio team.
                </p>
              </a>
            </div>
          </section>
        </main>
      </div>

    </div>
  );
}

