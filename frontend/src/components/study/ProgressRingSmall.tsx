import React from 'react';

interface ProgressProps {
  current: number;
  total: number;
}

export function ProgressRingSmall({ current, total }: ProgressProps) {
  const radius = 18;
  const stroke = 3;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (total > 0 ? (current / total) : 0) * circumference;

  return (
    <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
      <circle stroke="var(--border)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
      <circle stroke="var(--accent)" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.3s ease' }} r={normalizedRadius} cx={radius} cy={radius} />
    </svg>
  );
}
