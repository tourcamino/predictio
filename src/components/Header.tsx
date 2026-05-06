import { useState, useEffect } from 'react';
import { Menu, X, LogOut, Loader2, Hexagon } from 'lucide-react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';
import { WalletDropdown } from './WalletDropdown';
import { Menu as HeadlessMenu } from '@headlessui/react';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { NotificationBell } from './notifications/NotificationBell';
import { NotificationCenter } from './notifications/NotificationCenter';
import { useScrollDirection } from '~/hooks/useScrollDirection';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileDisconnectConfirm, setShowMobileDisconnectConfirm] = useState(false);
  const [isDemoBannerVisible, setIsDemoBannerVisible] = useState(true);
  const { isConnected, address, balance, openWalletModal, disconnectWallet, isSyncing } = useWallet();
  const { isActive: isDemoActive, balance: demoBalance } = useDemoAccount();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { scrollDirection, isAtTop } = useScrollDirection();

  // Fetch open positions count
  const positionsQuery = useQuery({
    ...trpc.getUserPositions.queryOptions({
      walletAddress: address || '',
      status: 'open',
    }),
    enabled: !!address && isConnected,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const openPositionsCount = positionsQuery.data?.positions.length || 0;

  // Fetch user points
  const pointsQuery = useQuery({
    ...trpc.getPointsSummary.queryOptions({
      walletAddress: address || '',
    }),
    enabled: !!address && isConnected,
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const userPoints = pointsQuery.data?.totalPoints || 0;
  const userTier = pointsQuery.data?.tier || 'BRONZE';
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'DIAMOND': return '#00D4FF';
      case 'GOLD': return '#FFD700';
      case 'SILVER': return '#C0C0C0';
      case 'BRONZE': return '#CD7F32';
      default: return '#CD7F32';
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Monitor demo banner dismissal
  useEffect(() => {
    const checkBannerStatus = () => {
      const dismissed = sessionStorage.getItem('demo-banner-dismissed');
      setIsDemoBannerVisible(dismissed !== 'true');
    };
    
    // Check initial state
    checkBannerStatus();
    
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', checkBannerStatus);
    
    // Custom event for same-tab updates
    const handleBannerDismiss = () => checkBannerStatus();
    window.addEventListener('demo-banner-dismissed', handleBannerDismiss);
    
    return () => {
      window.removeEventListener('storage', checkBannerStatus);
      window.removeEventListener('demo-banner-dismissed', handleBannerDismiss);
    };
  }, []);

  const handleMobileDisconnect = () => {
    if (showMobileDisconnectConfirm) {
      disconnectWallet();
      setIsMobileMenuOpen(false);
      setShowMobileDisconnectConfirm(false);
      // Force navigation to home page after disconnect
      setTimeout(() => {
        navigate({ to: '/', replace: true });
      }, 100);
    } else {
      setShowMobileDisconnectConfirm(true);
      setTimeout(() => setShowMobileDisconnectConfirm(false), 3000);
    }
  };

  // Calculate if header should be visible
  const shouldHideHeader = scrollDirection === 'down' && !isAtTop && !isMobileMenuOpen;
  
  // Calculate translation amount based on banner visibility
  const hideTranslateClass = isDemoActive && isDemoBannerVisible ? '-translate-y-[calc(100%+2.5rem)]' : '-translate-y-full';
  
  // Calculate top position based on demo banner visibility
  const headerTopClass = isDemoActive && isDemoBannerVisible ? 'top-10' : 'top-0';

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${headerTopClass} ${
        isScrolled
          ? 'bg-brand-bg/80 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent'
      } ${shouldHideHeader ? hideTranslateClass : 'translate-y-0'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-brand-green rounded-full"></div>
              <span className="text-xl lg:text-2xl font-syne font-bold tracking-tight">
                PREDICTIO
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/markets"
              data-tour="nav-markets"
              className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
            >
              Markets
            </Link>
            <Link
              to="/copy"
              className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
            >
              Copy
            </Link>
            <Link
              to="/trading"
              className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
            >
              Trading
            </Link>
            <Link
              to="/liquidity"
              className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
            >
              Liquidity
            </Link>
            
            {/* Notification Bell */}
            <div className="relative">
              <NotificationBell />
              <NotificationCenter />
            </div>
          </nav>

          {/* Wallet Button / Demo Balance */}
          <div data-tour="header-balance">
            {!isConnected ? (
              <div className="hidden md:flex items-center gap-3">
                {/* Show demo balance */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-purple-400">
                      ${demoBalance.toFixed(0)} USDC
                    </span>
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                      DEMO
                    </span>
                  </div>
                </div>
                {/* Optional connect wallet button */}
                <button
                  onClick={openWalletModal}
                  data-tour="connect-wallet"
                  className="px-6 py-2.5 bg-brand-green text-brand-bg font-semibold text-sm rounded hover:bg-brand-green/90 transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <HeadlessMenu as="div" className="relative hidden md:block">
                <HeadlessMenu.Button className="flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-brand-green/30 rounded-lg hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse"></div>
                    <span className="font-bold text-brand-green">
                      ${balance.toLocaleString()} USDC
                    </span>
                    {isSyncing && (
                      <Loader2 className="w-3 h-3 text-brand-green animate-spin" />
                    )}
                    {isDemoActive && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                        DEMO
                      </span>
                    )}
                  </div>
                  
                  {/* Points Display */}
                  <Link 
                    to="/account"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Hexagon className="w-3.5 h-3.5 text-brand-green" />
                    <span className="font-mono text-sm font-semibold">{userPoints.toLocaleString()}</span>
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getTierColor(userTier) }}
                      title={userTier}
                    />
                  </Link>
                  
                  {openPositionsCount > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan rounded text-xs font-semibold">
                      <span>{openPositionsCount}</span>
                      <span>position{openPositionsCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <span className="font-mono text-sm text-gray-400 hidden lg:inline">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </HeadlessMenu.Button>
                <WalletDropdown />
              </HeadlessMenu>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-brand-green transition-colors"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col gap-4">
              <Link
                to="/markets"
                className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Markets
              </Link>
              <Link
                to="/copy"
                className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Copy
              </Link>
              <Link
                to="/trading"
                className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Trading
              </Link>
              <Link
                to="/liquidity"
                className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Liquidity
              </Link>
              <Link
                to="/analyst-dashboard"
                className="text-sm font-medium text-gray-300 hover:text-brand-green transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analyst Program
              </Link>
              
              {/* Mobile wallet button */}
              {!isConnected ? (
                <div className="mt-2 space-y-3">
                  <div className="p-3 sm:p-4 bg-white/5 border border-purple-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="font-bold text-purple-400 text-sm sm:text-base">${demoBalance.toFixed(0)} USDC</span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                        DEMO
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">
                      Trading with virtual balance · No wallet required
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      openWalletModal();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 bg-brand-green text-brand-bg font-semibold text-sm rounded hover:bg-brand-green/90 transition-colors"
                  >
                    Connect Wallet (Optional)
                  </button>
                </div>
              ) : (
                <div className="mt-2 p-3 sm:p-4 bg-white/5 border border-brand-green/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse flex-shrink-0"></div>
                    <span className="font-bold text-brand-green text-sm sm:text-base">${balance.toLocaleString()} USDC</span>
                    {isSyncing && (
                      <Loader2 className="w-3 h-3 text-brand-green animate-spin flex-shrink-0" />
                    )}
                    {isDemoActive && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                        DEMO
                      </span>
                    )}
                    {openPositionsCount > 0 && (
                      <span className="px-2 py-0.5 bg-brand-cyan/20 text-brand-cyan rounded text-xs font-semibold">
                        {openPositionsCount} open
                      </span>
                    )}
                  </div>
                  
                  {/* Mobile Points Display */}
                  <div className="flex items-center gap-2 mb-3 p-2 bg-white/5 rounded">
                    <Hexagon className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
                    <span className="font-mono text-sm font-semibold">{userPoints.toLocaleString()} pts</span>
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getTierColor(userTier) }}
                    />
                    <span className="text-xs text-gray-400">{userTier}</span>
                  </div>
                  
                  <p className="font-mono text-xs text-gray-400 mb-3 break-all">
                    {address?.slice(0, 10)}...{address?.slice(-8)}
                  </p>
                  <Link
                    to="/portfolio"
                    className="block w-full py-2 text-center bg-brand-green/20 text-brand-green font-semibold text-sm rounded hover:bg-brand-green/30 transition-colors mb-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    View Portfolio
                  </Link>
                  <button
                    onClick={handleMobileDisconnect}
                    className={`w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded transition-colors cursor-pointer ${
                      showMobileDisconnectConfirm
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-white/5 text-red-400 hover:bg-red-500/10'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    {showMobileDisconnectConfirm ? 'Tap again to confirm' : 'Disconnect Wallet'}
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
