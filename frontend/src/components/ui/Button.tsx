import React from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
}

export function Button({ children, variant, onClick, disabled = false, className = '' }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
