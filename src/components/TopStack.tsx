import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DemoBanner } from '~/components/demo/DemoBanner';
import { NetworkBanner } from '~/components/NetworkBanner';
import { HeaderInner } from '~/components/Header';
import { LiveTickerInner } from '~/components/LiveTicker';
import { useDemoAccount } from '~/hooks/useDemoAccount';
import { useScrollDirection } from '~/hooks/useScrollDirection';

function setCssVar(name: string, valuePx: number) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(name, `${Math.max(0, Math.round(valuePx))}px`);
}

function useMeasuredHeight() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    setHeight(el.getBoundingClientRect().height);

    return () => ro.disconnect();
  }, []);

  return { ref, height };
}

export function TopStack() {
  const { scrollDirection, isAtTop } = useScrollDirection();
  const { isActive: isDemoActive } = useDemoAccount();

  const bannerWrap = useMeasuredHeight();
  const headerWrap = useMeasuredHeight();
  const liveWrap = useMeasuredHeight();

  const [isDemoBannerVisible, setIsDemoBannerVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkBannerStatus = () => {
      const dismissed = sessionStorage.getItem('demo-banner-dismissed');
      setIsDemoBannerVisible(dismissed !== 'true');
    };
    checkBannerStatus();
    window.addEventListener('storage', checkBannerStatus);
    const handleBannerDismiss = () => checkBannerStatus();
    window.addEventListener('demo-banner-dismissed', handleBannerDismiss);
    return () => {
      window.removeEventListener('storage', checkBannerStatus);
      window.removeEventListener('demo-banner-dismissed', handleBannerDismiss);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const v = document?.documentElement?.dataset?.mobileMenuOpen;
      setIsMobileMenuOpen(v === 'true');
    };
    sync();
    window.addEventListener('mobile-menu-toggle', sync);
    return () => window.removeEventListener('mobile-menu-toggle', sync);
  }, []);

  const shouldCollapseBannerOnScroll = useMemo(() => {
    // Web behavior: banner disappears once you scroll down.
    return scrollDirection === 'down' && !isAtTop;
  }, [scrollDirection, isAtTop]);

  const hasGreenBanner = isDemoActive && isDemoBannerVisible;
  const shouldShowBannerArea = hasGreenBanner;
  const bannerCollapsed = !shouldShowBannerArea || shouldCollapseBannerOnScroll;

  // Mobile smart sticky: hide header + live strip on scroll down, show on scroll up.
  const shouldHideTopOnMobile = scrollDirection === 'down' && !isAtTop && !isMobileMenuOpen;

  useEffect(() => {
    setCssVar('--top-banner-height', bannerCollapsed ? 0 : bannerWrap.height);
  }, [bannerWrap.height, bannerCollapsed]);

  useEffect(() => {
    setCssVar('--header-height', headerWrap.height);
  }, [headerWrap.height]);

  useEffect(() => {
    setCssVar('--live-strip-height', liveWrap.height);
  }, [liveWrap.height]);

  useEffect(() => {
    setCssVar(
      '--top-stack-height',
      (bannerCollapsed ? 0 : bannerWrap.height) + headerWrap.height + liveWrap.height,
    );
  }, [bannerWrap.height, headerWrap.height, liveWrap.height, bannerCollapsed]);

  const mobileTranslate = shouldHideTopOnMobile
    ? `translateY(calc(-1 * (var(--header-height) + var(--live-strip-height))))`
    : 'translateY(0px)';

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-auto flex flex-col">
      {/* Level 1: Banner area (collapsible) */}
      <div
        className="relative overflow-hidden transition-[max-height,opacity] duration-300"
        style={{
          maxHeight: bannerCollapsed ? 0 : 120,
          opacity: bannerCollapsed ? 0 : 1,
        }}
      >
        <div ref={bannerWrap.ref}>
          <DemoBanner />
        </div>
      </div>

      {/* Levels 2-3: Header + Live Strip (sticky) */}
      <div
        className="relative left-0 right-0"
        style={{
          zIndex: 99,
          transform: mobileTranslate,
          transition: 'transform 300ms ease',
        }}
      >
        <div ref={headerWrap.ref} className="relative z-[99]">
          <NetworkBanner />
          <HeaderInner />
        </div>
        <div
          ref={liveWrap.ref}
          className="relative z-[98]"
          style={{ zIndex: 98 }}
        >
          <LiveTickerInner />
        </div>
      </div>
    </div>
  );
}

