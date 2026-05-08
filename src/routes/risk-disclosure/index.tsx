import { createFileRoute } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { AlertTriangle } from 'lucide-react';

export const Route = createFileRoute('/risk-disclosure/')({
  component: RiskDisclosurePage,
});

const risks = [
  {
    title: 'Loss of Funds',
    description: 'Prediction markets involve significant financial risk. You may lose all funds you commit to predictions. Only participate with amounts you can afford to lose completely.',
  },
  {
    title: 'Smart Contract Risk',
    description: 'While smart contracts are audited, they may contain vulnerabilities or bugs that could result in loss of funds. Blockchain transactions are irreversible.',
  },
  {
    title: 'Market Volatility',
    description: 'Odds and market conditions can change rapidly. The value of your positions may fluctuate significantly before market resolution.',
  },
  {
    title: 'Oracle Risk',
    description: 'Market outcomes are determined by decentralized oracle systems. While designed to be reliable, oracles may provide incorrect data or fail to resolve markets.',
  },
  {
    title: 'Regulatory Risk',
    description: 'Prediction markets may be subject to regulatory restrictions in your jurisdiction. It is your responsibility to ensure compliance with local laws.',
  },
  {
    title: 'Liquidity Risk',
    description: 'Some markets may have low liquidity, making it difficult to enter or exit positions at desired prices. Early exit may not always be possible.',
  },
  {
    title: 'Blockchain Risk',
    description: 'Network congestion, high gas fees, or blockchain issues may affect your ability to interact with the platform or complete transactions.',
  },
  {
    title: 'Wallet Security',
    description: 'You are responsible for securing your wallet and private keys. Loss of access to your wallet means permanent loss of funds. Predictio cannot recover lost wallets.',
  },
];

function RiskDisclosurePage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <h1 className="font-syne font-bold text-4xl">Risk Disclosure</h1>
            </div>
            <p className="text-sm text-gray-400 font-mono">
              Last updated: April 2025
            </p>
          </div>

          <div className="mb-8 p-6 bg-red-500/10 border-2 border-red-500/50 rounded-lg">
            <h2 className="font-bold text-red-500 mb-3 text-lg">⚠️ Important Warning</h2>
            <p className="text-red-400 text-sm leading-relaxed mb-3">
              Prediction markets involve substantial financial risk and may not be suitable for everyone. 
              Before participating, carefully consider your financial situation and risk tolerance.
            </p>
            <p className="text-red-400 text-sm leading-relaxed font-semibold">
              You should only predict with funds you can afford to lose completely.
            </p>
          </div>

          <div className="space-y-6">
            {risks.map((risk, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-lg p-6"
              >
                <h3 className="font-syne font-bold text-lg mb-2 flex items-center gap-2">
                  <span className="text-red-500">{index + 1}.</span>
                  {risk.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">{risk.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
            <h3 className="font-bold mb-3">Disclaimer</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              This risk disclosure does not cover all possible risks. Predictio makes no guarantees 
              about platform availability, market outcomes, or profitability. By using Predictio, 
              you acknowledge that you understand these risks and accept full responsibility for your 
              participation. Predictio and its operators are not liable for any losses you may incur.
            </p>
          </div>

          <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-500 text-sm leading-relaxed">
              <strong>Age Requirement:</strong> You must be at least 18 years old to use Predictio. 
              Prediction markets are not suitable for minors.
            </p>
          </div>
        </div>
      </div>
      
    </div>
  );
}

