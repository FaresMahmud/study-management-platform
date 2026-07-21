import React from 'react';
import { Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Goal } from '../types';

interface ActiveGoalsCardProps {
  goals: Goal[];
}

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

function CircularProgress({ percentage, size = 42, strokeWidth = 3, color = 'var(--primary)' }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        stroke="var(--bg-tertiary)"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        style={{ transition: 'stroke-dashoffset 0.35s' }}
      />
    </svg>
  );
}

export default function ActiveGoalsCard({ goals }: ActiveGoalsCardProps) {
  // Pegamos apenas as metas de domínio com progresso < 100%
  const activeGoalsList = goals.filter(g => (g.completionPercentage || 0) < 100).slice(0, 3);

  return (
    <div className="card" style={{ height: '100%', padding: 'var(--space-sm)' }}>
      <div className="flex-between" style={{ marginBottom: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Metas de Maestria</h2>
        <Link to="/goals" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      {activeGoalsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-md) var(--space-sm)', color: 'var(--text-secondary)' }}>
          <Target size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
          <p style={{ fontSize: '13px' }}>Nenhuma meta em andamento no momento.</p>
          <Link to="/goals" className="btn btn-secondary btn-sm" style={{ marginTop: '13px', display: 'inline-block' }}>
            Criar Meta
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeGoalsList.map(goal => {
            const pct = Math.round(goal.completionPercentage || 0);
            return (
              <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '13px', background: 'var(--bg-tertiary)', padding: '13px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px' }}>
                  <CircularProgress percentage={pct} size={42} strokeWidth={3} color={goal.subject?.color || 'var(--primary)'} />
                  <span style={{ position: 'absolute', fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)' }}>{pct}%</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{goal.title}</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Proficiência: {goal.currentMastery}% / {goal.targetMastery}%</span>
                    {goal.subject && <span style={{ color: goal.subject.color, fontWeight: 600 }}>{goal.subject.subjectName}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
