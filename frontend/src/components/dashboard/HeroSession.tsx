import React from 'react';
import { Target, Play } from 'lucide-react';
import { Button } from '../ui/Button';
import './HeroSession.css';

interface HeroSessionProps {
  subject: string;
  topic: string;
  timeRemaining: string;
  quizzesPending: number;
  targetScore: number;
  onContinue: () => void;
}

export function HeroSession({ subject, topic, timeRemaining, quizzesPending, targetScore, onContinue }: HeroSessionProps) {
  return (
    <div className="hero-session">
      <div className="hero-content">
        <span className="hero-tag">{subject}</span>
        <h2 className="hero-title">{topic}</h2>
        <div className="hero-meta">
          <span className="hero-meta-item">⏱️ {timeRemaining} restante</span>
          <span className="hero-meta-item">📝 {quizzesPending} quizzes</span>
          <span className="hero-meta-item"><Target size={14} style={{ marginRight: '4px' }} /> Meta: {targetScore}%</span>
        </div>
      </div>
      <Button variant="primary" onClick={onContinue} className="hero-btn">
        <Play size={16} style={{ marginRight: '8px', fill: 'currentColor' }} /> Continuar
      </Button>
    </div>
  );
}
