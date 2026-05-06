import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  data,
  color = '#00FF87',
  className = '',
  width = 100,
  height = 24,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return '';

    const padding = 2;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((value - min) / range) * (height - padding * 2) - padding;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    return points.join(' ');
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <div className={`${className}`} style={{ width, height }}>
        <div className="w-full h-full bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      style={{ width, height }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
