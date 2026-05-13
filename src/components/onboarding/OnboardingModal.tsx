import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Target, DollarSign, Trophy } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from '~/trpc/react';
import { useWallet } from '~/store/useWalletStore';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [balanceCounter, setBalanceCounter] = useState(0);
  const trpc = useTRPC();
  const { address } = useWallet();
  
  const completeOnboardingMutation = useMutation(
    trpc.completeOnboarding.mutationOptions()
  );
  
  // Animate balance counter on step 3
  useEffect(() => {
    if (step === 3 && balanceCounter < 1000) {
      const duration = 1500; // 1.5 seconds
      const steps = 60;
      const increment = 1000 / steps;
      const interval = duration / steps;
      
      const timer = setInterval(() => {
        setBalanceCounter((prev) => {
          const next = prev + increment;
          if (next >= 1000) {
            clearInterval(timer);
            return 1000;
          }
          return next;
        });
      }, interval);
      
      return () => clearInterval(timer);
    }
  }, [step, balanceCounter]);
  
  const persistOnboardingDone = () => {
    if (!address) return;
    completeOnboardingMutation.mutate(
      { walletAddress: address },
      {
        onError: (e) => console.error('[OnboardingModal] completeOnboarding failed:', e),
      },
    );
  };

  const handleComplete = () => {
    onComplete();
    persistOnboardingDone();
  };

  const handleSkip = () => {
    onSkip();
    persistOnboardingDone();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 lg:p-6 animate-fade-in">
      {/* Backdrop with blur - allows seeing the interface behind */}
      <div 
        className="absolute inset-0 bg-brand-bg/80 backdrop-blur-md"
        onClick={handleSkip}
      />
      
      {/* Modal content - responsive and centered */}
      <div className="relative w-full max-w-sm sm:max-w-lg lg:max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] bg-brand-navy border-2 border-brand-green/30 rounded-2xl shadow-2xl overflow-y-auto animate-slide-up">
        {/* Close button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-3 right-3 z-10 p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          aria-label="Close onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Logo */}
            <div className="text-center mb-5 sm:mb-6 lg:mb-8">
              <h1 className="font-syne text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                <span className="text-brand-green">Predictio</span>
                <span className="text-white">.live</span>
              </h1>
            </div>
            
            {/* Title */}
            <h2 className="font-syne text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center mb-3">
              Welcome to Predictio
            </h2>
            
            {/* Subtitle */}
            <p className="text-gray-400 text-center text-sm sm:text-base mb-5 sm:mb-6 lg:mb-8">
              The first sports prediction market on Base
            </p>
            
            {/* Features */}
            <div className="grid gap-3 lg:grid-cols-3 mb-5 sm:mb-6 lg:mb-8">
              <div className="flex lg:flex-col items-start gap-3 p-3 sm:p-4 bg-white/5 rounded-lg">
                <Target className="w-5 h-5 lg:w-6 lg:h-6 text-brand-green flex-shrink-0 mt-0.5 lg:mt-0" />
                <div>
                  <h3 className="font-semibold text-white text-sm lg:text-base mb-1">Trade YES/NO tokens on sports outcomes</h3>
                  <p className="text-xs lg:text-sm text-gray-400">Buy and sell prediction tokens based on real sports events</p>
                </div>
              </div>
              
              <div className="flex lg:flex-col items-start gap-3 p-3 sm:p-4 bg-white/5 rounded-lg">
                <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-brand-green flex-shrink-0 mt-0.5 lg:mt-0" />
                <div>
                  <h3 className="font-semibold text-white text-sm lg:text-base mb-1">Start with $1,000 virtual USDC — no risk</h3>
                  <p className="text-xs lg:text-sm text-gray-400">Practice with paper trading before using real funds</p>
                </div>
              </div>
              
              <div className="flex lg:flex-col items-start gap-3 p-3 sm:p-4 bg-white/5 rounded-lg">
                <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-brand-green flex-shrink-0 mt-0.5 lg:mt-0" />
                <div>
                  <h3 className="font-semibold text-white text-sm lg:text-base mb-1">Compete on the global leaderboard</h3>
                  <p className="text-xs lg:text-sm text-gray-400">Track your performance against other traders</p>
                </div>
              </div>
            </div>
            
            {/* Demo badge */}
            <div className="flex justify-center mb-5 sm:mb-6">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-brand-green/20 border border-brand-green rounded-full">
                <span className="w-2 h-2 bg-brand-green rounded-full animate-pulse" />
                <span className="text-brand-green font-semibold text-xs sm:text-sm">DEMO MODE — No real funds needed</span>
              </div>
            </div>
            
            {/* CTA */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 sm:py-3.5 bg-brand-green text-brand-bg font-bold text-sm sm:text-base rounded-lg hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-2"
            >
              Let's start
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {/* Skip link */}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
        
        {/* Step 2: How it Works */}
        {step === 2 && (
          <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="font-syne text-lg md:text-xl font-bold text-white text-center mb-5">
              How prediction markets work
            </h2>
            
            {/* Visual example */}
            <div className="bg-white/5 rounded-xl p-3 md:p-4 mb-6">
              <h3 className="font-semibold text-white text-sm md:text-base mb-4 text-center">
                Will Real Madrid win the Champions League?
              </h3>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="bg-brand-green/10 border-2 border-brand-green rounded-lg p-3 md:p-4 text-center">
                  <div className="text-xs md:text-sm text-gray-400 mb-1">YES</div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-brand-green">$0.67</div>
                </div>
                <div className="bg-white/5 border-2 border-white/20 rounded-lg p-3 md:p-4 text-center">
                  <div className="text-xs md:text-sm text-gray-400 mb-1">NO</div>
                  <div className="font-mono text-xl md:text-2xl font-bold text-white">$0.33</div>
                </div>
              </div>
              
              <div className="bg-brand-bg/50 rounded-lg p-3 md:p-4 space-y-2">
                <p className="text-xs md:text-sm text-gray-300">
                  <span className="font-semibold text-white">The price = market probability.</span>
                </p>
                <p className="text-xs md:text-sm text-gray-300">
                  Buy YES at $0.67 → if Real Madrid wins, your token pays <span className="text-brand-green font-semibold">$1.00</span>
                </p>
                
                {/* Profit calculation */}
                <div className="flex items-center justify-center gap-2 pt-2 text-brand-green font-mono text-sm md:text-base">
                  <span>$0.67</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>$1.00</span>
                  <span className="text-white">=</span>
                  <span className="font-bold">+$0.33 profit</span>
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 md:py-2.5 bg-white/5 text-white font-semibold text-xs md:text-sm rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-2 md:py-2.5 bg-brand-green text-brand-bg font-bold text-xs md:text-sm rounded-lg hover:bg-brand-green/90 transition-colors flex items-center justify-center gap-2"
              >
                Got it
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Your Balance */}
        {step === 3 && (
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center mb-6 md:mb-8">
              {/* Animated balance counter */}
              <div className="mb-4 md:mb-6">
                <div className="text-[0.6rem] md:text-[0.65rem] text-gray-400 mb-2">YOUR VIRTUAL BALANCE</div>
                <div className="font-mono text-2xl md:text-4xl lg:text-5xl font-bold text-brand-green">
                  ${balanceCounter.toFixed(2)}
                </div>
              </div>
              
              <h2 className="font-syne text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
                You're ready to trade
              </h2>
              
              <p className="text-gray-400 text-[0.65rem] md:text-xs max-w-md mx-auto">
                Your $1,000 virtual USDC is loaded. Trade on real sports markets, climb the leaderboard, risk nothing.
              </p>
            </div>
            
            {/* CTAs */}
            <div className="space-y-3">
              <Link
                to="/markets"
                onClick={handleComplete}
                className="block w-full py-3 md:py-4 bg-brand-green text-brand-bg font-bold text-base md:text-lg rounded-lg hover:bg-brand-green/90 transition-colors text-center"
              >
                Explore Markets →
              </Link>
              
              <Link
                to="/leaderboard"
                onClick={handleComplete}
                className="block w-full py-2.5 md:py-3 text-brand-cyan hover:text-brand-cyan/80 transition-colors text-center font-semibold text-sm md:text-base"
              >
                View leaderboard first
              </Link>
            </div>
            
            {/* Back button */}
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full mt-4 md:mt-6 py-2 text-[0.65rem] md:text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
        
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 pb-2 md:pb-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'bg-brand-green w-6 md:w-8' : 'bg-white/20 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
