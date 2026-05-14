import React from 'react';
import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { Toaster } from "react-hot-toast";
import { WalletSync } from '~/components/WalletSync';
import { WalletChainSync } from '~/components/WalletChainSync';
import { WalletModal } from '~/components/WalletModal';
import { TopStack } from '~/components/TopStack';
import { TopChromeProvider } from '~/components/TopChromeContext';
import { FooterInner } from '~/components/Footer';
import { Chatbot } from '~/components/Chatbot';
import { ScrollToTop } from '~/components/ScrollToTop';
import { useAzuroResolutionPolling } from '~/hooks/useAzuroResolutionPolling';
import { OnboardingTour } from '~/components/onboarding/OnboardingTour';
import { useState, useEffect } from 'react';
import { captureException } from '~/lib/errorMonitoring';
import { resetStaleScrollLocksIfIdle } from '~/lib/bodyScrollLock';

export const Route = createRootRoute({
  component: RootComponent,
});

// Error Boundary to catch errors and prevent full app crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Send to error monitoring system
    captureException(error, {
      tags: { type: 'react-error-boundary' },
      extra: { errorInfo },
      level: 'error',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/5 border border-red-500/50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="font-syne text-2xl font-bold text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. Please refresh the page to continue.
            </p>
            {this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Error details
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-black/20 p-2 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-brand-green text-brand-bg font-bold rounded-lg hover:bg-brand-cyan transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function RootComponent() {
  // Poll Azuro for resolved markets every 5 minutes
  useAzuroResolutionPolling();

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    resetStaleScrollLocksIfIdle();
  }, [pathname]);
  
  const [showTour, setShowTour] = useState(false);
  
  // Check if tour should be shown (after main onboarding)
  useEffect(() => {
    const tourCompleted = localStorage.getItem('onboarding-tour-completed');
    const mainOnboardingCompleted = localStorage.getItem('onboarding-completed');
    
    if (mainOnboardingCompleted === 'true' && tourCompleted !== 'true') {
      // Show tour after a short delay to let the user see the interface
      setTimeout(() => setShowTour(true), 1000);
    }
  }, []);
  
  const handleTourComplete = () => {
    localStorage.setItem('onboarding-tour-completed', 'true');
    setShowTour(false);
  };
  
  const handleTourSkip = () => {
    localStorage.setItem('onboarding-tour-completed', 'true');
    setShowTour(false);
  };
  
  return (
    <ErrorBoundary>
      <TopChromeProvider value={true}>
        <div className="min-h-screen flex flex-col">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#00FF87',
                secondary: '#1a1a1a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#1a1a1a',
              },
            },
          }}
        />
        <WalletSync />
        <WalletChainSync />
        <WalletModal />
        <TopStack />
        <Chatbot />
        <ScrollToTop />
        <OnboardingTour 
          isActive={showTour}
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
        <main className="flex-1" style={{ paddingTop: 'calc(var(--top-stack-height) + 0px)' }}>
          <Outlet />
        </main>
        <FooterInner />
        </div>
      </TopChromeProvider>
    </ErrorBoundary>
  );
}
