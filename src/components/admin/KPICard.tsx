import { useEffect, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number;
  change: number;
  changeLabel: string;
  format?: 'number' | 'currency' | 'percentage';
}

export function KPICard({ label, value, change, changeLabel, format = 'number' }: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1000; // 1 second
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  const formatValue = (val: number) => {
    if (format === 'currency') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
      }
      return `$${val.toLocaleString()}`;
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    return val.toLocaleString();
  };

  const isPositive = change >= 0;

  return (
    <div
      ref={cardRef}
      className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-brand-green/30 transition-colors"
    >
      <div className="text-sm text-gray-400 mb-2 font-medium">{label}</div>
      <div className="text-4xl font-mono font-bold text-white mb-3">
        {formatValue(displayValue)}
      </div>
      <div className={`flex items-center gap-1.5 text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        <span className="font-mono">
          {isPositive ? '+' : ''}{change} {changeLabel}
        </span>
      </div>
    </div>
  );
}
