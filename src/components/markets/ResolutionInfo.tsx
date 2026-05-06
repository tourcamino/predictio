import { Disclosure } from '@headlessui/react';
import { ChevronDown, Info } from 'lucide-react';

interface ResolutionInfoProps {
  azuroData?: {
    gameId?: string;
    conditionId?: string;
    status?: string;
    result?: string;
  };
}

export function ResolutionInfo({ azuroData }: ResolutionInfoProps = {}) {
  return (
    <div className="bg-brand-bg border border-white/10 rounded-lg overflow-hidden">
      <Disclosure>
        {({ open }) => (
          <>
            <Disclosure.Button className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-brand-green" />
                <h3 className="font-syne font-bold text-lg">How does this market resolve?</h3>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  open ? 'transform rotate-180' : ''
                }`}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="px-6 py-4 border-t border-white/10 bg-white/5">
              <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                <p>
                  This market resolves <strong className="text-white">automatically</strong> when
                  the match ends. Results are provided by{' '}
                  <strong className="text-brand-green">Azuro Protocol's sports oracle network</strong>,
                  which aggregates data from multiple official sources.
                </p>
                
                {azuroData?.conditionId && (
                  <div className="p-3 bg-brand-green/10 border border-brand-green/30 rounded-lg font-mono text-xs">
                    <div className="text-gray-400 mb-1">Azuro Condition ID:</div>
                    <div className="text-brand-green break-all">{azuroData.conditionId}</div>
                  </div>
                )}
                
                <p>
                  Resolution typically occurs within <strong className="text-white">30 minutes</strong> of
                  the final whistle. Winning predictions are automatically credited to your wallet —{' '}
                  <strong className="text-white">no manual claim required</strong>.
                </p>
                
                {azuroData?.status === 'Resolved' && azuroData.result && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-400 text-lg">✓</span>
                      <span className="text-purple-400 font-semibold">Market Resolved</span>
                    </div>
                    <div className="text-gray-300">
                      Result: <strong className="text-white">{azuroData.result === 'home' ? 'Home team wins' : 'Away team wins'}</strong>
                    </div>
                  </div>
                )}
                
                <div className="pt-3 border-t border-white/10">
                  <h4 className="font-semibold text-white mb-2">Key Points:</h4>
                  <ul className="space-y-2 list-disc list-inside text-gray-400">
                    <li>Results verified by multiple independent oracle nodes</li>
                    <li>Payouts are instant and non-custodial (paper trading mode)</li>
                    <li>In case of match cancellation, all positions are refunded</li>
                    <li>Powered by Azuro Protocol — transparent and verifiable</li>
                  </ul>
                </div>
                
                <div className="pt-3 border-t border-white/10">
                  <a
                    href="https://azuro.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-brand-cyan hover:text-brand-cyan/80 transition-colors"
                  >
                    Learn more about Azuro Protocol →
                  </a>
                </div>
              </div>
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
