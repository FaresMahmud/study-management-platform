import React, { useState, useEffect } from 'react';
import './ExamTimer.css';

interface TimerProps {
  timeLimitMinutes: number;
  onTimeUp: () => void;
}

export function ExamTimer({ timeLimitMinutes, onTimeUp }: TimerProps) {
  const [seconds, setSeconds] = useState(timeLimitMinutes * 60);

  useEffect(() => {
    if (seconds <= 0) { onTimeUp(); return; }
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const formatted = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  const isUrgent = seconds < 300;

  return <div className={`exam-timer ${isUrgent ? 'urgent' : ''}`}>⏱️ {formatted}</div>;
}
