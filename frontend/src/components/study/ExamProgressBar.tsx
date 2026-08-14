import React from 'react';

export function ExamProgressBar({ current, total }: { current: number, total: number }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div style={{ width: '100%', height: '3px', background: 'var(--border)', overflow: 'hidden', position: 'fixed', top: 0, left: 0 }}>
      <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.25s ease' }} />
    </div>
  );
}
