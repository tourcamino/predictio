import { Link } from '@tanstack/react-router';
import { TrendingUp, ArrowRight } from 'lucide-react';

export function TradeCTA() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green/10 via-emerald-500/5 to-transparent border border-brand-green/20 p-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/30">
            <TrendingUp className="w-6 h-6 text-brand-green" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-syne font-bold text-white mb-2">
              Ready to Trade This Market?
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Put your insights to work. Trade on live sports events, political outcomes, 
              and more with USDC on Base blockchain. Low fees, instant settlements, 
              and transparent odds.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/markets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-black font-semibold rounded-lg hover:bg-brand-green/90 transition-all group"
          >
            Browse Live Markets
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link
            to="/about"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
          >
            Learn How It Works
          </Link>
        </div>
      </div>
    </div>
  );
}
