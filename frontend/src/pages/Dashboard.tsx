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
  onSelectScreen: (screen: 'dashboard' | 'study' | 'flashcards' | 'exam') => void;
  onOpenWizard: () => void;
}

export default function Dashboard({ onSelectScreen, onOpenWizard }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const userName = useAuthStore(state => state.userName) || 'Estudante';

  const { data: subjects, loading: loadSub, error: errSub, refetch: refSub } = useApi<any[]>('/api/subjects');
  const { data: sessions, loading: loadSes, error: errSes, refetch: refSes } = useApi<any[]>('/api/study-sessions');
  const { data: goals, loading: loadGoals, error: errGoals, refetch: refGoals } = useApi<any[]>('/api/goals');

  const gamification = useGamification(sessions || [], goals || []);

  const loading = loadSub || loadSes || loadGoals;
  const error = errSub || errSes || errGoals;

  const handleRefetch = () => { refSub(); refSes(); refGoals(); };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'flashcards') onSelectScreen('flashcards');
    if (tab === 'subjects') onSelectScreen('study');
    if (tab === 'analytics') onSelectScreen('exam');
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Erro ao conectar com o servidor local" onRetry={handleRefetch} />;

  const mappedSubjects = (subjects || []).map(sub => ({
    name: sub.subjectName,
    progress: gamification.masteryBySubject.find(m => m.subjectId === sub.id)?.mastery || 40,
    color: sub.color || '#6366f1',
    topicsCount: 10,
    studyTime: '4h 20m',
  }));

  const latestGoal = goals && goals.length > 0 ? goals[goals.length - 1] : null;
  let daysRemaining = 0;
  let isSoon = false;
  if (latestGoal?.endDateGoal) {
    const diff = new Date(latestGoal.endDateGoal).getTime() - new Date().setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    isSoon = daysRemaining >= 0 && daysRemaining < 7;
  }

  const activities = [
    { ...mockActivities[0], title: 'Texto Inteligente', description: 'Leitura e quiz rápido', onClick: () => onSelectScreen('study') },
    { ...mockActivities[1], title: 'Simulado', description: 'Modo prova completo', onClick: () => onSelectScreen('exam') },
    { ...mockActivities[2], title: 'Revisar', description: 'Revisar material teórico', onClick: () => onSelectScreen('study') },
    { ...mockActivities[3], title: 'Flashcards', description: 'Revisar cards de hoje', onClick: () => onSelectScreen('flashcards') },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-top-row">
            <div>
              <h1 className="dashboard-title">Olá, {userName} 👋</h1>
              <p className="dashboard-subtitle">Zona: <span className={`zone-badge ${gamification.zone}`}>{gamification.zone}</span></p>
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
                topic={isSoon ? `Sua prova de ${latestGoal.subject?.subjectName || 'Matéria'} é em ${daysRemaining} dias! 🚨` : latestGoal.title}
                timeRemaining="30m"
                quizzesPending={1}
                targetScore={latestGoal.targetMastery || 80}
                onContinue={() => onSelectScreen(isSoon ? 'exam' : 'study')}
              />
            </section>

            <section className="dashboard-section">
              <h2 className="section-title">Ações Rápidas</h2>
              <ActivityGrid activities={activities} />
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
