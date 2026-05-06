import { useMemo } from 'react';

interface MiniSparklineProps {
  percentA: number;
  className?: string;
  color?: string;
}

export function MiniSparkline({ percentA, className = '', color = '#00FF87' }: MiniSparklineProps) {
  // Generate sparkline data points based on the current percentage
  // This creates a realistic-looking trend line
  const points = useMemo(() => {
    const numPoints = 20;
    const data: number[] = [];
    
    // Create variation around the current percentage
    const baseValue = percentA;
    const variation = 8; // Max variation in percentage points
    
    for (let i = 0; i < numPoints; i++) {
      // Create a wave-like pattern with some randomness
      const wave = Math.sin(i / 3) * variation;
      const random = (Math.random() - 0.5) * variation * 0.5;
      const trend = (i / numPoints) * (percentA > 50 ? 5 : -5); // Slight trend
      
      let value = baseValue + wave + random + trend;
      value = Math.max(20, Math.min(80, value)); // Clamp between 20-80
      data.push(value);
    }
    
    // Make sure the last point matches the current percentage
    data[data.length - 1] = percentA;
    
    return data;
  }, [percentA]);

  // Generate SVG path
  const path = useMemo(() => {
    const width = 100;
    const height = 24;
    const padding = 2;
    
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = max - min || 1;
    
    const pathData = points
      .map((value, index) => {
        const x = (index / (points.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((value - min) / range) * (height - padding * 2) - padding;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
    
    return pathData;
  }, [points]);

  return (
    <svg
      viewBox="0 0 100 24"
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
