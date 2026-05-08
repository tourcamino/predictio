import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Header } from '~/components/Header';
import { ArrowLeft, CheckCircle, AlertTriangle, XCircle, Mail } from 'lucide-react';
import { AppealForm } from '~/components/markets/AppealForm';
import { useWallet } from '~/store/useWalletStore';

export const Route = createFileRoute('/resolution-policy/')({
  component: ResolutionPolicyPage,
});

function ResolutionPolicyPage() {
  const { address, isConnected, openWalletModal } = useWallet();
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealMarketId] = useState('example-market-id'); // This would be dynamic in real usage

  return (
    <div className="min-h-screen bg-brand-navy">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Back Button */}
        <Link
          to="/markets"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-green transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Markets
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-syne font-bold mb-4">Market Resolution Policy</h1>
          <p className="text-xl text-gray-400">
            How we ensure fair and transparent outcomes for all markets
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <section>
            <div className="flex items-start gap-4 mb-4">
              <CheckCircle className="w-6 h-6 text-brand-green flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-syne font-bold mb-4">How markets resolve</h2>
                <div className="text-gray-300 space-y-4 leading-relaxed">
                  <p>
                    Markets resolve automatically via the Azuro oracle on BASE within 30 minutes of the event ending. 
                    The oracle aggregates data from multiple official sources to ensure accuracy and reliability.
                  </p>
                  <p>
                    Winning token holders receive $1.00 USDC per share. Losing tokens expire at $0.00. 
                    All payouts are processed automatically and sent directly to your wallet — no manual claim required.
                  </p>
                  <p>
                    The resolution process is transparent and verifiable on-chain. You can view the oracle data 
                    and resolution transaction for any market in its detail page.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="border-t border-white/10 pt-12">
            <div className="flex items-start gap-4 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-syne font-bold mb-4">What happens if a result is disputed</h2>
                <div className="text-gray-300 space-y-4 leading-relaxed">
                  <p>
                    If the oracle returns no data or the result is contested, the market enters{' '}
                    <strong className="text-yellow-500">Under Review</strong> status. Trading is immediately 
                    paused and no positions can be opened or closed.
                  </p>
                  <p>
                    Our resolution committee (3 admins) reviews the case within 24 hours. The committee examines:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Official event results from primary sources</li>
                    <li>Oracle data logs and any error messages</li>
                    <li>Community reports and evidence</li>
                    <li>Relevant federation or league announcements</li>
                  </ul>
                  <p>
                    A resolution requires a 2-out-of-3 vote from the committee. Once approved, the market 
                    is either resolved with the correct outcome or voided if no fair resolution is possible.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="border-t border-white/10 pt-12">
            <div className="flex items-start gap-4 mb-4">
              <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-syne font-bold mb-4">When markets are voided</h2>
                <div className="text-gray-300 space-y-4 leading-relaxed">
                  <p>
                    Markets are voided when a fair resolution is impossible. This occurs when:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>The event is cancelled by the organizing federation</li>
                    <li>The event cannot be verified through official sources</li>
                    <li>Fraud or manipulation is detected that affects the outcome</li>
                    <li>The oracle experiences a critical failure</li>
                  </ul>
                  <p>
                    When a market is voided, all positions are refunded in full. You receive back exactly 
                    what you invested, with no fees charged. Refunds are processed automatically within 
                    1 hour of the void decision.
                  </p>
                  <p className="text-yellow-500 font-medium">
                    Note: Voiding a market is a last resort and happens in less than 0.5% of all markets.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="border-t border-white/10 pt-12">
            <div className="flex items-start gap-4 mb-4">
              <Mail className="w-6 h-6 text-brand-green flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-syne font-bold mb-4">Appeals</h2>
                <div className="text-gray-300 space-y-4 leading-relaxed">
                  <p>
                    If you believe a resolution was incorrect, you can file an appeal within 48 hours 
                    of the market being resolved. All appeals are reviewed within 72 hours.
                  </p>
                  <p>
                    To file an appeal, you can either:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Use our appeal submission form (recommended)</li>
                    <li>Email <a href="mailto:support@predictio.live" className="text-brand-green hover:underline">support@predictio.live</a> with the market ID</li>
                  </ol>
                  <p>
                    When submitting an appeal, include:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Evidence supporting your claim (links to official sources, screenshots, etc.)</li>
                    <li>Clear explanation of why you believe the resolution was incorrect</li>
                    <li>Any relevant timestamps or specific details</li>
                  </ul>
                  <p>
                    Our team will investigate and respond with a decision. If the appeal is successful, 
                    the market will be re-resolved or voided with full refunds.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Appeals are taken seriously and reviewed by senior staff. However, decisions made 
                    by the resolution committee are final after the appeal window closes.
                  </p>

                  {/* Appeal Form Button */}
                  <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-lg">
                    <button
                      onClick={() => {
                        if (!isConnected) {
                          openWalletModal();
                        } else {
                          setShowAppealForm(true);
                        }
                      }}
                      className="w-full py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all"
                    >
                      {isConnected ? 'Submit an Appeal' : 'Connect Wallet to Submit Appeal'}
                    </button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      You must have an active position in the market to submit an appeal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="border-t border-white/10 pt-12">
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
              <h3 className="text-xl font-syne font-bold mb-3">Questions about resolution?</h3>
              <p className="text-gray-400 mb-6">
                Our support team is here to help clarify any aspect of our resolution process.
              </p>
              <a
                href="mailto:support@predictio.live"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-brand-bg font-semibold rounded-lg hover:bg-brand-green/90 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Contact Support
              </a>
            </div>
          </section>
        </div>
      </div>


      {/* Appeal Form Modal */}
      {showAppealForm && address && (
        <AppealForm
          marketId={appealMarketId}
          marketName="Example Market"
          walletAddress={address}
          onClose={() => setShowAppealForm(false)}
        />
      )}
    </div>
  );
}

