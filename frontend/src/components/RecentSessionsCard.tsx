import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { StudySession } from '../types';

interface RecentSessionsCardProps {
  sessions: StudySession[];
}

export default function RecentSessionsCard({ sessions }: RecentSessionsCardProps) {
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
    .slice(0, 5);

  const formatarDuracao = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="flex-between" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Sessões Recentes</h2>
        <Link to="/sessions" className="navbar-link" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
          Ver todas <ChevronRight size={14} />
        </Link>
      </div>

      {recentSessions.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 1rem' }}>
          Nenhuma sessão registrada.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {recentSessions.map(session => (
            <div key={session.id} className="sessao-recente-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span className="color-dot" style={{ backgroundColor: session.subject?.color, margin: 0, flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%' }} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>{session.subject?.subjectName ?? '—'}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px', margin: 0 }}>{formatDate(session.sessionDate)}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <Clock size={13} style={{ color: 'var(--primary)' }} />
                {formatarDuracao(session.duration)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
