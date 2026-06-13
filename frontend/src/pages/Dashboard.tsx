import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import type { StudySession, Subject, Goal } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Clock,
  BookOpen,
  Target,
  CheckCircle,
  Calendar,
  ChevronRight,
  Flame,
  Play,
  Pause,
  Square,
  Timer,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Chave do localStorage para persistir o timer entre reloads ───
const TIMER_STORAGE_KEY = 'study_platform_timer';

// ─── Constantes de localização para o heatmap ────────────────────────
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─── Tipos ───────────────────────────────────────────────────────────

interface EstadoTimerSalvo {
  subjectId: number;
  startTimestamp: number;
  elapsedAtPause: number;
  isPaused: boolean;
}

interface DadosDia {
  totalMins: number;
  materias: { nome: string; cor: string; mins: number }[];
}

interface TooltipHeatmap {
  dateStr: string;
  dados: DadosDia | null;
  mouseX: number;
  mouseY: number;
}

// Tipo de cada entrada no gráfico empilhado
type EntradaGrafico = {
  name: string;
  color: string;
  totalHours: number;
  sessionDates: string[];
  sessionDurations: number[];
} & Record<string, unknown>;

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

  // ─── Estado do Timer ─────────────────────────────────────────────────
  const [timerSubjectId, setTimerSubjectId] = useState<number | ''>('');
  const [timerRodando, setTimerRodando] = useState(false);
  const [timerPausado, setTimerPausado] = useState(false);
  const [timerSegundos, setTimerSegundos] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Estado do tooltip do heatmap ────────────────────────────────────
  const [heatmapTooltip, setHeatmapTooltip] = useState<TooltipHeatmap | null>(null);

  // ─── Estado do modal de confirmação de sessão (via timer) ─────────────
  const [modalTimerAberto, setModalTimerAberto] = useState(false);
  const [modalSubjectId, setModalSubjectId] = useState<number | ''>('');
  const [modalDuracao, setModalDuracao] = useState(60);
  const [modalData, setModalData] = useState('');
  const [modalObs, setModalObs] = useState('');
  const [modalErro, setModalErro] = useState('');

  // ─── Inicializa o timer a partir do localStorage ao montar ───────────
  useEffect(() => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!salvo) return;
    try {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      setTimerSubjectId(estado.subjectId);
      setTimerRodando(true);
      setTimerPausado(estado.isPaused);
      if (estado.isPaused) {
        setTimerSegundos(estado.elapsedAtPause);
      } else {
        const decorrido =
          Math.floor((Date.now() - estado.startTimestamp) / 1000) + estado.elapsedAtPause;
        setTimerSegundos(Math.max(0, decorrido));
      }
    } catch {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, []);

  // ─── Intervalo do timer (1s) ─────────────────────────────────────────
  useEffect(() => {
    if (timerRodando && !timerPausado) {
      intervalRef.current = setInterval(() => setTimerSegundos(s => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRodando, timerPausado]);

  // ─── Helpers de formatação ────────────────────────────────────────────
  const formatarTimer = (segundos: number): string => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatarDuracao = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const hojeISO = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // ─── Ações do timer ──────────────────────────────────────────────────
  const iniciarTimer = () => {
    const estado: EstadoTimerSalvo = {
      subjectId: timerSubjectId as number,
      startTimestamp: Date.now(),
      elapsedAtPause: 0,
      isPaused: false,
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(estado));
    setTimerSegundos(0);
    setTimerRodando(true);
    setTimerPausado(false);
  };

  const pausarTimer = () => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (salvo) {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      const acumulado =
        Math.floor((Date.now() - estado.startTimestamp) / 1000) + estado.elapsedAtPause;
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ ...estado, elapsedAtPause: acumulado, isPaused: true })
      );
    }
    setTimerPausado(true);
  };

  const retomarTimer = () => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (salvo) {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ ...estado, startTimestamp: Date.now(), isPaused: false })
      );
    }
    setTimerPausado(false);
  };

  const limparTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerRodando(false);
    setTimerPausado(false);
    setTimerSegundos(0);
    setTimerSubjectId('');
  };

  const abrirFinalizacao = () => {
    if (!timerPausado) pausarTimer();
    setModalSubjectId(timerSubjectId);
    setModalDuracao(Math.max(1, Math.round(timerSegundos / 60)));
    setModalData(hojeISO());
    setModalObs('');
    setModalErro('');
    setModalTimerAberto(true);
  };

  // ─── Mutation: salvar sessão criada via timer ────────────────────────
  const criarSessaoTimerMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/study-sessions', {
        duration: modalDuracao,
        sessionDate: modalData,
        observations: modalObs,
        subjectId: Number(modalSubjectId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setModalTimerAberto(false);
      limparTimer();
    },
    onError: (err) => {
      let msg = 'Erro ao registrar sessão.';
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        msg = String((err.response.data as { message: string }).message);
      }
      setModalErro(msg);
    },
  });

  const confirmarSessaoTimer = (e: React.FormEvent) => {
    e.preventDefault();
    setModalErro('');
    if (!modalSubjectId) { setModalErro('Selecione uma matéria.'); return; }
    if (modalDuracao <= 0) { setModalErro('A duração deve ser maior que 0.'); return; }
    criarSessaoTimerMutation.mutate();
  };

  // ─── Cálculo do streak ───────────────────────────────────────────────
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

  // ─── Estatísticas gerais ─────────────────────────────────────────────
  const streak = calcularStreak(sessions);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const completedGoals = goals.filter(g => g.progress >= g.objectiveHours).length;
  const activeGoals = goals.length - completedGoals;

  // ─── Dados do gráfico empilhado ───────────────────────────────────────
  // Cada matéria vira uma coluna; cada sessão vira um segmento (mais antiga = base).
  const dadosBase: EntradaGrafico[] = subjects
    .map(subj => {
      const sessoesOrdenadas = sessions
        .filter(s => s.subject?.id === subj.id)
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      if (sessoesOrdenadas.length === 0) return null;
      return {
        name: subj.subjectName,
        color: subj.color || '#6366f1',
        totalHours: Number(
          (sessoesOrdenadas.reduce((acc, s) => acc + s.duration, 0) / 60).toFixed(2)
        ),
        sessionDates: sessoesOrdenadas.map(s => s.sessionDate),
        sessionDurations: sessoesOrdenadas.map(s => s.duration),
      } as EntradaGrafico;
    })
    .filter((e): e is EntradaGrafico => e !== null);

  const maxSessoes = dadosBase.reduce((max, e) => Math.max(max, e.sessionDates.length), 0);

  // Adiciona campos dinâmicos session_0, session_1, ... (em horas)
  const dadosGrafico: EntradaGrafico[] = dadosBase.map(entry => {
    const campos: Record<string, number> = {};
    for (let i = 0; i < maxSessoes; i++) {
      campos[`session_${i}`] = i < entry.sessionDurations.length
        ? Number((entry.sessionDurations[i] / 60).toFixed(3))
        : 0;
    }
    return { ...entry, ...campos };
  });

  // ─── Estado de hover no gráfico empilhado ────────────────────────────
  // Dual ref+state: ref para leitura imediata no tooltip (sem stale closure),
  // state para forçar re-render das Cells ao mudar hover.
  const celulaHoverRef = useRef<{ barIdx: number; subjIdx: number } | null>(null);
  const [, setCelulaHoverState] = useState<{ barIdx: number; subjIdx: number } | null>(null);
  const setCelulaHover = (val: { barIdx: number; subjIdx: number } | null) => {
    celulaHoverRef.current = val;
    setCelulaHoverState(val);
  };

  // ─── Tooltip do gráfico empilhado ─────────────────────────────────────
  interface PropsTooltipGrafico {
    active?: boolean;
    payload?: Array<{ payload: EntradaGrafico }>;
    label?: string;
  }

  const TooltipGrafico = ({ active, payload, label }: PropsTooltipGrafico) => {
    if (!active || !payload?.length || !label) return null;
    const entrada = dadosGrafico.find(e => e.name === label);
    if (!entrada) return null;
    const hover = celulaHoverRef.current;

    return (
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8rem',
          minWidth: '210px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entrada.color as string, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
        </div>

        {entrada.sessionDates.map((date, i) => {
          const estaDestacado = hover !== null && hover.barIdx === i;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '4px',
                padding: estaDestacado ? '3px 6px' : '1px 0',
                borderRadius: estaDestacado ? '4px' : '0',
                backgroundColor: estaDestacado ? `${entrada.color as string}33` : 'transparent',
                transition: 'background-color 0.15s',
              }}
            >
              <span style={{ color: estaDestacado ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: estaDestacado ? 600 : 400 }}>
                {formatDate(date)}
              </span>
              <span style={{ fontWeight: estaDestacado ? 700 : 500, color: estaDestacado ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {formatarDuracao(entrada.sessionDurations[i])}
              </span>
            </div>
          );
        })}

        <div
          style={{
            borderTop: '1px solid var(--border-color)',
            marginTop: '8px',
            paddingTop: '7px',
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          <span>Total</span>
          <span>{formatarDuracao(Math.round(entrada.totalHours * 60))}</span>
        </div>
      </div>
    );
  };

  // ─── Dados do heatmap ─────────────────────────────────────────────────
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0-indexed
  const hojeStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  // Agrega minutos e matérias por dia (chave "YYYY-MM-DD")
  const mapaDias = new Map<string, DadosDia>();
  sessions.forEach(s => {
    if (!s.sessionDate) return;
    const [ano, mes] = s.sessionDate.split('-').map(Number);
    if (ano !== anoAtual || mes - 1 !== mesAtual) return;
    const atual = mapaDias.get(s.sessionDate) ?? { totalMins: 0, materias: [] };
    atual.totalMins += s.duration;
    const nome = s.subject?.subjectName ?? '—';
    const cor = s.subject?.color ?? 'var(--primary)';
    const matIdx = atual.materias.findIndex(m => m.nome === nome);
    if (matIdx >= 0) atual.materias[matIdx].mins += s.duration;
    else atual.materias.push({ nome, cor, mins: s.duration });
    mapaDias.set(s.sessionDate, atual);
  });

  const maxMinsNoMes = Math.max(...Array.from(mapaDias.values()).map(d => d.totalMins), 1);
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay(); // 0=Dom

  const corCelulaDia = (mins: number): string => {
    const ratio = mins / maxMinsNoMes;
    if (ratio <= 0) return 'transparent';
    if (ratio < 0.25) return 'rgba(99,102,241,0.25)';
    if (ratio < 0.5)  return 'rgba(99,102,241,0.48)';
    if (ratio < 0.75) return 'rgba(99,102,241,0.72)';
    return 'rgba(99,102,241,0.95)';
  };

  // Células de padding antes do dia 1
  const celulasHeatmap: ({ tipo: 'padding' } | { tipo: 'dia'; dia: number; dateStr: string })[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => ({ tipo: 'padding' as const })),
    ...Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const dateStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { tipo: 'dia' as const, dia, dateStr };
    }),
  ];
  // Completa até múltiplo de 7
  const resto = celulasHeatmap.length % 7;
  if (resto !== 0) {
    for (let i = 0; i < 7 - resto; i++) celulasHeatmap.push({ tipo: 'padding' });
  }

  // ─── Dados para sessões recentes e metas ─────────────────────────────
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
    .slice(0, 5);

  const activeGoalsList = goals.filter(g => g.progress < g.objectiveHours).slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px' }}>
        Carregando dados do painel...
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <div className="title-section">
        <div>
          <h1>Meu Painel de Estudos</h1>
          <p className="subtitle">Visão geral do seu foco, metas e evolução</p>
        </div>
      </div>

      {/* ── Grid de Estatísticas Rápidas ── */}
      <div className="stats-grid">
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

      {/* ── Card: Timer de Sessão Ativa ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Timer size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <h2 className="card-title" style={{ margin: 0 }}>Sessão Ativa</h2>
          {timerRodando && (
            <span className={`badge ${timerPausado ? 'badge-warning' : 'badge-success'}`}>
              {timerPausado ? 'Pausado' : 'Rodando'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            className="form-input"
            style={{ flex: '1 1 180px', maxWidth: '260px' }}
            value={timerSubjectId}
            onChange={e => setTimerSubjectId(e.target.value ? Number(e.target.value) : '')}
            disabled={timerRodando}
          >
            <option value="">Selecione a matéria...</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
            ))}
          </select>

          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '1.65rem',
              fontWeight: 700,
              letterSpacing: '3px',
              color: timerRodando && !timerPausado ? 'var(--primary)' : 'var(--text-secondary)',
              minWidth: '118px',
              textAlign: 'center',
            }}
          >
            {formatarTimer(timerSegundos)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!timerRodando ? (
              <button
                className="btn btn-primary"
                onClick={iniciarTimer}
                disabled={!timerSubjectId || subjects.length === 0}
              >
                <Play size={15} />
                Iniciar Sessão
              </button>
            ) : (
              <>
                {timerPausado ? (
                  <button className="btn btn-secondary" onClick={retomarTimer}>
                    <Play size={15} />
                    Retomar
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={pausarTimer}>
                    <Pause size={15} />
                    Pausar
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={abrirFinalizacao}
                  disabled={timerSegundos < 60}
                  title={timerSegundos < 60 ? 'Estude ao menos 1 minuto antes de finalizar' : ''}
                >
                  <Square size={15} />
                  Finalizar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { if (confirm('Cancelar o timer? O tempo não será salvo.')) limparTimer(); }}
                  title="Cancelar timer (sem salvar)"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {subjects.length === 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Crie ao menos uma matéria para iniciar um timer.{' '}
            <Link to="/subjects" style={{ color: 'var(--primary)' }}>Criar matéria</Link>
          </p>
        )}
      </div>

      {/* ── Estado vazio ── */}
      {sessions.length === 0 ? (
        <div className="card empty-state">
          <Calendar size={56} style={{ marginBottom: '1.25rem', color: 'var(--text-muted)' }} />
          <h2>Bem-vindo ao seu painel!</h2>
          <p style={{ maxWidth: '560px', margin: '0.5rem auto 1.75rem', color: 'var(--text-secondary)' }}>
            Para ver estatísticas detalhadas e gráficos de evolução, comece cadastrando suas matérias
            e registrando suas primeiras sessões de estudo.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/subjects" className="btn btn-primary">Cadastrar Matéria</Link>
            <Link to="/sessions" className="btn btn-secondary">Registrar Sessões</Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">

          {/* Coluna Esquerda: Gráfico + Sessões Recentes */}
          <div className="dashboard-coluna-esquerda">

            <div className="card">
              <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
                Tempo Estudado por Matéria
              </h2>

              {dadosGrafico.length === 0 ? (
                <div className="flex-center" style={{ height: '240px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Registre sessões com duração para ver o gráfico.
                </div>
              ) : (
                <div style={{ width: '100%', height: '270px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)' }} unit="h" />
                      <Tooltip
                        content={(props) => (
                          <TooltipGrafico
                            active={props.active}
                            payload={props.payload as unknown as PropsTooltipGrafico['payload']}
                            label={props.label as string}
                          />
                        )}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />

                      {Array.from({ length: maxSessoes }, (_, barIdx) => (
                        <Bar
                          key={`bar-${barIdx}`}
                          dataKey={`session_${barIdx}`}
                          stackId="a"
                          radius={barIdx === maxSessoes - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          isAnimationActive={barIdx === 0}
                          onMouseEnter={(_: unknown, subjIdx: number) => setCelulaHover({ barIdx, subjIdx })}
                          onMouseLeave={() => setCelulaHover(null)}
                        >
                          {dadosGrafico.map((entrada, subjIdx) => {
                            const hover = celulaHoverRef.current;
                            const estaHover = hover !== null && hover.barIdx === barIdx && hover.subjIdx === subjIdx;
                            return (
                              <Cell
                                key={`cell-${subjIdx}-${barIdx}`}
                                fill={entrada.color as string}
                                fillOpacity={barIdx % 2 === 0 ? 1 : 0.68}
                                stroke={estaHover ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.15)'}
                                strokeWidth={estaHover ? 2 : (barIdx === 0 ? 0 : 0.8)}
                              />
                            );
                          })}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Sessões Recentes */}
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>Sessões Recentes</h2>
                <Link to="/sessions" className="navbar-link" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Ver todas <ChevronRight size={14} />
                </Link>
              </div>

              {recentSessions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Nenhuma sessão registrada.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {recentSessions.map(session => (
                    <div key={session.id} className="sessao-recente-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span className="color-dot" style={{ backgroundColor: session.subject?.color, margin: 0, flexShrink: 0 }} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{session.subject?.subjectName ?? '—'}</p>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>{formatDate(session.sessionDate)}</p>
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
          </div>

          {/* Coluna Direita: Heatmap + Metas Ativas */}
          <div className="dashboard-coluna-direita">

            {/* ── Heatmap de Calendário Mensal ── */}
            <div className="card heatmap-card">
              <h2 className="card-title" style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                {MESES_PT[mesAtual]} {anoAtual}
              </h2>

              {/* Cabeçalho dos dias da semana */}
              <div className="heatmap-grid">
                {DIAS_SEMANA_ABREV.map(d => (
                  <div key={d} className="heatmap-dia-semana">{d}</div>
                ))}
              </div>

              {/* Grade de dias */}
              <div className="heatmap-grid" style={{ marginTop: '2px' }}>
                {celulasHeatmap.map((celula, idx) => {
                  if (celula.tipo === 'padding') {
                    return <div key={`pad-${idx}`} className="heatmap-celula heatmap-celula--padding" />;
                  }
                  const dados = mapaDias.get(celula.dateStr) ?? null;
                  const temDados = dados !== null && dados.totalMins > 0;
                  const eHoje = celula.dateStr === hojeStr;
                  return (
                    <div
                      key={celula.dateStr}
                      className={[
                        'heatmap-celula',
                        temDados ? 'heatmap-celula--com-dados' : '',
                        eHoje ? 'heatmap-celula--hoje' : '',
                      ].join(' ')}
                      style={{ backgroundColor: temDados ? corCelulaDia(dados!.totalMins) : undefined }}
                      onMouseEnter={e => setHeatmapTooltip({ dateStr: celula.dateStr, dados, mouseX: e.clientX, mouseY: e.clientY })}
                      onMouseMove={e => setHeatmapTooltip(t => t ? { ...t, mouseX: e.clientX, mouseY: e.clientY } : null)}
                      onMouseLeave={() => setHeatmapTooltip(null)}
                    >
                      {celula.dia}
                    </div>
                  );
                })}
              </div>

              {/* Legenda de intensidade */}
              <div className="heatmap-legenda">
                <span>Menos</span>
                {['rgba(99,102,241,0.15)','rgba(99,102,241,0.35)','rgba(99,102,241,0.60)','rgba(99,102,241,0.85)'].map((cor, i) => (
                  <div key={i} className="heatmap-legenda-celula" style={{ backgroundColor: cor }} />
                ))}
                <span>Mais</span>
              </div>
            </div>

            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>Metas Ativas</h2>
                <Link to="/goals" className="navbar-link" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Ver todas <ChevronRight size={14} />
                </Link>
              </div>

              {activeGoalsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-secondary)' }}>
                  <Target size={28} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.875rem' }}>Nenhuma meta em andamento.</p>
                  <Link to="/goals" className="btn btn-secondary btn-sm" style={{ marginTop: '0.875rem' }}>
                    Criar Meta
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {activeGoalsList.map(goal => {
                    const pct = Math.min(Math.round((goal.progress / goal.objectiveHours) * 100), 100);
                    return (
                      <div key={goal.id}>
                        <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{goal.title}</span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{pct}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: goal.subject?.color || 'var(--primary)' }} />
                        </div>
                        <div className="flex-between" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                          <span>{goal.progress}h / {goal.objectiveHours}h</span>
                          {goal.subject && <span style={{ color: goal.subject.color }}>{goal.subject.subjectName}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tooltip do Heatmap (position:fixed — fora do card para não ser clipado) ── */}
      {heatmapTooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: heatmapTooltip.mouseX, top: heatmapTooltip.mouseY }}
        >
          <div className="heatmap-tooltip-data">
            {(() => {
              const [ano, mes, dia] = heatmapTooltip.dateStr.split('-');
              return `${dia}/${mes}/${ano}`;
            })()}
          </div>
          {heatmapTooltip.dados && heatmapTooltip.dados.totalMins > 0 ? (
            <>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Total: <strong style={{ color: 'var(--text-primary)' }}>{formatarDuracao(heatmapTooltip.dados.totalMins)}</strong>
              </div>
              {heatmapTooltip.dados.materias.map(m => (
                <div key={m.nome} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: m.cor, flexShrink: 0 }} />
                    {m.nome}
                  </span>
                  <span>{formatarDuracao(m.mins)}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nenhuma sessão registrada</div>
          )}
        </div>
      )}

      {/* ── Modal: confirmar sessão via timer ── */}
      {modalTimerAberto && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-timer-title">
            <button className="modal-close" onClick={() => setModalTimerAberto(false)} aria-label="Fechar">
              <X size={18} />
            </button>
            <h2 className="modal-title" id="modal-timer-title">Salvar Sessão de Estudo</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Revise os dados antes de confirmar. Você pode ajustar a duração e adicionar observações.
            </p>

            {modalErro && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {modalErro}
              </div>
            )}

            <form onSubmit={confirmarSessaoTimer}>
              <div className="form-group">
                <label className="form-label" htmlFor="timer-subject">Matéria</label>
                <select id="timer-subject" className="form-input" value={modalSubjectId} onChange={e => setModalSubjectId(e.target.value ? Number(e.target.value) : '')} required>
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-duracao">Duração (Minutos)</label>
                <input id="timer-duracao" type="number" className="form-input" min="1" max="1440" value={modalDuracao} onChange={e => setModalDuracao(Number(e.target.value))} required />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Cronometrado: {formatarTimer(timerSegundos)} → {Math.round(timerSegundos / 60)} min
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-data">Data da Sessão</label>
                <input id="timer-data" type="date" className="form-input" value={modalData} onChange={e => setModalData(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-obs">Conteúdo / Anotações</label>
                <textarea id="timer-obs" className="form-input form-textarea" placeholder="Ex: Capítulos 3 e 4, exercícios de fixação..." value={modalObs} onChange={e => setModalObs(e.target.value)} maxLength={1000} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalTimerAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={criarSessaoTimerMutation.isPending}>
                  {criarSessaoTimerMutation.isPending ? 'Salvando...' : 'Salvar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
