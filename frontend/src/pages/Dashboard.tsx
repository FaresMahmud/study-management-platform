import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { HeroSession } from '../components/dashboard/HeroSession';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { SubjectProgress } from '../components/dashboard/SubjectProgress';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useApi } from '../hooks/useApi';
import { useGamification } from '../hooks/useGamification';
import { useAuthStore } from '../store/authStore';
import { mockActivities } from '../components/dashboard/mocks';
import './Dashboard.css';

interface DashboardProps {
  onContinue: () => void;
  onOpenWizard: () => void;
}

export default function Dashboard({ onContinue, onOpenWizard }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const userName = useAuthStore(state => state.userName) || 'Estudante';

  // 1. Fetching Real API Data
  const { data: subjects, loading: loadSub, error: errSub, refetch: refSub } = useApi<any[]>('/api/subjects');
  const { data: sessions, loading: loadSes, error: errSes, refetch: refSes } = useApi<any[]>('/api/study-sessions');
  const { data: goals, loading: loadGoals, error: errGoals, refetch: refGoals } = useApi<any[]>('/api/goals');

  // 2. Gamification Calculations
  const gamification = useGamification(sessions || [], goals || []);

  const loading = loadSub || loadSes || loadGoals;
  const error = errSub || errSes || errGoals;

  const handleRefetch = () => { refSub(); refSes(); refGoals(); };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Erro ao conectar com o servidor local" onRetry={handleRefetch} />;

  // 3. Mapped Subjects Progress Data
  const mappedSubjects = (subjects || []).map(sub => {
    const masteryObj = gamification.masteryBySubject.find(m => m.subjectId === sub.id);
    return {
      name: sub.subjectName,
      progress: masteryObj ? masteryObj.mastery : 40,
      color: sub.color || '#6366f1',
      topicsCount: 10,
      studyTime: '4h 20m',
    };
  });

  const latestGoal = goals && goals.length > 0 ? goals[goals.length - 1] : null;

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-top-row">
            <div>
              <h1 className="dashboard-title">Olá, {userName} 👋</h1>
              <p className="dashboard-subtitle">
                Seu progresso diário está ativo.
                <span className={`zone-badge ${gamification.zone}`}>{gamification.zone}</span>
              </p>
            </div>
            <div className="header-actions">
              <span className="streak-badge">🔥 {gamification.streakDays} dias</span>
              <Button variant="primary" onClick={onOpenWizard}>+ Nova Prova</Button>
            </div>
          </div>
        </header>

        {(!goals || goals.length === 0) ? (
          <EmptyState icon="🎯" text="Você ainda não definiu nenhuma meta de prova. Planeje seu primeiro objetivo!" cta="Configurar Objetivo" onCta={onOpenWizard} />
        ) : (
          <>
            <section className="dashboard-section">
              <HeroSession
                subject={latestGoal.subject?.subjectName || 'MATÉRIA GERAL'}
                topic={latestGoal.title || 'Preparação para Prova'}
                timeRemaining="30m"
                quizzesPending={1}
                targetScore={latestGoal.targetMastery || 80}
                onContinue={onContinue}
              />
            </section>

            <section className="dashboard-section">
              <h2 className="section-title">Ações Rápidas</h2>
              <ActivityGrid activities={mockActivities.map(act => ({ ...act, onClick: onContinue }))} />
            </section>

            <section className="dashboard-section dashboard-grid-two">
              <Card>
                <h2 className="section-title" style={{ marginTop: 0 }}>Progresso por Matéria</h2>
                {mappedSubjects.length === 0 ? <p className="empty-sub-text">Crie matérias para ver seu progresso.</p> : <SubjectProgress subjects={mappedSubjects} />}
              </Card>
              <Card className="summary-card">
                <h2 className="section-title" style={{ marginTop: 0 }}>Meta Diária</h2>
                <div className="daily-stats">
                  <div className="stat-box"><span className="stat-val">{gamification.totalStudyTime}m</span><span className="stat-lbl">Tempo Estudado</span></div>
                  <div className="stat-box"><span className="stat-val">{latestGoal.targetMastery}%</span><span className="stat-lbl">Nota Alvo</span></div>
                </div>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
