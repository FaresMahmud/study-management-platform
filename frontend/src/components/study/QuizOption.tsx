import React from 'react';
import './QuizOption.css';

interface QuizOptionProps {
  letter: string;
  text: string;
  state: 'neutral' | 'hover' | 'correct' | 'wrong' | 'disabled';
  onClick: () => void;
}

export function QuizOption({ letter, text, state, onClick }: QuizOptionProps) {
  return (
    <div className={`option ${state}`} onClick={onClick}>
      <span className="option-letter">{letter}</span>
      <span className="option-text">{text}</span>
    </div>
  );
}
