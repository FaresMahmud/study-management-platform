import React from 'react';
import { Button } from './Button';
import './ErrorMessage.css';

interface ErrorProps {
  message: string;
  onRetry: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorProps) {
  return (
    <div className="error-container">
      <p className="error-text">⚠️ {message}</p>
      <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}
