import { createFileRoute } from '@tanstack/react-router';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { Globe, Zap, Shield, Users, ExternalLink } from 'lucide-react';
import { useLiveCounter } from '~/hooks/useLiveCounter';

export const Route = createFileRoute('/about/')({
  component: AboutPage,
});

function AboutPage() {
  const volumeCounter = useLiveCounter({
    initialValue: 2400000,
    interval: 20000,
    minIncrement: 100,
    maxIncrement: 500,
  });

  const marketsCounter = useLiveCounter({
    initialValue: 847,
    interval: 20000,
    minIncrement: 1,
    maxIncrement: 3,
  });

  const usersCounter = useLiveCounter({
    initialValue: 12400,
    interval: 20000,
    minIncrement: 5,
    maxIncrement: 15,
  });

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header />
      
      <div className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="font-syne font-bold text-5xl md:text-6xl mb-6">
              Built for the <span className="text-brand-green">Global Sports Fan</span>
            </h1>
            <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
              Predictio is the first truly decentralized sports prediction exchange. 
              No borders. No middlemen. No KYC. Just you, your wallet, and the game.
            </p>
          </div>

          {/* Mission */}
          <div className="mb-16 p-8 bg-white/5 border border-brand-green/30 rounded-lg">
            <h2 className="font-syne font-bold text-2xl mb-4">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Sports betting has been controlled by centralized bookmakers for too long. 
              They set the odds. They hold your funds. They decide who can play.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Predictio changes that. Built on DeFi infrastructure, we enable anyone, 
              anywhere to predict on sports outcomes using USDC. Your funds stay in your wallet. 
              Markets resolve automatically. No one can stop you from playing.
            </p>
          </div>

          {/* Live Stats */}
          <div className="mb-16">
            <h2 className="font-syne font-bold text-2xl mb-6 text-center">Platform Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-center">
                <div className="font-mono text-4xl font-bold text-brand-green mb-2">
                  ${(volumeCounter.value / 1000000).toFixed(1)}M
                </div>
                <div className="text-gray-400">Total Volume</div>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-center">
                <div className="font-mono text-4xl font-bold text-brand-cyan mb-2">
                  {marketsCounter.value.toLocaleString()}
                </div>
                <div className="text-gray-400">Markets Created</div>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg text-center">
                <div className="font-mono text-4xl font-bold text-purple-400 mb-2">
                  {usersCounter.value.toLocaleString()}+
                </div>
                <div className="text-gray-400">Global Users</div>
              </div>
            </div>
          </div>

          {/* Principles */}
          <div className="mb-16">
            <h2 className="font-syne font-bold text-2xl mb-6 text-center">What We Believe</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <Globe className="w-8 h-8 text-brand-green mb-3" />
                <h3 className="font-syne font-bold text-lg mb-2">Global & Borderless</h3>
                <p className="text-gray-400 text-sm">
                  Sports are global. Prediction markets should be too. 
                  No geo-restrictions, no discrimination.
                </p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <Shield className="w-8 h-8 text-brand-cyan mb-3" />
                <h3 className="font-syne font-bold text-lg mb-2">Non-Custodial</h3>
                <p className="text-gray-400 text-sm">
                  Your funds never leave your wallet until you place a prediction. 
                  We never hold your money.
                </p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                <h3 className="font-syne font-bold text-lg mb-2">Instant Settlement</h3>
                <p className="text-gray-400 text-sm">
                  Markets resolve automatically on-chain. Winnings are paid out 
                  immediately. No waiting for withdrawals.
                </p>
              </div>
              <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
                <Users className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="font-syne font-bold text-lg mb-2">Peer-to-Peer</h3>
                <p className="text-gray-400 text-sm">
                  You bet against other users, not the house. Fair odds, 
                  no hidden margins, transparent liquidity.
                </p>
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="mb-16 text-center">
            <h2 className="font-syne font-bold text-2xl mb-4">The Team</h2>
            <p className="text-gray-400 mb-2">
              Built by sports fans and DeFi believers who wanted a better way to predict.
            </p>
            <p className="text-sm text-gray-500">
              The Predictio Team
            </p>
          </div>

          {/* Powered By */}
          <div className="text-center p-8 bg-white/5 border border-white/10 rounded-lg">
            <p className="text-sm text-gray-400 mb-4">Powered by</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="font-syne font-bold text-2xl text-brand-green">Azuro Protocol</div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Predictio is built on Azuro, the leading decentralized sports betting infrastructure.
            </p>
            <a
              href="https://gem.azuro.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-green hover:text-brand-green/80 transition-colors text-sm"
            >
              Learn more about Azuro
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
