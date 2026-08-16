import React from 'react';
import { Button } from './Button';
import './EmptyState.css';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  ctaText?: string;
  ctaAction?: () => void;
}

export function EmptyState({ icon, title, description, ctaText, ctaAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {ctaText && ctaAction && (
        <Button variant="primary" onClick={ctaAction} className="empty-cta">
          {ctaText}
        </Button>
      )}
    </div>
  );
}
