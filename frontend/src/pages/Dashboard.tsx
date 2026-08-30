import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSession } from '../components/dashboard/HeroSession';
import { ActivityGrid } from '../components/dashboard/ActivityGrid';
import { SubjectProgress } from '../components/dashboard/SubjectProgress';
import { Card } from '../components/ui/Card';
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
import { pluralize } from '../utils/format';
import { DailyGoal } from '../components/dashboard/DailyGoal';
import { FadeIn } from '../components/ui/FadeIn';
import type { Subject, StudySession, Goal, ExamPrep } from '../types';
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
  const [socraticMode, setSocraticMode] = useState(false);

  // Multimodal image states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setSelectedImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: subjects, loading: loadSub, error: errSub, refetch: refSub } = useApi<Subject[]>('/api/subjects');
  const { data: sessions, loading: loadSes, error: errSes, refetch: refSes } = useApi<StudySession[]>('/api/study-sessions');
  const { data: goals, loading: loadGoals, error: errGoals, refetch: refGoals } = useApi<Goal[]>('/api/goals');
  const { data: prepsData, loading: loadPreps, error: errPreps, refetch: refPreps } = useApi<{ content: ExamPrep[] }>('/api/v1/exam-preps');

  const gamification = useGamification(sessions || [], goals || []);

  const loading = loadSub || loadSes || loadGoals || loadPreps;
  const error = errSub || errSes || errGoals || errPreps;

  const handleRefetch = () => { refSub(); refSes(); refGoals(); refPreps(); };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedImage) || chatLoading) return;
    const userText = chatInput;
    const currentImg = selectedImage;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText ? userText : `[Imagem: ${currentImg?.name}]` }]);
    setChatInput('');
    setSelectedImage(null);
    setChatLoading(true);

    const preps = prepsData?.content || [];
    const activePrep = preps.length > 0 ? preps[0] : null;
    const activeExamPrepId = activePrep?.id || null;

    if (!activeExamPrepId) {
      setChatMessages(prev => [...prev, { sender: 'tutor', text: 'Olá! Para usar o Tutor Inteligente, crie um plano de estudos ("+ Nova Prova") ou faça upload de PDF associado a uma matéria primeiro.' }]);
      setChatLoading(false);
      setSelectedImageBase64(null);
      setSelectedImageMimeType(null);
      return;
    }

    try {
      const response = await apiClient.post('/api/v1/chat/ask', {
        examPrepId: activeExamPrepId,
        question: userText || "O que está nesta imagem?",
        socratic: socraticMode,
        imageMimeType: selectedImageMimeType,
        imageBase64: selectedImageBase64
      });
      setChatMessages(prev => [...prev, { sender: 'tutor', text: response.data.answer, sources: response.data.sources }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'tutor', text: 'Desculpe, ocorreu um erro ao obter resposta do tutor de estudos.' }]);
    } finally {
      setChatLoading(false);
      setSelectedImageBase64(null);
      setSelectedImageMimeType(null);
    }
  };

  if (loading) return (
    <div className="dashboard-root" style={{ gap: 'var(--space-lg)' }}>
      <div style={{ height: '28px', width: '200px', borderRadius: '8px', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ height: '120px', borderRadius: 'var(--radius-lg)', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {[1,2,3,4].map(i => <div key={i} style={{ height: '60px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      </div>
    </div>
  );
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

  const subjectName = latestGoal?.subject?.subjectName || 'MATÉRIA GERAL';
  const goalTitle = latestGoal?.title || '';
  const targetMastery = latestGoal?.targetMastery || 80;

  const activities = [
    { ...mockActivities[0], title: 'Área de Estudos', description: 'Leitura e resumos de PDFs', onClick: () => navigate('/workspace') },
    { ...mockActivities[1], title: 'Simulados', description: 'Simulado de prova completo', onClick: () => navigate('/simulation') },
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
            <span className="streak-badge">🔥 {pluralize(gamification.streakDays, 'dia')}</span>
            <Button variant="primary" onClick={() => setShowWizard(true)}>+ Nova Prova</Button>
          </div>
        </div>
      </header>

      {(!goals || goals.length === 0) ? (
        <EmptyState 
          icon="🎯" 
          title="Sem Metas Definidas" 
          description="Você ainda não definiu nenhuma meta de prova. Planeje seu primeiro objetivo!" 
          ctaText="Configurar Objetivo" 
          ctaAction={() => setShowWizard(true)} 
        />
      ) : (
        <>
          <section className="dashboard-section">
            <FadeIn>
              <HeroSession
                subject={subjectName}
                topic={isSoon ? `Sua prova de ${subjectName} é em ${pluralize(daysRemaining, 'dia')}! 🚨` : goalTitle}
                timeRemaining="30m"
                quizzesPending={1}
                targetScore={targetMastery}
                onContinue={() => navigate(isSoon ? '/simulation' : '/workspace')}
              />
            </FadeIn>
          </section>

          <section className="dashboard-section">
            <FadeIn delay={100}>
              <h2 className="section-title">Ações Rápidas</h2>
              <ActivityGrid activities={activities} />
            </FadeIn>
          </section>

          <section className="dashboard-section dashboard-grid-two">
            <FadeIn delay={200}>
              <Card style={{ height: '100%' }}>
                <h2 className="section-title" style={{ marginTop: 0 }}>Progresso por Matéria</h2>
                {mappedSubjects.length === 0 ? <p className="empty-sub-text">Crie matérias para ver seu progresso.</p> : <SubjectProgress subjects={mappedSubjects} />}
              </Card>
            </FadeIn>
            <FadeIn delay={300}>
              <Card className="summary-card" style={{ height: '100%' }}>
                <DailyGoal
                  targetMinutes={60}
                  studiedMinutes={gamification.totalStudyTime}
                  tasks={[
                    { id: '1', label: 'Revisar flashcards pendentes', done: true },
                    { id: '2', label: 'Estudar material teórico (30m)', done: gamification.totalStudyTime >= 30 },
                    { id: '3', label: 'Completar uma sessão de simulado', done: false },
                  ]}
                />
              </Card>
            </FadeIn>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer', color: socraticMode ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                  <input type="checkbox" checked={socraticMode} onChange={e => setSocraticMode(e.target.checked)} style={{ width: 'var(--space-sm)', height: 'var(--space-sm)' }} />
                  <span>Socrático</span>
                </label>
                <button onClick={() => setChatOpen(false)} className="chat-close-btn"><X size={16} /></button>
              </div>
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

            <form onSubmit={handleSendChatMessage} className="chat-input-form" style={{ position: 'relative' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: selectedImage ? 'var(--success)' : 'var(--text-muted)', fontSize: '1rem', padding: '0 4px' }} title="Anexar Imagem para Resolução">
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={chatLoading} />
                <span>📷</span>
              </label>
              {selectedImage && (
                <button
                  type="button"
                  onClick={() => { setSelectedImage(null); setSelectedImageBase64(null); setSelectedImageMimeType(null); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                  title="Remover Imagem Anexada"
                >
                  ✕
                </button>
              )}
              <input
                type="text"
                placeholder={selectedImage ? `📷 ${selectedImage.name}` : "Pergunte algo sobre seus estudos..."}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" disabled={(!chatInput.trim() && !selectedImage) || chatLoading}>Enviar</button>
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
