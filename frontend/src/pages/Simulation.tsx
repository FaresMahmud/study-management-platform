import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Clock, Compass, Flag, Plus, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient, normalizeListResponse } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import ExamWizard from '../components/wizard/ExamWizard';

interface ExamPrep {
  id: number;
  title: string;
  examDate: string;
  targetScore: number;
  status: string;
  daysRemaining: number;
}

interface Question {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface ExamSimulation {
  id: number;
  examPrepId: number;
  examPrepTitle: string;
  startTime: string;
  endTime?: string;
  score?: number;
  status: string;
  contentJson: string;
}

export default function Simulation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const queryExamPrepId = searchParams.get('examPrepId');
  const querySubjectId = searchParams.get('subjectId');

  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<number, boolean>>({});

  // Timer (15 min = 900s)
  const [timeLeft, setTimeLeft] = useState(900);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [inFullscreen, setInFullscreen] = useState(false);

  // Results
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['exam-preps'],
    queryFn: async () => {
      const res = await apiClient.get<{ content?: ExamPrep[] }>('/api/v1/exam-preps');
      return normalizeListResponse<ExamPrep>(res.data);
    }
  });

  useEffect(() => {
    if (queryExamPrepId && examPreps.some(ep => ep.id === Number(queryExamPrepId))) {
      setSelectedExamPrepId(Number(queryExamPrepId));
    } else if (examPreps.length > 0 && selectedExamPrepId === '') {
      setSelectedExamPrepId(examPreps[0].id);
    }
  }, [examPreps, selectedExamPrepId, queryExamPrepId]);

  const selectedPrep = examPreps.find(ep => ep.id === selectedExamPrepId);

  const startSimulationMutation = useMutation({
    mutationFn: async (examPrepId: number) => {
      return (await apiClient.post<ExamSimulation>(`/api/v1/simulation/start?examPrepId=${examPrepId}`)).data;
    },
    onSuccess: (data) => {
      setSimulationId(data.id);
      const parsed: Question[] = JSON.parse(data.contentJson);
      const formatted = parsed.map(q => ({
        ...q,
        options: {
          ...q.options,
          E: q.options.E || 'Nenhuma das alternativas anteriores.'
        }
      }));
      setQuestions(formatted);

      setAnswers({});
      setMarkedQuestions({});
      setCurrentIdx(0);
      setTimeLeft(900);
      setSimulationCompleted(false);
      setResultScore(null);
      setSimulationStarted(true);

      const container = document.getElementById('simulation-fullscreen-root');
      if (container?.requestFullscreen) {
        container.requestFullscreen().then(() => setInFullscreen(true)).catch(e => console.error(e));
      }
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      const msg = error?.response?.data?.message || 'Ainda não encontramos questões para esta prova. Envie um PDF na Área de Estudos para que a IA gere seu simulado!';
      setStartError(msg);
    }
  });

  const handleStartSimulation = () => {
    setStartError(null);
    if (selectedExamPrepId) {
      startSimulationMutation.mutate(Number(selectedExamPrepId));
    }
  };

  const finishSimulationMutation = useMutation({
    mutationFn: async (payload: { id: number; answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'> }) => {
      const formattedAnswers: Record<string, string> = {};
      Object.entries(payload.answers).forEach(([k, v]) => {
        formattedAnswers[k] = v;
      });
      return (await apiClient.post<ExamSimulation>(`/api/v1/simulation/finish/${payload.id}`, formattedAnswers)).data;
    },
    onSuccess: (data) => {
      setResultScore(data.score ?? 0);
      setSimulationCompleted(true);
      setSimulationStarted(false);
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      if ((data.score ?? 0) >= (selectedPrep?.targetScore || 80)) {
        triggerConfetti();
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => setInFullscreen(false)).catch(e => console.error(e));
      }
    }
  });

  const handleAutoSubmit = useCallback(() => {
    if (simulationId) {
      finishSimulationMutation.mutate({ id: simulationId, answers });
    }
  }, [simulationId, answers, finishSimulationMutation]);

  useEffect(() => {
    if (simulationStarted && !simulationCompleted) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [simulationStarted, simulationCompleted, handleAutoSubmit]);

  useEffect(() => {
    const handleFullscreen = () => {
      setInFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  const handleSelectAnswer = (optionKey: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setAnswers(prev => ({ ...prev, [currentIdx]: optionKey }));
  };

  const handleMarkQuestion = () => {
    setMarkedQuestions(prev => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
  };

  const handleSubmitSimulation = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirm = window.confirm(`Você respondeu apenas ${answeredCount} de ${questions.length} questões. Enviar assim mesmo?`);
      if (!confirm) return;
    }
    handleAutoSubmit();
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="dashboard-root" id="simulation-fullscreen-root" style={{
      animation: 'fadeIn 0.4s ease-out',
      display: 'flex',
      flexDirection: 'column',
      height: inFullscreen ? '100vh' : 'auto',
      backgroundColor: inFullscreen ? 'var(--bg-primary)' : 'transparent',
      padding: inFullscreen ? 'var(--space-lg)' : '0'
    }}>

      <style>{`
        .simulation-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .simulation-grid { grid-template-columns: 1fr; }
        }
        .nav-cell {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          border: 1px solid var(--border-color);
          background-color: var(--bg-tertiary);
          cursor: pointer;
          transition: all 0.2s;
        }
        .nav-cell.active {
          border-color: var(--primary);
          box-shadow: 0 0 10px var(--primary-glow);
          background-color: var(--primary-glow);
        }
        .nav-cell.answered {
          background-color: var(--success-glow);
          border-color: var(--success);
        }
        .nav-cell.marked {
          background-color: var(--warning-glow);
          border-color: var(--warning);
        }
        .pulse-timer {
          animation: pulseAnimation 1s infinite alternate;
          color: var(--danger) !important;
        }
        @keyframes pulseAnimation {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>

      {/* Header */}
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '21px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '21px' }}>
            <Compass size={24} style={{ color: 'var(--warning)' }} />
            Simulado Cronometrado
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>Simulação real sob pressão temporal controlada</p>
        </div>
      </div>

      {!simulationStarted && !simulationCompleted ? (
        <div style={{ maxWidth: '600px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <Clock size={48} style={{ color: 'var(--warning)', marginBottom: 'var(--space-sm)' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Iniciar Simulado sem Distração</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
              Avaliação de 15 minutos em tela cheia com 3 questões de vestibular.
            </p>
          </div>

          {startError && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertCircle size={16} />
                <span style={{ fontWeight: 700 }}>Atenção</span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', lineHeight: 1.4 }}>{startError}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/workspace')}
                style={{ fontSize: '0.8rem', padding: '5px 12px' }}
              >
                Ir para Área de Estudos e enviar PDF →
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>De qual prova será o simulado?</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowWizard(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px' }}
              >
                <Plus size={14} />
                <span>Nova Prova</span>
              </button>
            </div>

            {examPreps.length === 0 ? (
              <div style={{ padding: '24px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                  Você ainda não tem questões. Envie um PDF e a IA cria questões de vestibular pra você.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/workspace')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Enviar PDF</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowWizard(true)}
                  >
                    + Cadastrar Primeira Prova
                  </button>
                </div>
              </div>
            ) : (
              <select className="form-input" value={selectedExamPrepId} onChange={e => { setSelectedExamPrepId(e.target.value ? Number(e.target.value) : ''); setStartError(null); }}>
                <option value="">Escolher Prova...</option>
                {examPreps.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={!selectedExamPrepId || startSimulationMutation.isPending}
            onClick={handleStartSimulation}
          >
            {startSimulationMutation.isPending ? 'Preparando Simulado...' : 'Iniciar Simulado (15 Minutos)'}
          </button>
        </div>
      ) : simulationCompleted ? (
        <div style={{ maxWidth: '720px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <Award size={48} style={{ color: 'var(--warning)' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800, marginTop: 'var(--space-xs)' }}>Desempenho no Simulado</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', backgroundColor: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '21px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média de Acertos</span>
              <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--warning)' }}>{resultScore}%</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status da Prova</span>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', marginTop: 'var(--space-xs)' }}>Concluída</p>
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setSimulationCompleted(false); setSimulationStarted(false); }}>Voltar ao Menu</button>
        </div>
      ) : (
        <div className="simulation-grid">

          {/* Coluna Esquerda: Questão Ativa */}
          <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '400px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '21px' }}>
                <span className="badge badge-primary">Questão {currentIdx + 1} de {questions.length}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleMarkQuestion}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', borderColor: markedQuestions[currentIdx] ? 'var(--warning)' : 'var(--border-color)' }}
                >
                  <Flag size={14} style={{ color: markedQuestions[currentIdx] ? 'var(--warning)' : 'inherit' }} />
                  <span>{markedQuestions[currentIdx] ? 'Marcada' : 'Marcar'}</span>
                </button>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '21px', lineHeight: 1.5 }}>
                {questions[currentIdx]?.question}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => {
                  const isSelected = answers[currentIdx] === key;
                  return (
                    <button
                      key={key}
                      className={`sim-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectAnswer(key)}
                    >
                      <span>{key}) {questions[currentIdx]?.options[key]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '21px' }}>
              <button className="btn btn-secondary btn-sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>Anterior</button>
              <button className="btn btn-secondary btn-sm" disabled={currentIdx + 1 === questions.length} onClick={() => setCurrentIdx(i => i + 1)}>Próximo</button>
            </div>
          </div>

          {/* Coluna Direita: Navegador + Resumo */}
          <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ textAlign: 'center', marginBottom: '21px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tempo Restante</span>
                <p style={{ fontSize: '34px', fontWeight: 900, marginTop: '4px' }} className={timeLeft <= 120 ? 'pulse-timer' : ''}>
                  {formatTime(timeLeft)}
                </p>
              </div>

              {/* Grid Compacto do Navegador */}
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '13px', fontWeight: 700 }}>Navegador de Questões</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-xs)', marginBottom: '21px' }}>
                {questions.map((_, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = answers[idx] !== undefined;
                  const isMarked = markedQuestions[idx] === true;

                  let cellClass = 'nav-cell';
                  if (isCurrent) cellClass += ' active';
                  if (isAnswered) cellClass += ' answered';
                  else if (isMarked) cellClass += ' marked';

                  return (
                    <button key={idx} className={cellClass} onClick={() => setCurrentIdx(idx)}>
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 'var(--space-xs)', height: 'var(--space-xs)', borderRadius: '50%', backgroundColor: 'var(--success)' }} /> Respondida</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 'var(--space-xs)', height: 'var(--space-xs)', borderRadius: '50%', backgroundColor: 'var(--warning)' }} /> Marcada</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: 'var(--space-xs)', height: 'var(--space-xs)', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)' }} /> Pendente</span>
              </div>
            </div>

            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '21px' }} onClick={handleSubmitSimulation}>
              Finalizar Prova
            </button>
          </div>

        </div>
      )}

      {showWizard && (
        <ExamWizard
          onClose={() => setShowWizard(false)}
          onFinished={() => {
            setShowWizard(false);
            queryClient.invalidateQueries({ queryKey: ['exam-preps'] });
          }}
        />
      )}
    </div>
  );
}
