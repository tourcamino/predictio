import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface TourStep {
  id: number;
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  offsetX?: number;
  offsetY?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 5,
    target: 'nav-markets',
    title: 'Browse Markets',
    description: 'Click here to explore all available prediction markets across different sports.',
    position: 'bottom',
    offsetY: 120, // Lower by 120px (3cm) as requested
  },
  {
    id: 6,
    target: 'header-balance',
    title: 'Your Balance',
    description: 'Track your virtual USDC balance here. Start with $1,000 to practice trading risk-free.',
    position: 'bottom',
    offsetY: 120, // Lower by 120px (3cm)
    offsetX: 40,  // Move right by 40px (1cm) as requested
  },
];

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ isActive, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const step = TOUR_STEPS[currentStep];
      if (!step) return;

      const element = document.querySelector(`[data-tour="${step.target}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      // Calculate position based on step configuration
      switch (step.position) {
        case 'bottom':
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2;
          break;
        case 'top':
          top = rect.top - 16;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 16;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 16;
          break;
      }

      // Apply custom offsets
      if (step.offsetX) left += step.offsetX;
      if (step.offsetY) top += step.offsetY;

      setTooltipPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 pointer-events-none" />

      {/* Spotlight on target element */}
      <div className="fixed inset-0 z-40 pointer-events-none">
        <style>
          {`
            [data-tour="${step.target}"] {
              position: relative;
              z-index: 50;
              box-shadow: 0 0 0 4px rgba(0, 255, 135, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5);
            }
          `}
        </style>
      </div>

      {/* Tooltip */}
      <div
        className="fixed z-50 animate-slide-down"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: step.position === 'bottom' || step.position === 'top' 
            ? 'translateX(-50%)' 
            : step.position === 'left' 
            ? 'translate(-100%, -50%)' 
            : 'translateY(-50%)',
        }}
      >
        <div className="bg-brand-navy border-2 border-brand-green rounded-lg shadow-2xl p-6 max-w-sm">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Step counter */}
          <div className="text-xs text-gray-400 mb-2">
            Step {step.id} of {TOUR_STEPS[TOUR_STEPS.length - 1]?.id ?? step.id}
          </div>

          {/* Title */}
          <h3 className="font-syne text-lg font-bold text-white mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-300 mb-4">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-brand-green text-brand-bg font-semibold text-sm rounded-lg hover:bg-brand-green/90 transition-colors"
            >
              {currentStep < TOUR_STEPS.length - 1 ? 'Next' : 'Finish'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Arrow pointer */}
        {step.position === 'bottom' && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-green rotate-45 border-t-2 border-l-2 border-brand-green" />
        )}
        {step.position === 'top' && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-green rotate-45 border-b-2 border-r-2 border-brand-green" />
        )}
        {step.position === 'left' && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-green rotate-45 border-t-2 border-r-2 border-brand-green" />
        )}
        {step.position === 'right' && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-green rotate-45 border-b-2 border-l-2 border-brand-green" />
        )}
      </div>
    </>
  );
}
