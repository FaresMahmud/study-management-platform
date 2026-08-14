import React from 'react';
import { Button } from '../ui/Button';
import './DifficultyButtons.css';

interface DiffProps {
  onSelect: (quality: 'easy' | 'good' | 'hard') => void;
}

export function DifficultyButtons({ onSelect }: DiffProps) {
  return (
    <div className="difficulty-buttons">
      <Button variant="secondary" onClick={() => onSelect('hard')} className="diff-btn hard">😰 Difícil</Button>
      <Button variant="secondary" onClick={() => onSelect('good')} className="diff-btn good">🤔 Bom</Button>
      <Button variant="secondary" onClick={() => onSelect('easy')} className="diff-btn easy">😀 Fácil</Button>
    </div>
  );
}
