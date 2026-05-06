import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, MessageCircle, Link2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWalletStore } from '~/store/useWalletStore';
import { useTRPC } from '~/trpc/react';
import { useQuery } from '@tanstack/react-query';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId?: string;
  marketData?: {
    homeTeam: string;
    awayTeam: string;
    competition: string;
    yesPrice: number;
    volume: number;
    closesAt: Date;
    isLive: boolean;
  };
  userPosition?: {
    outcome: 'YES' | 'NO';
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    shares: number;
  };
}

export function ShareModal({ isOpen, onClose, marketId, marketData, userPosition }: ShareModalProps) {
  const [includePosition, setIncludePosition] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const trpc = useTRPC();
  const { isConnected, address } = useWalletStore();
  
  // Fetch user's referral code if they're an affiliate
  const affiliateQuery = useQuery({
    ...trpc.getReferralEarnings.queryOptions({
      walletAddress: address || '',
    }),
    enabled: !!address && isConnected,
  });
  
  const userRefCode = affiliateQuery.data?.referralCode;

  // Generate share URL with ref code if available
  const baseShareUrl = marketId 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/markets/${marketId}`
    : typeof window !== 'undefined' ? window.location.href : '';
  
  const shareUrl = userRefCode 
    ? `${baseShareUrl}?ref=${userRefCode}`
    : baseShareUrl;

  // Generate share text based on whether position is included
  const generateShareText = (platform: 'twitter' | 'telegram' | 'whatsapp') => {
    if (!marketData) return '';

    const yesPercent = Math.round(marketData.yesPrice * 100);
    
    if (includePosition && userPosition) {
      // Share with position
      const pnlSign = userPosition.pnl >= 0 ? 'up' : 'down';
      const pnlAmount = Math.abs(userPosition.pnl).toFixed(2);
      
      if (platform === 'twitter') {
        return `I'm ${yesPercent}% ${userPosition.outcome} on ${marketData.homeTeam} vs ${marketData.awayTeam}.

Currently ${pnlSign} $${pnlAmount} on @predictio_live 🎯

${shareUrl}

#PredictionMarket #${marketData.competition.replace(/\s+/g, '')} #DeFi #Base`;
      } else if (platform === 'telegram') {
        return `🎯 My Position: ${userPosition.outcome} on ${marketData.homeTeam} vs ${marketData.awayTeam}

Entry: $${userPosition.entryPrice.toFixed(2)} → Current: $${userPosition.currentPrice.toFixed(2)}
P&L: ${pnlSign === 'up' ? '+' : '-'}$${pnlAmount}

Trade on Predictio.live
👉 ${shareUrl}`;
      } else {
        return `${marketData.homeTeam} vs ${marketData.awayTeam} — ${yesPercent}% ${userPosition.outcome}
My P&L: ${pnlSign === 'up' ? '+' : '-'}$${pnlAmount}
${shareUrl}`;
      }
    } else {
      // Share without position
      const volumeK = (marketData.volume / 1000).toFixed(0);
      const closesDate = marketData.closesAt.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      if (platform === 'twitter') {
        return `Will ${marketData.homeTeam} beat ${marketData.awayTeam}?

Currently trading at ${yesPercent}% probability on @predictio_live 🎯

Trade YES/NO tokens on Base 👇
${shareUrl}

#PredictionMarket #${marketData.competition.replace(/\s+/g, '')} #DeFi #Base`;
      } else if (platform === 'telegram') {
        return `🏆 ${marketData.homeTeam} vs ${marketData.awayTeam} — ${marketData.competition}

Market says: ${yesPercent}% chance ${marketData.homeTeam} wins

Trade the outcome on Predictio.live
👉 ${shareUrl}`;
      } else {
        return `${marketData.homeTeam} vs ${marketData.awayTeam} — ${yesPercent}% YES
Trade on ${shareUrl}`;
      }
    }
  };

  const handleTwitterShare = () => {
    const text = generateShareText('twitter');
    const twitterUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({ text }).toString()}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    toast.success('Opening X (Twitter)...');
  };

  const handleTelegramShare = () => {
    const text = generateShareText('telegram');
    const telegramUrl = `https://t.me/share/url?${new URLSearchParams({ text }).toString()}`;
    window.open(telegramUrl, '_blank', 'width=550,height=420');
    toast.success('Opening Telegram...');
  };

  const handleWhatsAppShare = () => {
    const text = generateShareText('whatsapp');
    const whatsappUrl = `https://wa.me/?${new URLSearchParams({ text }).toString()}`;
    window.open(whatsappUrl, '_blank', 'width=550,height=420');
    toast.success('Opening WhatsApp...');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Show loading state if market data is not yet available
  if (!marketData) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-brand-navy border border-brand-green/30 shadow-xl transition-all p-12 text-center">
                  <div className="text-gray-400">Loading...</div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                    Share this market
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Referral Earnings Banner */}
                  {!isConnected && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                      <p className="text-sm text-purple-300 mb-2">
                        💡 <strong>Connect your wallet</strong> to earn referral rewards
                      </p>
                      <p className="text-xs text-gray-400">
                        Earn 15% of trading fees when users sign up through your link
                      </p>
                    </div>
                  )}
                  
                  {isConnected && userRefCode && (
                    <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-4 mb-4">
                      <p className="text-sm text-brand-green mb-1">
                        ✓ Your referral code is active: <code className="font-mono font-bold">{userRefCode}</code>
                      </p>
                      <p className="text-xs text-gray-400">
                        Share this link to earn 15% of trading fees from your referrals
                      </p>
                    </div>
                  )}
                  
                  {isConnected && !userRefCode && !affiliateQuery.isLoading && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                      <p className="text-sm text-yellow-300 mb-2">
                        Want to earn referral rewards?
                      </p>
                      <a
                        href="/affiliates"
                        className="text-xs text-brand-cyan hover:underline"
                      >
                        Join the referral program →
                      </a>
                    </div>
                  )}

                  {/* Social Platforms */}
                  <div className="space-y-3">
                    <button
                      onClick={handleTwitterShare}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
                    >
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <X className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold">Share on X (Twitter)</span>
                    </button>

                    <button
                      onClick={handleTelegramShare}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#0088cc] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold">Share on Telegram</span>
                    </button>

                    <button
                      onClick={handleWhatsAppShare}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-brand-green/30 transition-all group"
                    >
                      <div className="w-10 h-10 bg-[#25D366] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-semibold">Share on WhatsApp</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-brand-navy px-2 text-sm text-gray-500">or</span>
                    </div>
                  </div>

                  {/* Copy Link */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-gray-400 focus:outline-none"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          copied
                            ? 'bg-brand-green text-brand-bg'
                            : 'bg-brand-green/20 text-brand-green border border-brand-green/30 hover:bg-brand-green/30'
                        }`}
                      >
                        {copied ? (
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4" />
                            Copied
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            Copy
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Include Position Toggle */}
                  {userPosition && (
                    <div className="pt-4 border-t border-white/10">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includePosition}
                          onChange={(e) => setIncludePosition(e.target.checked)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-brand-green focus:ring-brand-green focus:ring-offset-0"
                        />
                        <div>
                          <div className="font-semibold text-sm">Include my position</div>
                          <div className="text-xs text-gray-400">
                            Share your {userPosition.outcome} position and P&L
                          </div>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
