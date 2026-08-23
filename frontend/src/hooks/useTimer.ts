import { useState, useRef } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (intervalRef.current) return;
    setSeconds(0);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatted = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  return { seconds, formatted, start, stop };
}
