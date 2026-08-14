import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSession } from '../components/dashboard/HeroSession';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { SubjectProgress } from '../components/dashboard/SubjectProgress';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Sparkles, X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useGamification } from '../hooks/useGamification';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import { mockActivities } from '../components/dashboard/mocks';
import ExamWizard from '../components/wizard/ExamWizard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const userName = useAuthStore(state => state.userName) || 'Estudante';
  const [showWizard, setShowWizard] = useState(false);

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'tutor'; text: string; sources?: string[] }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const { data: subjects, loading: loadSub, error: errSub, refetch: refSub } = useApi<any[]>('/api/subjects');
  const { data: sessions, loading: loadSes, error: errSes, refetch: refSes } = useApi<any[]>('/api/study-sessions');
  const { data: goals, loading: loadGoals, error: errGoals, refetch: refGoals } = useApi<any[]>('/api/goals');

  const gamification = useGamification(sessions || [], goals || []);

  const loading = loadSub || loadSes || loadGoals;
  const error = errSub || errSes || errGoals;

  const handleRefetch = () => { refSub(); refSes(); refGoals(); };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userText = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const response = await apiClient.post('/api/v1/ai/tutor', { message: userText });
      setChatMessages(prev => [...prev, { sender: 'tutor', text: response.data.response, sources: response.data.sources }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'tutor', text: 'Desculpe, ocorreu um erro ao processar sua pergunta.' }]);
    } finally {
      setChatLoading(false);
    }
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
    { ...mockActivities[0], title: 'Texto Inteligente', description: 'Leitura e quiz rápido', onClick: () => navigate('/study') },
    { ...mockActivities[1], title: 'Simulado', description: 'Modo prova completo', onClick: () => navigate('/exam') },
    { ...mockActivities[2], title: 'Revisar', description: 'Revisar material teórico', onClick: () => navigate('/workspace') },
    { ...mockActivities[3], title: 'Flashcards', description: 'Revisar cards de hoje', onClick: () => navigate('/flashcards') },
  ];

  return (
    <>
      <header className="dashboard-header">
        <div className="header-top-row">
          <div>
            <h1 className="dashboard-title">Olá, {userName} 👋</h1>
            <p className="dashboard-subtitle">Zona: <span className={`zone-badge ${gamification.zone}`}>{gamification.zone}</span></p>
          </div>
          <div className="header-actions">
            <span className="streak-badge">🔥 {gamification.streakDays} dias</span>
            <Button variant="primary" onClick={() => setShowWizard(true)}>+ Nova Prova</Button>
          </div>
        </div>
      </header>

      {(!goals || goals.length === 0) ? (
        <EmptyState icon="🎯" text="Você ainda não definiu nenhuma meta de prova. Planeje seu primeiro objetivo!" cta="Configurar Objetivo" onCta={() => setShowWizard(true)} />
      ) : (
        <>
          <section className="dashboard-section">
            <HeroSession
              subject={latestGoal.subject?.subjectName || 'MATÉRIA GERAL'}
              topic={isSoon ? `Sua prova de ${latestGoal.subject?.subjectName || 'Matéria'} é em ${daysRemaining} dias! 🚨` : latestGoal.title}
              timeRemaining="30m"
              quizzesPending={1}
              targetScore={latestGoal.targetMastery || 80}
              onContinue={() => navigate(isSoon ? '/exam' : '/study')}
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

      {/* Floating Tutor AI Chat */}
      <div className="chat-tutor-container">
        {!chatOpen ? (
          <button onClick={() => setChatOpen(true)} className="chat-trigger-btn">
            <Sparkles size={16} />
            <span>Tutor Virtual</span>
          </button>
        ) : (
          <div className="chat-card-glow chat-tutor-card">
            <div className="chat-header">
              <div className="chat-header-info">
                <Sparkles size={14} className="sparkle-active" />
                <div>
                  <h4>Tutor Virtual IA</h4>
                  <span>Suporte 24/7 de Estudos</span>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="chat-close-btn"><X size={16} /></button>
            </div>

            <div className="chat-messages-container">
              {chatMessages.length === 0 ? (
                <div className="chat-welcome">
                  <Sparkles size={32} className="sparkle-active" />
                  <p>Olá! Eu sou o seu tutor virtual. Pergunte qualquer dúvida sobre seus resumos e arquivos de estudo!</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.sender}`}>
                    <p>{msg.text}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources">Fontes: {msg.sources.join(', ')}</div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && <div className="chat-message tutor loading">Digitando...</div>}
            </div>

            <form onSubmit={handleSendChatMessage} className="chat-input-form">
              <input
                type="text"
                placeholder="Pergunte algo sobre seus estudos..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" disabled={!chatInput.trim() || chatLoading}>Enviar</button>
            </form>
          </div>
        )}
      </div>

      {showWizard && (
        <ExamWizard onClose={() => setShowWizard(false)} onFinished={() => { setShowWizard(false); handleRefetch(); }} />
      )}
    </>
  );
}
