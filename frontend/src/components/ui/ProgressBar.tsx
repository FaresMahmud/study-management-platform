import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  value: number;
  color?: string;
}

export function ProgressBar({ value, color = 'var(--accent)' }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div className="progress-bar-container">
      <div 
        className="progress-bar-fill" 
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}
