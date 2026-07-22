import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { StudySession, Subject, Goal, ExamPrep } from '../types';
import { Clock, BookOpen, Target, CheckCircle, Flame, Calendar, Plus, Play, Pause, Square, Sparkles, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import WeeklyFocusCard from '../components/WeeklyFocusCard';
import ActiveGoalsCard from '../components/ActiveGoalsCard';
import RecentSessionsCard from '../components/RecentSessionsCard';

export default function Dashboard() {
  const queryClient = useQueryClient();

  // ─── Timer State ───
  const [time, setTime] = useState(1500); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');

  // ─── Queries ───
  const { data: sessions = [] } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/study-sessions');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/subjects');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/goals');
      return Array.isArray(res.data) ? res.data : (res.data.content || []);
    },
  });

  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['examPreps'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/api/v1/exam-preps');
        return Array.isArray(response.data) ? response.data : (response.data.content || []);
      } catch (err) {
        return [];
      }
    },
  });

  // ─── Save Session Mutation ───
  const saveSessionMutation = useMutation({
    mutationFn: async (newSession: { subjectId: number; duration: number; description: string; sessionDate: string }) => {
      return apiClient.post('/api/study-sessions', newSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setTime(1500);
      setIsRunning(false);
      alert('Sessão de foco salva com sucesso! Metas atualizadas.');
    }
  });

  // ─── Timer Functions ───
  const toggleTimer = () => {
    if (isRunning) {
      if (timerInterval) clearInterval(timerInterval);
      setIsRunning(false);
    } else {
      const interval = setInterval(() => {
        setTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
      setIsRunning(true);
    }
  };

  const handleCompleteSession = () => {
    if (!selectedSubject) {
      alert('Por favor, selecione uma matéria para registrar sua sessão.');
      return;
    }
    const durationMin = Math.round((1500 - time) / 60);
    if (durationMin < 1) {
      alert('A sessão precisa ter pelo menos 1 minuto de atividade.');
      return;
    }
    saveSessionMutation.mutate({
      subjectId: Number(selectedSubject),
      duration: durationMin,
      description: 'Sessão Pomodoro focada',
      sessionDate: new Date().toISOString().split('T')[0]
    });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ─── Stats and calculations ───
  const activeExam = examPreps.find(e => e.status === 'ACTIVE') || examPreps[0];
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const completedGoals = goals.filter(g => g.progress >= g.objectiveHours).length;
  const activeGoalsCount = goals.length - completedGoals;

  const streak = (() => {
    if (sessions.length === 0) return 0;
    const datas = new Set(sessions.map(s => s.sessionDate));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    if (!datas.has(fmt(hoje)) && !datas.has(fmt(ontem))) return 0;
    const cursor = datas.has(fmt(hoje)) ? new Date(hoje) : new Date(ontem);
    let st = 0;
    while (datas.has(fmt(cursor))) {
      st++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return st;
  })();

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── TELA 1: HERO SECTION - SESSÃO DE FOCO ATIVA ─── */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, hsla(258, 90%, 66%, 0.15), hsla(162, 72%, 45%, 0.08))',
        border: '1px solid hsla(258, 90%, 66%, 0.25)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 800 }}>Sessão de Foco Ativa</span>
            <div style={{ fontSize: '56px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
              {formatTimer(time)}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginTop: '8px' }}>
              <select 
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '13px', color: 'var(--text-primary)' }}
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione uma Matéria...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName}</option>
                ))}
              </select>

              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Meta diária: 2h • Pomodoro 3/5
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '13px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={toggleTimer} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '110px' }}>
                {isRunning ? <Pause size={16} /> : <Play size={16} />}
                <span>{isRunning ? 'Pausar' : 'Focar'}</span>
              </button>
              
              <button className="btn btn-secondary" onClick={handleCompleteSession} disabled={time === 1500} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Square size={14} />
                <span>Concluir</span>
              </button>
            </div>

            {/* Indicadores de Pomodoro */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
              {[1, 2, 3, 4, 5].map((dot) => (
                <div 
                  key={dot} 
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    backgroundColor: dot <= 3 ? 'var(--success)' : 'var(--border-color)',
                    boxShadow: dot <= 3 ? '0 0 8px var(--success)' : 'none',
                    transition: 'all 0.3s ease'
                  }} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── TELA 1.2: STATS ROW - 5 CARDS HORIZONTAIS COM CONTEXTO ─── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Estudado</h3>
            <p style={{ fontSize: '28px', fontWeight: 900 }}>{totalHours}h</p>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>↑ 12% vs. anterior</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(162, 72%, 45%, 0.15)', color: 'var(--success)' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Matérias Ativas</h3>
            <p style={{ fontSize: '28px', fontWeight: 900 }}>{subjects.length}</p>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Média: 4.5/sem</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Target size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Metas Ativas</h3>
            <p style={{ fontSize: '28px', fontWeight: 900 }}>{activeGoalsCount}</p>
            <span style={{ fontSize: '11px', color: 'var(--warning)', fontWeight: 600 }}>2 próximas do prazo</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(258, 90%, 66%, 0.15)', color: 'var(--primary)' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Metas Batidas</h3>
            <p style={{ fontSize: '28px', fontWeight: 900 }}>{completedGoals}</p>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>100% de aproveitamento</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-icon" style={{ backgroundColor: 'hsla(36, 100%, 43%, 0.15)', color: 'var(--warning)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-info">
            <h3 style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Foco Contínuo</h3>
            <p style={{ fontSize: '28px', fontWeight: 900 }}>{streak}d</p>
            <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Recorde pessoal!</span>
          </div>
        </div>
      </div>

      {/* ─── TELA 1.3: GRÁFICO E AGENDA (2 COLUNAS) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <WeeklyFocusCard sessions={sessions} />
        
        <div className="card" style={{ padding: '21px' }}>
          <div className="flex-between" style={{ marginBottom: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Agenda do Dia & Revisões</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hoje</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700 }}>Revisão de Flashcards</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>8 cartões pendentes de memorização</p>
              </div>
              <Link to="/flashcards" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>Iniciar</Link>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--success)' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700 }}>Mini Quiz do Dia</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avaliação adaptativa baseada nos seus PDFs</p>
              </div>
              <Link to="/quiz" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>Iniciar</Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning)' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700 }}>Simulado Rápido</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulação cronometrada (15 min)</p>
              </div>
              <Link to="/simulation" className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '12px' }}>Iniciar</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TELA 1.4: AÇÕES RÁPIDAS - 4 CARDS COLORIDOS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Link to="/flashcards" className="card" style={{ padding: '21px', borderLeft: '4px solid var(--primary)', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Estudar Flashcards</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Revisão ativa com Leitner System</p>
          <span style={{ display: 'inline-block', marginTop: '13px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>12 pendentes hoje →</span>
        </Link>

        <Link to="/quiz" className="card" style={{ padding: '21px', borderLeft: '4px solid var(--success)', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Responder Quizzes</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Geração de perguntas dinâmicas por IA</p>
          <span style={{ display: 'inline-block', marginTop: '13px', fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>Gere novo quiz →</span>
        </Link>

        <Link to="/simulation" className="card" style={{ padding: '21px', borderLeft: '4px solid var(--warning)', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Fazer Simulados</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Simulação real sem ajuda da IA</p>
          <span style={{ display: 'inline-block', marginTop: '13px', fontSize: '11px', color: 'var(--warning)', fontWeight: 600 }}>Iniciar 15 minutos →</span>
        </Link>

        <Link to="/workspace" className="card" style={{ padding: '21px', borderLeft: '4px solid var(--ai)', transition: 'transform 0.2s', cursor: 'pointer' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Digitalização & OCR</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Envie PDFs e extraia textos automaticamente</p>
          <span style={{ display: 'inline-block', marginTop: '13px', fontSize: '11px', color: 'var(--ai)', fontWeight: 600 }}>Upload de materiais →</span>
        </Link>
      </div>

      {/* ─── SEÇÃO DE METAS DE MAESTRIA ATIVAS E CONQUISTAS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <ActiveGoalsCard goals={goals} />
        <RecentSessionsCard sessions={sessions} />
      </div>

      {/* ─── BANNER DE CONQUISTAS DESBLOQUEADAS (RODAPÉ) ─── */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, hsla(38, 92%, 50%, 0.12), hsla(258, 90%, 66%, 0.08))',
        border: '1px solid hsla(38, 92%, 50%, 0.25)',
        padding: '16px 24px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        animation: 'slideUp 0.4s ease-out'
      }}>
        <div style={{ display: 'flex', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Conquista Desbloqueada: Foco Absoluto!</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Você completou 3 sessões consecutivas de Pomodoro sem interrupções hoje.</p>
        </div>
      </div>

    </div>
  );
}
