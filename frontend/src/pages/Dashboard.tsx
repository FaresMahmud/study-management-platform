import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { StudySession, Subject, Goal } from '../types';
import { Clock, BookOpen, Target, CheckCircle, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';

// Importando os sub-componentes refatorados
import TimerCard from '../components/TimerCard';
import WeeklyFocusCard from '../components/WeeklyFocusCard';
import ActiveGoalsCard from '../components/ActiveGoalsCard';
import RecentSessionsCard from '../components/RecentSessionsCard';
import WhiteboardOcrCard from '../components/WhiteboardOcrCard';

export default function Dashboard() {
  const queryClient = useQueryClient();

  // ─── Queries de dados ────────────────────────────────────────────────
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => (await apiClient.get<StudySession[]>('/api/study-sessions')).data,
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => (await apiClient.get<Goal[]>('/api/goals')).data,
  });

  const isLoading = loadingSessions || loadingSubjects || loadingGoals;

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

  // Handler para atualizar os dados do dashboard quando o timer salva uma sessão
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

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="title-section">
        <div>
          <h1>Meu Painel de Estudos</h1>
          <p className="subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Visão geral do seu foco, metas e evolução</p>
        </div>
      </div>

      {/* ── Grid de Estatísticas Rápidas ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Estudado</h3>
            <p>{totalHours}h</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>Matérias Ativas</h3>
            <p>{subjects.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Target size={24} />
          </div>
          <div className="stat-info">
            <h3>Metas em Andamento</h3>
            <p>{activeGoals}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Metas Concluídas</h3>
            <p>{completedGoals}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
            <Flame size={24} />
          </div>
          <div className="stat-info">
            <h3>Sequência de Estudo</h3>
            <p>{streak === 1 ? '1 dia' : `${streak} dias`}</p>
          </div>
        </div>
      </div>

      {/* ── Seção de Foco e Produtividade (Timer + Meta Semanal + Whiteboard AI) ── */}
      <div className="focus-row-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        <TimerCard subjects={subjects} onSessionSaved={handleSessionSaved} />
        <WhiteboardOcrCard subjects={subjects} />
        <WeeklyFocusCard sessions={sessions} />
      </div>

      {/* ── Estado vazio com Assistente de Onboarding Guiado ── */}
      {sessions.length === 0 ? (
        <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 'var(--space-xs)' }}>Bem-vindo ao StudyFlow! 🎉</h2>
          <p style={{ maxWidth: '600px', margin: '0 auto var(--space-md)', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Preparamos um guia rápido com 3 passos simples baseados em psicologia da aprendizagem para você iniciar sua rotina com foco máximo:
          </p>
          
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap', margin: '0 auto var(--space-lg)', maxWidth: '900px', textAlign: 'left' }}>
            {/* Passo 1 */}
            <div className="card" style={{ flex: '1 1 250px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.85rem', fontWeight: 'bold' }}>1</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Crie Matérias</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                Divida seu escopo de estudo para medir seu tempo individual por disciplina e ter clareza gráfica.
              </p>
              <Link to="/subjects" className="btn btn-primary btn-sm" style={{ width: '100%' }}>Cadastrar Matéria</Link>
            </div>

            {/* Passo 2 */}
            <div className="card" style={{ flex: '1 1 250px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.85rem', fontWeight: 'bold' }}>2</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Inicie um Ciclo</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                Use o timer científico de Sessão Ativa acima para focar no Modo Pomodoro ou Modo Livre.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ width: '100%' }}>Ir para o Timer</button>
            </div>

            {/* Passo 3 */}
            <div className="card" style={{ flex: '1 1 250px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.85rem', fontWeight: 'bold' }}>3</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Sintetize Resumos</h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                Escreva resumos no editor com Modo Zen e gerador de som de isolamento acústico offline.
              </p>
              <Link to="/summaries" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Criar Resumo</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <ActiveGoalsCard goals={goals} />
          <RecentSessionsCard sessions={sessions} />
        </div>
      )}
    </div>
  );
}
