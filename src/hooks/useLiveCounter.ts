import { useState, useEffect } from 'react';

interface UseLiveCounterOptions {
  initialValue: number;
  interval: number; // milliseconds
  minIncrement: number;
  maxIncrement: number;
  flashDuration?: number; // milliseconds for flash effect
}

export function useLiveCounter({
  initialValue,
  interval,
  minIncrement,
  maxIncrement,
  flashDuration = 200,
}: UseLiveCounterOptions) {
  const [value, setValue] = useState(initialValue);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const increment = Math.floor(
        Math.random() * (maxIncrement - minIncrement + 1) + minIncrement
      );
      
      setValue((prev) => prev + increment);
      setIsFlashing(true);
      
      setTimeout(() => setIsFlashing(false), flashDuration);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, minIncrement, maxIncrement, flashDuration]);

  return { value, isFlashing };
}
