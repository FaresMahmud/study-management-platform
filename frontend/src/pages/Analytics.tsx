import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { calcularStreak } from '../utils/streak';
import type { StudySession, Subject, Flashcard } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Clock,
  BookOpen,
  Award,
  Flame,
  Brain,
  Compass,
  CheckCircle,
  AlertCircle,
  Activity,
  Info
} from 'lucide-react';

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA_ABREV = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

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

type EntradaGrafico = {
  name: string;
  color: string;
  totalHours: number;
  sessionDates: string[];
  sessionDurations: number[];
} & Record<string, unknown>;

// Tooltip customizado do gráfico empilhado
interface PropsTooltipGrafico {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color: string;
    payload: {
      color: string;
      sessionDates: string[];
      sessionDurations: number[];
    };
  }[];
  label?: string;
}

function TooltipGrafico({ active, payload, label }: PropsTooltipGrafico) {
  if (!active || !payload || payload.length === 0) return null;
  
  const mInfo = payload[0];
  const totalSubjHours = mInfo.value;
  const rawPayload = mInfo.payload;
  const listSessoes = rawPayload.sessionDates || [];
  
  const formatarDuracao = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const formatarDataLocal = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="heatmap-tooltip" style={{ position: 'static', transform: 'none', minWidth: '220px' }}>
      <div className="heatmap-tooltip-data" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
        Total Acumulado: <strong style={{ color: 'var(--primary)' }}>{totalSubjHours.toFixed(1)}h</strong>
      </div>
      {listSessoes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
          {listSessoes.map((data, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>{formatarDataLocal(data)}</span>
              <strong>{formatarDuracao(rawPayload.sessionDurations[idx])}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState<'temporal' | 'learning_zone'>('temporal');
  const [useMock, setUseMock] = useState(false);

  const [celulaHover, setCelulaHover] = useState<{ barIdx: number; subjIdx: number } | null>(null);
  const celulaHoverRef = useRef(celulaHover);
  celulaHoverRef.current = celulaHover;

  const [heatmapTooltip, setHeatmapTooltip] = useState<TooltipHeatmap | null>(null);

  // Queries
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => (await apiClient.get<StudySession[]>('/api/study-sessions')).data,
  });

  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
  });

  const { data: flashcards = [], isLoading: loadingFlashcards } = useQuery<Flashcard[]>({
    queryKey: ['flashcards-all'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/api/v1/flashcards?size=1000');
        return response.data.content || [];
      } catch (err) {
        console.error('Erro ao buscar flashcards:', err);
        return [];
      }
    }
  });

  const isLoading = loadingSessions || loadingSubjects || loadingFlashcards;

  // Auto-detect se precisa forçar mock
  const temDadosReais = flashcards && flashcards.length > 0;
  const exibirMock = useMock || !temDadosReais;

  // Se carregar e não tiver dados, inicia mostrando o mock para não ficar em branco
  useEffect(() => {
    if (!isLoading && !temDadosReais) {
      setUseMock(true);
    }
  }, [isLoading, temDadosReais]);

  const formatarDuracao = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  // ─── Dados do gráfico empilhado (Temporal) ──────────────────────────────────
  const dadosBase: EntradaGrafico[] = subjects
    .map(subj => {
      const sessoesOrdenadas = sessions
        .filter(s => s.subject?.id === subj.id)
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      if (sessoesOrdenadas.length === 0) return null;
      return {
        name: subj.subjectName,
        color: subj.color || '#6366f1',
        totalHours: Number((sessoesOrdenadas.reduce((acc, s) => acc + s.duration, 0) / 60).toFixed(2)),
        sessionDates: sessoesOrdenadas.map(s => s.sessionDate),
        sessionDurations: sessoesOrdenadas.map(s => s.duration),
      };
    })
    .filter(Boolean) as EntradaGrafico[];

  const maxSessoes = Math.max(...dadosBase.map(d => d.sessionDates.length), 0);
  const dadosGrafico = dadosBase.map(subjData => {
    const entry: Record<string, unknown> = {
      name: subjData.name,
      color: subjData.color,
      sessionDates: subjData.sessionDates,
      sessionDurations: subjData.sessionDurations,
      totalHours: subjData.totalHours,
    };
    subjData.sessionDurations.forEach((dur, idx) => {
      entry[`session_${idx}`] = Number((dur / 60).toFixed(2));
    });
    return entry;
  });

  // ─── Dados do heatmap (Temporal) ──────────────────────────────────────────
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  const hojeStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

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
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay();

  const corCelulaDia = (mins: number): string => {
    const ratio = mins / maxMinsNoMes;
    if (ratio <= 0) return 'transparent';
    if (ratio < 0.25) return 'rgba(99,102,241,0.25)';
    if (ratio < 0.5)  return 'rgba(99,102,241,0.48)';
    if (ratio < 0.75) return 'rgba(99,102,241,0.72)';
    return 'rgba(99,102,241,0.95)';
  };

  const celulasHeatmap: ({ tipo: 'padding' } | { tipo: 'dia'; dia: number; dateStr: string })[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => ({ tipo: 'padding' as const })),
    ...Array.from({ length: diasNoMes }, (_, i) => {
      const dia = i + 1;
      const dateStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return { tipo: 'dia' as const, dia, dateStr };
    }),
  ];
  const resto = celulasHeatmap.length % 7;
  if (resto !== 0) {
    for (let i = 0; i < 7 - resto; i++) celulasHeatmap.push({ tipo: 'padding' });
  }

  // Estatísticas Gerais (Temporal)
  const totalMinsGlobal = sessions.reduce((acc, s) => acc + s.duration, 0);
  const mediaSessao = sessions.length > 0 ? Math.round(totalMinsGlobal / sessions.length) : 0;
  const streakAtivo = calcularStreak(sessions);

  const materiaMaisEstudada = () => {
    if (sessions.length === 0 || subjects.length === 0) return 'Nenhuma';
    const sumMap: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.subject) {
        sumMap[s.subject.subjectName] = (sumMap[s.subject.subjectName] || 0) + s.duration;
      }
    });
    let maxName = 'Nenhuma';
    let maxVal = 0;
    Object.entries(sumMap).forEach(([name, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxName = name;
      }
    });
    return maxName;
  };

  // ─── Dados da Zona de Aprendizado ─────────────────────────────────────────
  const DADOS_MOCK_RADAR = [
    { subjectName: 'Cálculo I', Proficiência: 88 },
    { subjectName: 'Física Geral', Proficiência: 52 },
    { subjectName: 'Química Orgânica', Proficiência: 94 },
    { subjectName: 'Estruturas de Dados', Proficiência: 75 },
    { subjectName: 'Álgebra Linear', Proficiência: 42 },
  ];

  const DADOS_MOCK_AREA = [
    { name: 'Cálculo I', 'Panic Zone': 2, 'Learning Zone': 4, 'Comfort Zone': 14 },
    { name: 'Física Geral', 'Panic Zone': 12, 'Learning Zone': 6, 'Comfort Zone': 2 },
    { name: 'Química Orgânica', 'Panic Zone': 1, 'Learning Zone': 3, 'Comfort Zone': 16 },
    { name: 'Estruturas de Dados', 'Panic Zone': 4, 'Learning Zone': 11, 'Comfort Zone': 5 },
    { name: 'Álgebra Linear', 'Panic Zone': 15, 'Learning Zone': 3, 'Comfort Zone': 1 },
  ];

  // Cálculo a partir dos dados reais do banco
  const flashcardsPorMateria = new Map<number, Flashcard[]>();
  flashcards.forEach(fc => {
    if (!fc.subject?.id) return;
    const list = flashcardsPorMateria.get(fc.subject.id) || [];
    list.push(fc);
    flashcardsPorMateria.set(fc.subject.id, list);
  });

  const realRadarData = subjects
    .map(subj => {
      const cards = flashcardsPorMateria.get(subj.id) || [];
      if (cards.length === 0) return null;
      const averageBox = cards.reduce((sum, c) => sum + (c.box || 1), 0) / cards.length;
      // Leitner Box 1..5 map to 20..100% domain
      const proficiencia = Math.round((averageBox / 5) * 100);
      return {
        subjectName: subj.subjectName,
        Proficiência: proficiencia
      };
    })
    .filter(Boolean) as { subjectName: string; Proficiência: number }[];

  const realAreaData = subjects
    .map(subj => {
      const cards = flashcardsPorMateria.get(subj.id) || [];
      if (cards.length === 0) return null;
      const panic = cards.filter(c => (c.box || 1) <= 2).length;
      const learning = cards.filter(c => (c.box || 1) === 3 || (c.box || 1) === 4).length;
      const comfort = cards.filter(c => (c.box || 1) === 5).length;
      return {
        name: subj.subjectName,
        'Panic Zone': panic,
        'Learning Zone': learning,
        'Comfort Zone': comfort
      };
    })
    .filter(Boolean) as { name: string; 'Panic Zone': number; 'Learning Zone': number; 'Comfort Zone': number }[];

  // Estatísticas Globais das Zonas
  const realPanicCount = flashcards.filter(c => (c.box || 1) <= 2).length;
  const realLearningCount = flashcards.filter(c => (c.box || 1) === 3 || (c.box || 1) === 4).length;
  const realComfortCount = flashcards.filter(c => (c.box || 1) === 5).length;

  const radarData = exibirMock ? DADOS_MOCK_RADAR : realRadarData;
  const areaData = exibirMock ? DADOS_MOCK_AREA : realAreaData;
  const totalPanic = exibirMock ? 34 : realPanicCount;
  const totalLearning = exibirMock ? 27 : realLearningCount;
  const totalComfort = exibirMock ? 38 : realComfortCount;

  // Recomendações Analíticas Cognitivas
  const recomendacoes: string[] = [];
  if (exibirMock) {
    recomendacoes.push('⚠️ **Álgebra Linear** está na **Panic Zone** (domínio de 42%). Priorize revisar flashcards desta matéria hoje mesmo!');
    recomendacoes.push('💡 **Física Geral** acumula 12 cartões na **Panic Zone** (domínio de 52%). Realize sessões de revisão no Workspace.');
    recomendacoes.push('🚀 **Estruturas de Dados** está na **Learning Zone** (domínio de 75%). Continue revisando para consolidá-la na Comfort Zone.');
    recomendacoes.push('🏆 **Química Orgânica** está na **Comfort Zone** com 94% de retenção a longo prazo. Excelente desempenho!');
  } else {
    realRadarData.forEach(r => {
      if (r.Proficiência < 60) {
        recomendacoes.push(`⚠️ **${r.subjectName}** está na **Panic Zone** (domínio crítico de ${r.Proficiência}%). Priorize revisões de flashcards agora!`);
      } else if (r.Proficiência < 90) {
        recomendacoes.push(`🚀 **${r.subjectName}** está na **Learning Zone** (domínio de ${r.Proficiência}%). Continue estudando para atingir a zona de conforto.`);
      } else {
        recomendacoes.push(`🏆 **${r.subjectName}** está na **Comfort Zone** (excelência de ${r.Proficiência}%). Ótima retenção a longo prazo!`);
      }
    });
    if (recomendacoes.length === 0) {
      recomendacoes.push('📚 Nenhum flashcard cadastrado ou revisado. Crie flashcards no Workspace para visualizar seu domínio cognitivo real.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '400px', color: 'var(--text-secondary)' }}>
        Carregando gráficos de evolução...
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Estilos embutidos locais da página */}
      <style>{`
        .analytics-tabs {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 12px;
        }
        .analytics-tabs-buttons {
          display: flex;
          gap: 8px;
        }
        .analytics-tab-btn {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }
        .analytics-tab-btn:hover {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .analytics-tab-btn.active {
          background-color: var(--primary-glow);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .zone-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .zone-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
        }
        .zone-card:hover {
          transform: translateY(-2px);
        }
        .zone-card.streak {
          border-color: rgba(249, 115, 22, 0.3);
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(249, 115, 22, 0.05) 100%);
        }
        .zone-card.comfort {
          border-color: rgba(16, 185, 129, 0.3);
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(16, 185, 129, 0.05) 100%);
        }
        .zone-card.learning {
          border-color: rgba(245, 158, 11, 0.3);
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(245, 158, 11, 0.05) 100%);
        }
        .zone-card.panic {
          border-color: rgba(239, 68, 68, 0.3);
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(239, 68, 68, 0.05) 100%);
        }
        .zone-icon {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }
        .recomendacoes-card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          margin-top: 24px;
        }
        .recomendacao-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .recomendacao-item:last-child {
          border-bottom: none;
        }
        .demo-badge {
          background-color: var(--warning-glow);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>

      {/* Título da Página */}
      <div className="title-section">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <TrendingUp size={28} className="text-primary" />
            Evolução & Desempenho
          </h1>
          <p className="subtitle">Análise reflexiva de proficiência cognitiva e foco temporal</p>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="analytics-tabs">
        <div className="analytics-tabs-buttons">
          <button 
            className={`analytics-tab-btn ${activeTab === 'temporal' ? 'active' : ''}`}
            onClick={() => setActiveTab('temporal')}
          >
            Foco Temporal (Horas & Hábitos)
          </button>
          <button 
            className={`analytics-tab-btn ${activeTab === 'learning_zone' ? 'active' : ''}`}
            onClick={() => setActiveTab('learning_zone')}
          >
            Zona de Aprendizado (Cognitivo)
          </button>
        </div>

        {activeTab === 'learning_zone' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {exibirMock && (
              <span className="demo-badge">
                <Info size={14} />
                Modo de Demonstração
              </span>
            )}
            {temDadosReais && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={useMock} 
                  onChange={e => setUseMock(e.target.checked)} 
                  style={{ width: '14px', height: '14px', accentColor: 'var(--primary)' }}
                />
                Simular Dados
              </label>
            )}
          </div>
        )}
      </div>

      {/* ─── TAB 1: FOCO TEMPORAL ────────────────────────────────────────────── */}
      {activeTab === 'temporal' && (
        <>
          {/* Grid de Insights Analíticos */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <h3>Duração Média por Sessão</h3>
                <p>{mediaSessao} min</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <Award size={24} />
              </div>
              <div className="stat-info">
                <h3>Matéria Mais Focada</h3>
                <p style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                  {materiaMaisEstudada()}
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-info">
                <h3>Total de Sessões Gravadas</h3>
                <p>{sessions.length}</p>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Coluna Esquerda: Histórico e Distribuição de Horas */}
            <div className="dashboard-coluna-esquerda">
              <div className="card">
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>
                  Distribuição Acumulada por Matéria
                </h2>

                {dadosGrafico.length === 0 ? (
                  <div className="flex-center" style={{ height: '300px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Grave sessões de estudo para analisar a distribuição.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGrafico} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} tick={{ fill: 'var(--text-secondary)' }} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)' }} unit="h" />
                        <Tooltip
                          content={(props) => (
                            <TooltipGrafico
                              active={props.active}
                              payload={props.payload as any}
                              label={props.label as string}
                            />
                          )}
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />

                        {Array.from({ length: maxSessoes }, (_, barIdx) => (
                          <Bar
                            key={`bar-${barIdx}`}
                            dataKey={`session_${barIdx}`}
                            stackId="a"
                            radius={barIdx === maxSessoes - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            isAnimationActive={false}
                            onMouseEnter={(_, subjIdx) => setCelulaHover({ barIdx, subjIdx })}
                            onMouseLeave={() => setCelulaHover(null)}
                          >
                            {dadosGrafico.map((entrada, subjIdx) => {
                              const hover = celulaHoverRef.current;
                              const estaHover = hover !== null && hover.barIdx === barIdx && hover.subjIdx === subjIdx;
                              return (
                                <Cell
                                  key={`cell-${subjIdx}-${barIdx}`}
                                  fill={entrada.color as string}
                                  fillOpacity={barIdx % 2 === 0 ? 1 : 0.65}
                                  stroke={estaHover ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.1)'}
                                  strokeWidth={estaHover ? 2 : 0}
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
            </div>

            {/* Coluna Direita: Calendário Heatmap */}
            <div className="dashboard-coluna-direita">
              <div className="card heatmap-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <Calendar size={18} className="text-primary" />
                  <h2 className="card-title" style={{ margin: 0 }}>
                    Evolução Diária ({MESES_PT[mesAtual]} {anoAtual})
                  </h2>
                </div>

                {/* Dias da semana */}
                <div className="heatmap-grid" style={{ marginBottom: '8px' }}>
                  {DIAS_SEMANA_ABREV.map(d => (
                    <div key={d} className="heatmap-dia-semana">{d}</div>
                  ))}
                </div>

                {/* Grid dos dias */}
                <div className="heatmap-grid">
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

                <div className="heatmap-legenda" style={{ marginTop: '1.25rem' }}>
                  <span>Pouco</span>
                  {['rgba(99,102,241,0.2)','rgba(99,102,241,0.45)','rgba(99,102,241,0.7)','rgba(99,102,241,0.95)'].map((cor, i) => (
                    <div key={i} className="heatmap-legenda-celula" style={{ backgroundColor: cor }} />
                  ))}
                  <span>Muito</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB 2: ZONA DE APRENDIZADO ───────────────────────────────────────── */}
      {activeTab === 'learning_zone' && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          
          {/* Grid de Proficiência / Zonas */}
          <div className="zone-grid">
            
            {/* Card Streak */}
            <div className="zone-card streak">
              <div className="zone-icon" style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                <Flame size={20} className="animate-pulse" />
              </div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Frequência de Estudos</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0' }}>{streakAtivo} {streakAtivo === 1 ? 'Dia Ativo' : 'Dias Ativos'}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {streakAtivo > 0 
                  ? 'Seu cérebro adora consistência! Mantenha a chama acesa.' 
                  : 'Grave sessões de estudo para começar sua sequência!'}
              </span>
            </div>

            {/* Card Comfort Zone */}
            <div className="zone-card comfort">
              <div className="zone-icon" style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)' }}>
                <CheckCircle size={20} />
              </div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comfort Zone (&gt;90%)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0' }}>{totalComfort} {totalComfort === 1 ? 'Cartão' : 'Cartões'}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Conhecimento consolidado a longo prazo.</span>
            </div>

            {/* Card Learning Zone */}
            <div className="zone-card learning">
              <div className="zone-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
                <Compass size={20} />
              </div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Learning Zone (60-90%)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0' }}>{totalLearning} {totalLearning === 1 ? 'Cartão' : 'Cartões'}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Em processo de fixação ativa.</span>
            </div>

            {/* Card Panic Zone */}
            <div className="zone-card panic">
              <div className="zone-icon" style={{ backgroundColor: 'var(--danger-glow)', color: 'var(--danger)' }}>
                <AlertCircle size={20} />
              </div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Panic Zone (&lt;60%)</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '4px 0' }}>{totalPanic} {totalPanic === 1 ? 'Cartão' : 'Cartões'}</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Necessita de revisão imediata no Leitner.</span>
            </div>

          </div>

          {/* Gráficos de Radar e Área */}
          <div className="dashboard-grid">
            
            {/* Gráfico Radar (Domínio Geral) */}
            <div className="dashboard-coluna-esquerda">
              <div className="card">
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Proficiência por Tema (%)</h2>
                
                {radarData.length === 0 ? (
                  <div className="flex-center" style={{ height: '320px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Crie e revise flashcards para ver sua proficiência.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="var(--border-color)" />
                        <PolarAngleAxis dataKey="subjectName" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                        <Radar 
                          name="Domínio Cognitivo" 
                          dataKey="Proficiência" 
                          stroke="var(--primary)" 
                          fill="var(--primary)" 
                          fillOpacity={0.3} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          formatter={(value) => [`${value}%`, 'Domínio']}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Gráfico Área (Distribuição por Zonas) */}
            <div className="dashboard-coluna-right" style={{ flex: 1 }}>
              <div className="card" style={{ height: '100%' }}>
                <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Distribuição de Domínio por Matéria</h2>
                
                {areaData.length === 0 ? (
                  <div className="flex-center" style={{ height: '320px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Crie e revise flashcards para analisar as zonas.
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} 
                        />
                        <Area type="monotone" dataKey="Panic Zone" stackId="1" stroke="var(--danger)" fill="var(--danger)" fillOpacity={0.25} />
                        <Area type="monotone" dataKey="Learning Zone" stackId="1" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.25} />
                        <Area type="monotone" dataKey="Comfort Zone" stackId="1" stroke="var(--success)" fill="var(--success)" fillOpacity={0.25} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Recomendações de Estudo */}
          <div className="recomendacoes-card">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Activity size={18} className="text-primary" />
              Diretrizes de Estudo Personalizadas (IA)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recomendacoes.map((rec, index) => {
                const isWarning = rec.includes('⚠️');
                const isInfo = rec.includes('💡');
                const isSuccess = rec.includes('🏆');
                const isRocket = rec.includes('🚀');
                
                let icon = <Info size={16} style={{ color: 'var(--text-muted)' }} />;
                if (isWarning) icon = <AlertCircle size={16} style={{ color: 'var(--danger)' }} />;
                if (isInfo) icon = <Compass size={16} style={{ color: 'var(--warning)' }} />;
                if (isSuccess) icon = <CheckCircle size={16} style={{ color: 'var(--success)' }} />;
                if (isRocket) icon = <Brain size={16} style={{ color: 'var(--primary)' }} />;

                // Formata o texto em negrito simples para exibição limpa
                const formatText = (textStr: string) => {
                  const parts = textStr.split('**');
                  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part);
                };

                return (
                  <div className="recomendacao-item" key={index}>
                    <div style={{ marginTop: '2px' }}>{icon}</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {formatText(rec.replace('⚠️ ', '').replace('💡 ', '').replace('🏆 ', '').replace('🚀 ', ''))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Tooltip do Heatmap (Flutuante para o Calendário) */}
      {heatmapTooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: heatmapTooltip.mouseX, top: heatmapTooltip.mouseY, position: 'fixed' }}
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nenhum estudo registrado</div>
          )}
        </div>
      )}
    </div>
  );
}
