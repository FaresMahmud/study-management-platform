import React from 'react';
import { Flame } from 'lucide-react';
import type { StudySession } from '../types';

interface WeeklyFocusCardProps {
  sessions: StudySession[];
  weeklyTarget?: number;
}

export default function WeeklyFocusCard({ sessions, weeklyTarget = 15 }: WeeklyFocusCardProps) {
  // Lógica de cálculo de foco semanal (últimos 7 dias)
  const getWeeklyHours = (): number => {
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    seteDiasAtras.setHours(0, 0, 0, 0);

    const minsEstaSemana = sessions
      .filter(s => new Date(s.sessionDate) >= seteDiasAtras)
      .reduce((acc, s) => acc + s.duration, 0);
    return Number((minsEstaSemana / 60).toFixed(1));
  };

  const weeklyHours = getWeeklyHours();
  const pctSemana = Math.min(Math.round((weeklyHours / weeklyTarget) * 100), 100);

  return (
    <div className="card focus-weekly-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Flame size={18} style={{ color: '#f97316', flexShrink: 0 }} />
        <h2 className="card-title" style={{ margin: 0 }}>Foco Semanal</h2>
      </div>

      <div className="weekly-focus-content">
        <div className="progress-ring-wrapper">
          <svg height={80} width={80} className="progress-ring-svg">
            {/* Círculo de Fundo */}
            <circle
              stroke="rgba(99, 102, 241, 0.08)"
              fill="transparent"
              strokeWidth={6}
              r={33}
              cx={40}
              cy={40}
            />
            {/* Círculo de Progresso */}
            <circle
              stroke="var(--primary)"
              fill="transparent"
              strokeWidth={6}
              strokeDasharray={`${2 * Math.PI * 33} ${2 * Math.PI * 33}`}
              style={{ 
                strokeDashoffset: `${2 * Math.PI * 33 - (pctSemana / 100) * (2 * Math.PI * 33)}`,
                transition: 'stroke-dashoffset 0.6s ease',
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%'
              }}
              strokeLinecap="round"
              r={33}
              cx={40}
              cy={40}
            />
          </svg>
          <div className="progress-ring-text">{pctSemana}%</div>
        </div>

        <div className="weekly-focus-info">
          <div className="weekly-focus-info-inner">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Esta semana:</span>{' '}
            <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{weeklyHours}h</strong>{' '}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>/ {weeklyTarget}h</span>
          </div>
          <p className="weekly-motivation-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
            {pctSemana === 0 && "Comece a sua semana com o pé direito! Inicie uma sessão de foco. 🎯"}
            {pctSemana > 0 && pctSemana < 50 && "Belo início! Continue alimentando seus hábitos de estudo. 🚀"}
            {pctSemana >= 50 && pctSemana < 100 && "Você já passou da metade! Continue firme rumo à meta! 🔥"}
            {pctSemana >= 100 && "Incrível! Você bateu a sua meta semanal de estudos! Parabéns! 🏆"}
          </p>
        </div>
      </div>
    </div>
  );
}
