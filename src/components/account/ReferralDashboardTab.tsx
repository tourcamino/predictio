import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { Copy, DollarSign, Users, TrendingUp, Gift, ExternalLink, RefreshCw, Download, X, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { FeeBreakdownCard } from '~/components/FeeBreakdownCard';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface ReferralDashboardTabProps {
  userWallet: string;
}

export function ReferralDashboardTab({ userWallet }: ReferralDashboardTabProps) {
  const trpc = useTRPC();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  
  const earningsQuery = useQuery({
    ...trpc.getReferralEarnings.queryOptions({ walletAddress: userWallet }),
    enabled: !!userWallet,
  });

  const handleCopyReferralLink = () => {
    if (!earningsQuery.data?.referralCode) return;
    
    const link = `${window.location.origin}/join/${earningsQuery.data.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-large');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 280;
    canvas.height = 280;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `predictio-referral-${earningsQuery.data?.referralCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      toast.success('QR code downloaded!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  if (earningsQuery.isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center">
        <RefreshCw className="w-8 h-8 text-brand-green mx-auto mb-4 animate-spin" />
        <p className="text-gray-400">Loading referral data...</p>
      </div>
    );
  }

  if (earningsQuery.isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-500">Failed to load referral data</p>
      </div>
    );
  }

  const data = earningsQuery.data!;

  if (!data.hasReferralCode) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-lg p-8 text-center">
          <Gift className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="font-syne font-bold text-2xl mb-2">Start Earning Referral Rewards</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Earn 15% of trading fees from users you refer. Get your unique referral code and start earning passive income.
          </p>
          <a
            href="/affiliates"
            className="inline-block px-8 py-3 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 transition-colors"
          >
            Join Referral Program
          </a>
        </div>

        <FeeBreakdownCard variant="detailed" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">Total Earned</span>
          </div>
          <div className="font-mono font-bold text-3xl text-brand-green">
            ${data.totalEarned.toFixed(2)}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">Pending Rewards</span>
          </div>
          <div className="font-mono font-bold text-3xl text-purple-400">
            ${data.pendingRewards.toFixed(2)}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm">Total Referrals</span>
          </div>
          <div className="font-mono font-bold text-3xl">
            {data.totalReferrals}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.activeReferrals} active
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">Referral Volume</span>
          </div>
          <div className="font-mono font-bold text-3xl text-brand-cyan">
            ${(data.totalVolume / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      {/* Referral Link with QR Code */}
      <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 rounded-lg p-6">
        <h3 className="font-syne font-bold text-lg mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-400" />
          Your Referral Link
        </h3>
        <div className="flex items-start gap-4">
          {/* QR Code - Small */}
          <div
            onClick={() => setQrModalOpen(true)}
            className="flex-shrink-0 p-2 bg-white rounded cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all group relative"
            title="Click to enlarge"
          >
            <QRCodeSVG
              value={`https://predictio.live/ref/${data.referralCode}`}
              size={120}
              level="H"
              fgColor="#00FF87"
              bgColor="#080B11"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
              <Maximize2 className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Link and Copy Button */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <code className="flex-1 text-sm font-mono bg-black/20 px-4 py-3 rounded overflow-x-auto">
                {window.location.origin}/join/{data.referralCode}
              </code>
              <button
                onClick={handleCopyReferralLink}
                className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Share this link to earn 15% of trading fees from your referrals
            </p>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Transition appear show={qrModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setQrModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-brand-navy border border-brand-green/30 shadow-xl transition-all">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <Dialog.Title className="font-syne text-xl font-bold">
                      Referral QR Code
                    </Dialog.Title>
                    <button
                      onClick={() => setQrModalOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-white rounded">
                        <QRCodeSVG
                          id="qr-code-large"
                          value={`https://predictio.live/ref/${data.referralCode}`}
                          size={280}
                          level="H"
                          fgColor="#00FF87"
                          bgColor="#080B11"
                        />
                      </div>
                    </div>

                    <div className="text-center mb-4">
                      <p className="text-sm text-gray-400 mb-2">Scan to visit:</p>
                      <code className="text-xs font-mono bg-white/5 px-3 py-1 rounded">
                        predictio.live/ref/{data.referralCode}
                      </code>
                    </div>

                    <button
                      onClick={handleDownloadQR}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-green/90 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download PNG
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Breakdown */}
        <FeeBreakdownCard variant="detailed" />

        {/* Earnings Chart */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-lg mb-4">Earnings (30 Days)</h3>
          
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">Total</div>
            <div className="font-mono font-bold text-3xl text-purple-400">
              ${data.earningsHistory.reduce((sum, d) => sum + d.earnings, 0).toFixed(2)}
            </div>
          </div>

          <div className="relative" style={{ height: "200px" }}>
            <EarningsChart data={data.earningsHistory} />
          </div>
        </div>
      </div>

      {/* Top Referrals */}
      {data.topReferrals.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-lg mb-4">Top Referrals</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Wallet
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Volume Generated
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Your Earnings
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topReferrals.map((ref, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 font-mono text-sm">{ref.wallet}</td>
                    <td className="py-3 px-4 font-mono font-bold text-brand-cyan">
                      ${ref.volumeGenerated.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-purple-400">
                      ${ref.earnedFromUser.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          ref.isActive
                            ? 'bg-brand-green/20 text-brand-green'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {ref.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {new Date(ref.joinedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Rewards */}
      {data.recentRewards.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h3 className="font-syne font-bold text-lg mb-4">Recent Rewards</h3>
          
          <div className="space-y-3">
            {data.recentRewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-purple-400">
                      +${reward.amount.toFixed(2)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        reward.status === 'paid'
                          ? 'bg-brand-green/20 text-brand-green'
                          : reward.status === 'pending_payment'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {reward.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    From ${reward.volume.toFixed(2)} volume · Fee: ${reward.fee.toFixed(2)}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(reward.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EarningsChart({ data }: { data: Array<{ date: number; earnings: number }> }) {
  const maxEarnings = Math.max(...data.map(d => d.earnings), 1);

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      {[0, 25, 50, 75, 100].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.2"
        />
      ))}

      <path
        d={
          data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = 100 - (d.earnings / maxEarnings) * 100;
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ") + ` L 100 100 L 0 100 Z`
        }
        fill="#a855f7"
        fillOpacity="0.2"
      />

      <path
        d={data
          .map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (d.earnings / maxEarnings) * 100;
            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")}
        fill="none"
        stroke="#a855f7"
        strokeWidth="2"
      />
    </svg>
  );
}
