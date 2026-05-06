import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export const GLOSSARY_TERMS = {
  'YES Token': 'A token that pays $1 if the event happens, $0 otherwise.',
  'NO Token': 'A token that pays $1 if the event does NOT happen, $0 otherwise.',
  'Orderbook': 'List of all open buy and sell orders at different prices.',
  'Liquidity': 'Total capital available for trading. Higher liquidity means tighter spreads.',
  'Spread': 'The difference between the best buy and best sell price.',
  'Resolution': 'The moment when the event outcome is determined and winners are paid.',
  'Slippage': 'Price difference between expected and executed trade, caused by market impact.',
  'Shares': 'Another word for tokens (YES or NO).',
  'Mid Price': 'The average between the best bid and best ask.',
  'Position': 'Your current holdings in a specific market.',
  'Market Order': 'An order that executes immediately at the current market price.',
  'Limit Order': 'An order that sits in the orderbook until your price is met.',
  'Maker': 'A trader who adds liquidity to the orderbook with limit orders (0% fee).',
  'Taker': 'A trader who removes liquidity with market orders (pays fee).',
  'Price Impact': 'How much your trade moves the market price.',
  'Probability': 'The likelihood of an event happening, reflected in token prices.',
  'AMM': 'Automated Market Maker - a smart contract that provides liquidity.',
  'Pool': 'The total liquidity available for trading in a market.',
};

interface GlossaryTooltipProps {
  term: keyof typeof GLOSSARY_TERMS;
  className?: string;
}

export function GlossaryTooltip({ term, className = '' }: GlossaryTooltipProps) {
  const [show, setShow] = useState(false);
  const definition = GLOSSARY_TERMS[term];
  
  if (!definition) return null;
  
  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="inline-flex items-center text-gray-500 hover:text-brand-green transition-colors"
        aria-label={`Learn about ${term}`}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      
      {show && (
        <>
          {/* Desktop: Popover */}
          <div className="hidden md:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 border border-white/20 rounded-lg text-xs leading-relaxed shadow-xl animate-fade-in">
            <div className="font-semibold text-brand-green mb-1">{term}</div>
            <div className="text-gray-300">{definition}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
          
          {/* Mobile: Bottom Sheet */}
          <div className="md:hidden fixed inset-x-0 bottom-0 z-50 p-4 bg-gray-900 border-t border-white/20 rounded-t-lg shadow-xl animate-slide-up">
            <div className="font-semibold text-brand-green mb-2">{term}</div>
            <div className="text-sm text-gray-300 leading-relaxed">{definition}</div>
            <button
              onClick={() => setShow(false)}
              className="mt-4 w-full py-2 bg-white/10 rounded hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}
