import React from 'react';
import { Target, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Goal } from '../types';

interface ActiveGoalsCardProps {
  goals: Goal[];
}

export default function ActiveGoalsCard({ goals }: ActiveGoalsCardProps) {
  const activeGoalsList = goals.filter(g => g.progress < g.objectiveHours).slice(0, 3);

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Metas Ativas</h2>
        <Link to="/goals" className="navbar-link" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      {activeGoalsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-secondary)' }}>
          <Target size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <p style={{ fontSize: '0.875rem' }}>Nenhuma meta em andamento.</p>
          <Link to="/goals" className="btn btn-secondary btn-sm" style={{ marginTop: '0.875rem', display: 'inline-block' }}>
            Criar Meta
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {activeGoalsList.map(goal => {
            const pct = Math.min(Math.round((goal.progress / goal.objectiveHours) * 100), 100);
            return (
              <div key={goal.id}>
                <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{goal.title}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{pct}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: goal.subject?.color || 'var(--primary)' }} />
                </div>
                <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  <span>{goal.progress}h / {goal.objectiveHours}h</span>
                  {goal.subject && <span style={{ color: goal.subject.color }}>{goal.subject.subjectName}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
