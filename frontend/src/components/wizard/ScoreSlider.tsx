import React from 'react';
import './ScoreSlider.css';

interface ScoreProps {
  score: number;
  onChangeScore: (score: number) => void;
}

export function ScoreSlider({ score, onChangeScore }: ScoreProps) {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const phrase = score < 70 ? 'Vamos garantir a aprovação!' : score < 85 ? 'Boa meta, vamos buscar excelência!' : 'Ambicioso! Vamos dominar tudo.';

  return (
    <div className="score-slider-step">
      <h3>Meta de nota</h3>
      <div className="svg-container">
        <svg height={radius * 2} width={radius * 2} className="progress-svg">
          <circle stroke="var(--border)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
          <circle stroke="var(--accent)" fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} r={normalizedRadius} cx={radius} cy={radius} strokeLinecap="round" className="progress-circle" />
        </svg>
        <span className="svg-text">{score}%</span>
      </div>
      <input type="range" min="0" max="100" value={score} onChange={e => onChangeScore(Number(e.target.value))} className="range-slider" />
      <p className="motivational-phrase">{phrase}</p>
    </div>
  );
}
