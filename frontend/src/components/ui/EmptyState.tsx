import React from 'react';
import { Button } from './Button';
import './EmptyState.css';

interface EmptyStateProps {
  icon: string;
  text: string;
  cta?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, text, cta, onCta }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <p className="empty-text">{text}</p>
      {cta && onCta && <Button variant="primary" onClick={onCta} className="empty-cta">{cta}</Button>}
    </div>
  );
}
