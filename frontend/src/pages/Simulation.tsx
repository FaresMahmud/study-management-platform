import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import { Compass, AlertTriangle, Play, CheckCircle, XCircle, RefreshCw, Award, ChevronLeft, ChevronRight, Maximize2, Minimize2, Info, Clock, Flag } from 'lucide-react';

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
  examPrep: ExamPrep;
  startTime: string;
  endTime?: string;
  score?: number;
  status: string;
  contentJson: string;
}

export default function Simulation() {
  const queryClient = useQueryClient();

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
  const [resultStatus, setResultStatus] = useState<string>('');

  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['exam-preps'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/exam-preps');
      return res.data.content || [];
    }
  });

  const selectedPrep = examPreps.find(ep => ep.id === selectedExamPrepId);

  const startSimulationMutation = useMutation({
    mutationFn: async (examPrepId: number) => {
      return (await apiClient.post<ExamSimulation>(`/api/v1/simulation/start?examPrepId=${examPrepId}`)).data;
    },
    onSuccess: (data) => {
      setSimulationId(data.id);
      try {
        const parsed: Question[] = JSON.parse(data.contentJson);
        // Garante que cada questão tenha a opção E mapeada
        const formatted = parsed.map(q => ({
          ...q,
          options: {
            ...q.options,
            E: q.options.E || 'Nenhuma das alternativas anteriores.'
          }
        }));
        setQuestions(formatted);
      } catch (err) {
        setQuestions([
          {
            question: "Questão 1: Qual é a principal vantagem da repetição espaçada?",
            options: { A: "Decorar", B: "Consolidar a memória", C: "Nenhuma", D: "Esquecer", E: "Melhorar caligrafia" },
            correctAnswer: "B"
          }
        ]);
      }

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
    }
  });

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
      setResultStatus(data.status);
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
  }, [simulationStarted, simulationCompleted]);

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

  const handleAutoSubmit = () => {
    if (simulationId) {
      finishSimulationMutation.mutate({ id: simulationId, answers });
    }
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
      padding: inFullscreen ? '24px' : '0' 
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '21px' }}>
            <Compass size={24} style={{ color: 'var(--warning)' }} />
            Simulado Cronometrado
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>Simulação real sob pressão temporal controlada</p>
        </div>
      </div>

      {!simulationStarted && !simulationCompleted ? (
        <div style={{ maxWidth: '600px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Clock size={48} style={{ color: 'var(--warning)', marginBottom: '12px' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Iniciar Simulado sem Distração</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Avaliação de 15 minutos em tela cheia com 3 questões de vestibular.
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Selecione o Exame Alvo</label>
            <select className="form-input" value={selectedExamPrepId} onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Escolher Exame...</option>
              {examPreps.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={!selectedExamPrepId} onClick={handleStartSimulation}>
            Iniciar Simulado (15 Minutos)
          </button>
        </div>
      ) : simulationCompleted ? (
        <div style={{ maxWidth: '720px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Award size={48} style={{ color: 'var(--warning)' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800, marginTop: '8px' }}>Desempenho no Simulado</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '21px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Média de Acertos</span>
              <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--warning)' }}>{resultScore}%</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status da Prova</span>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)', marginTop: '8px' }}>Concluída</p>
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setSimulationCompleted(false); setSimulationStarted(false); }}>Voltar ao Menu</button>
        </div>
      ) : (
        <div className="simulation-grid">
          
          {/* Coluna Esquerda: Questão Ativa */}
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '400px' }}>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ textAlign: 'center', marginBottom: '21px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tempo Restante</span>
                <p style={{ fontSize: '34px', fontWeight: 900, marginTop: '4px' }} className={timeLeft <= 120 ? 'pulse-timer' : ''}>
                  {formatTime(timeLeft)}
                </p>
              </div>

              {/* Grid Compacto do Navegador */}
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '13px', fontWeight: 700 }}>Navegador de Questões</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '21px' }}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} /> Respondida</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} /> Marcada</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)' }} /> Pendente</span>
              </div>
            </div>

            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '21px' }} onClick={handleSubmitSimulation}>
              Finalizar Prova
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
