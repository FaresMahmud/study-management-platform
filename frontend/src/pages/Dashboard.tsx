import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { StudySession, Subject, Goal, ExamPrep } from '../types';
import { Clock, BookOpen, Target, CheckCircle, Flame, Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Importando os sub-componentes refatorados
import TimerCard from '../components/TimerCard';
import WeeklyFocusCard from '../components/WeeklyFocusCard';
import ActiveGoalsCard from '../components/ActiveGoalsCard';
import RecentSessionsCard from '../components/RecentSessionsCard';
import WhiteboardOcrCard from '../components/WhiteboardOcrCard';

export default function Dashboard() {
  const queryClient = useQueryClient();

  // ─── Queries de dados com fallback resiliente ─────────────────────────
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/study-sessions');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/subjects');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/goals');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: examPreps = [], isLoading: loadingExams } = useQuery<ExamPrep[]>({
    queryKey: ['examPreps'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/api/v1/exam-preps');
        return Array.isArray(response.data) ? response.data : (response.data.content || []);
      } catch (err) {
        console.error("Failed to load exam preps:", err);
        return [];
      }
    },
  });

  const isLoading = loadingSessions || loadingSubjects || loadingGoals || loadingExams;

  // ─── Lógica de cálculo de estatísticas e streak ─────────────────────────
  const calcularStreak = (sessoes: StudySession[]): number => {
    if (sessoes.length === 0) return 0;
    const datas = new Set(sessoes.map(s => s.sessionDate));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    if (!datas.has(fmt(hoje)) && !datas.has(fmt(ontem))) return 0;
    const cursor = datas.has(fmt(hoje)) ? new Date(hoje) : new Date(ontem);
    let streak = 0;
    while (datas.has(fmt(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  };

  const streak = calcularStreak(sessions);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const completedGoals = goals.filter(g => g.progress >= g.objectiveHours).length;
  const activeGoals = goals.length - completedGoals;

  const handleSessionSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  };

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', color: 'var(--text-secondary)' }}>
        Carregando dados do painel...
      </div>
    );
  }

  const activeExam = examPreps.find(e => e.status === 'ACTIVE') || examPreps[0];

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 'var(--space-lg)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Painel de Estudos</h1>
          <p className="subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Seu centro de foco e controle de preparação</p>
        </div>
      </div>

      {/* ── Widget de Contagem Regressiva do Exame (Exam Prep) ── */}
      {activeExam ? (
        <div style={{ 
          background: 'linear-gradient(135deg, hsla(217, 91%, 60%, 0.15), hsla(142, 72%, 45%, 0.08))',
          border: '1px solid hsla(217, 91%, 60%, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 800 }}>Cronograma Ativo</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary)' }}>{activeExam.title}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Objetivo: <strong style={{ color: 'var(--text-primary)' }}>{activeExam.targetScore}% de Maestria</strong> • Exame em {new Date(activeExam.examDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--warning)', display: 'block', lineHeight: 1 }}>
              {activeExam.daysRemaining >= 0 ? activeExam.daysRemaining : 0}
            </span>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
              Dias Restantes
            </span>
          </div>
        </div>
      ) : (
        <div style={{ 
          background: 'var(--bg-secondary)',
          border: '1px dashed var(--border-color)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Nenhuma preparação de prova configurada</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
            Defina seu objetivo de maestria para ativar a contagem regressiva e os cards inteligentes.
          </p>
          <Link to="/goals" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} />
            Criar Nova Meta de Maestria
          </Link>
        </div>
      )}

      {/* ── Grid de Estatísticas Rápidas (Fibonacci Spacing) ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-xs)', marginBottom: 0 }}>
        <div className="stat-card" style={{ padding: 'var(--space-sm)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '13px' }}>Total Estudado</h3>
            <p style={{ fontSize: '21px' }}>{totalHours}h</p>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 'var(--space-sm)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(142, 72%, 45%, 0.15)', color: 'var(--success)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '13px' }}>Matérias</h3>
            <p style={{ fontSize: '21px' }}>{subjects.length}</p>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 'var(--space-sm)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Target size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '13px' }}>Metas Ativas</h3>
            <p style={{ fontSize: '21px' }}>{activeGoals}</p>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 'var(--space-sm)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(217, 91%, 60%, 0.15)', color: 'var(--primary)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '13px' }}>Metas Batidas</h3>
            <p style={{ fontSize: '21px' }}>{completedGoals}</p>
          </div>
        </div>

        <div className="stat-card" style={{ padding: 'var(--space-sm)' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(38, 92%, 50%, 0.15)', color: 'var(--warning)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '13px' }}>Sequência</h3>
            <p style={{ fontSize: '21px' }}>{streak === 1 ? '1 dia' : `${streak} dias`}</p>
          </div>
        </div>
      </div>

      {/* ── Painel de Foco e Produtividade (Timer, OCR e Histórico) ── */}
      <div className="focus-row-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-xs)' }}>
        <TimerCard subjects={subjects} onSessionSaved={handleSessionSaved} />
        <WhiteboardOcrCard subjects={subjects} />
        <WeeklyFocusCard sessions={sessions} />
      </div>

      {/* ── Seção de Ações Rápidas (Cognitive Load Reduction) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xs)' }}>
        <div className="card" style={{ padding: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Estudar Flashcards</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '13px' }}>Pratique revisões ativas com o sistema Leitner e acelere a retenção de conceitos.</p>
          <Link to="/flashcards" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Ir para Flashcards</Link>
        </div>

        <div className="card" style={{ padding: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Responder Quizzes</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '13px' }}>Teste seus conhecimentos por matéria com geração instantânea baseada nos seus PDFs.</p>
          <Link to="/quiz" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Iniciar Quiz</Link>
        </div>

        <div className="card" style={{ padding: 'var(--space-sm)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Simulados de Exame</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '13px' }}>Faça exames simulados cronometrados de 15 minutos e teste sua velocidade.</p>
          <Link to="/simulation" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Iniciar Simulado</Link>
        </div>
      </div>

      {/* ── Metas Ativas e Histórico de Sessões ── */}
      {sessions.length === 0 ? (
        <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-xs)' }}>Pronto para decolar nos estudos? 🚀</h2>
          <p style={{ maxWidth: '600px', margin: '0 auto var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Siga o Onboarding e comece a registrar suas sessões de foco agora mesmo.
          </p>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xs)' }}>
          <ActiveGoalsCard goals={goals} />
          <RecentSessionsCard sessions={sessions} />
        </div>
      )}
    </div>
  );
}
