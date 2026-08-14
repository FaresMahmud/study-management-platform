import React from 'react';
import './FlashcardCard.css';

interface CardProps {
  front: string;
  back: string;
  isFlipped: boolean;
  onClickFlip: () => void;
}

export function FlashcardCard({ front, back, isFlipped, onClickFlip }: CardProps) {
  return (
    <div className={`flashcard-scene`} onClick={onClickFlip}>
      <div className={`flashcard-card-inner ${isFlipped ? 'flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          <p className="flashcard-content">{front}</p>
          <span className="flip-hint">Clique para virar 🔄</span>
        </div>
        <div className="flashcard-face flashcard-back">
          <p className="flashcard-content">{back}</p>
        </div>
      </div>
    </div>
  );
}
