import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import type { Subject } from '../types';
import {
  Compass,
  AlertTriangle,
  Play,
  Hourglass,
  CheckCircle,
  XCircle,
  RefreshCw,
  Award,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Info,
  Clock
} from 'lucide-react';

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
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
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

  // ─── Estados Principais ───────────────────────────────────────────────
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  
  // Timer (15 minutos = 900 segundos)
  const [timeLeft, setTimeLeft] = useState(900);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fullscreen e Bloqueios
  const [inFullscreen, setInFullscreen] = useState(false);

  // Resultados
  const [simulationCompleted, setSimulationCompleted] = useState(false);
  const [resultScore, setResultScore] = useState<number | null>(null);
  const [resultStatus, setResultStatus] = useState<string>('');

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: examPreps = [], isLoading: isLoadingPreps } = useQuery<ExamPrep[]>({
    queryKey: ['exam-preps'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/exam-preps');
      return res.data.content || [];
    }
  });

  const selectedPrep = examPreps.find(ep => ep.id === selectedExamPrepId);

  // ─── Mutations ────────────────────────────────────────────────────────
  const startSimulationMutation = useMutation({
    mutationFn: async (examPrepId: number) => {
      return (await apiClient.post<ExamSimulation>(`/api/v1/simulation/start?examPrepId=${examPrepId}`)).data;
    },
    onSuccess: (data) => {
      setSimulationId(data.id);
      
      // Deserializa as questões
      try {
        const parsed: Question[] = JSON.parse(data.contentJson);
        setQuestions(parsed);
      } catch (err) {
        console.error("Erro ao ler JSON das questões:", err);
        // Fallback se o JSON falhar
        setQuestions([
          {
            question: "Questão Fallback 1: Qual é a principal vantagem da repetição espaçada?",
            options: { A: "Decorar mais rápido", B: "Consolidar a memória de longo prazo", C: "Nenhuma", D: "Esquecer passivamente" },
            correctAnswer: "B"
          }
        ]);
      }

      setAnswers({});
      setCurrentIdx(0);
      setTimeLeft(900);
      setSimulationCompleted(false);
      setResultScore(null);
      setSimulationStarted(true);

      // Tenta entrar em Fullscreen no container root
      const container = document.getElementById('simulation-fullscreen-root');
      if (container?.requestFullscreen) {
        container.requestFullscreen().then(() => {
          setInFullscreen(true);
        }).catch(err => {
          console.error("Erro ao entrar em fullscreen:", err);
        });
      }
    },
    onError: () => {
      alert("Erro ao gerar o simulado cronometrado. Verifique a sua conexão.");
    }
  });

  const finishSimulationMutation = useMutation({
    mutationFn: async (payload: { id: number; answers: Record<number, 'A' | 'B' | 'C' | 'D'> }) => {
      // Converte o record de respostas em um mapa compatível com Map<Integer, String> do Spring
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

      // Invalida queries de metas para atualizar painéis
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      // Se atingiu ou superou a meta de score da preparação, solta confetes!
      const target = selectedPrep?.targetScore || 80;
      if ((data.score ?? 0) >= target) {
        triggerConfetti();
      }

      // Sai do modo fullscreen se ainda estiver ativo
      if (document.fullscreenElement) {
        document.exitFullscreen().then(() => {
          setInFullscreen(false);
        }).catch(e => console.error(e));
      }
    },
    onError: () => {
      alert("Erro ao finalizar o simulado no servidor.");
    }
  });

  // ─── Lógica do Cronômetro ──────────────────────────────────────────────
  useEffect(() => {
    if (simulationStarted && !simulationCompleted) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleAutoSubmit(); // Finaliza automaticamente se estourar o tempo
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

  // ─── Atalhos e Listeners de Fullscreen ───────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = document.fullscreenElement !== null;
      setInFullscreen(isFs);
      if (!isFs && simulationStarted && !simulationCompleted) {
        alert("🚨 Atenção: Você saiu do modo de tela cheia sem distrações! Para manter o foco e evitar anulações, retorne à tela cheia pressionando o botão de maximizar.");
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [simulationStarted, simulationCompleted]);

  // Bloqueio de Teclas (F5, F11, Ctrl+R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!simulationStarted || simulationCompleted) return;

      // Impede F5 e Ctrl+R de recarregar a página
      if (e.key === 'F5' || (e.ctrlKey && (e.key === 'r' || e.key === 'R'))) {
        e.preventDefault();
        alert("Ação bloqueada: Recarregar a página durante a execução do simulado não é permitido.");
      }

      // Impede F11
      if (e.key === 'F11') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulationStarted, simulationCompleted]);

  // Detecção de perda de foco (aba oculta/Alt+Tab)
  useEffect(() => {
    const handleBlur = () => {
      if (simulationStarted && !simulationCompleted) {
        console.warn("Estudante tirou o foco da aba do simulado.");
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [simulationStarted, simulationCompleted]);

  // ─── Handlers do Fluxo ───────────────────────────────────────────────
  const handleStartSimulation = () => {
    if (!selectedExamPrepId) {
      alert("Selecione uma Preparação de Prova ativa para iniciar o simulado.");
      return;
    }
    startSimulationMutation.mutate(Number(selectedExamPrepId));
  };

  const handleSelectAnswer = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [currentIdx]: optionKey
    }));
  };

  const handleAutoSubmit = () => {
    if (simulationId) {
      finishSimulationMutation.mutate({ id: simulationId, answers });
    }
  };

  const handleSubmitSimulation = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirmSubmit = window.confirm(`Você respondeu apenas ${answeredCount} de ${questions.length} questões. Tem certeza que deseja entregar a prova agora?`);
      if (!confirmSubmit) return;
    }
    handleAutoSubmit();
  };

  const handleToggleFullscreen = () => {
    const container = document.getElementById('simulation-fullscreen-root');
    if (!document.fullscreenElement) {
      container?.requestFullscreen().then(() => setInFullscreen(true)).catch(e => console.error(e));
    } else {
      document.exitFullscreen().then(() => setInFullscreen(false)).catch(e => console.error(e));
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Cálculo de rotação para o Timer Circular SVG
  const circularCircumference = 2 * Math.PI * 45; // raio = 45
  const strokeDashoffset = circularCircumference - (timeLeft / 900) * circularCircumference;

  return (
    <div className="dashboard-root" id="simulation-fullscreen-root" style={{ animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column', height: inFullscreen ? '100vh' : 'auto', backgroundColor: inFullscreen ? 'var(--bg-primary)' : 'transparent', padding: inFullscreen ? '24px' : '0' }}>
      
      {/* CSS embutido da simulação */}
      <style>{`
        .circular-timer-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
        }
        .circular-timer-svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }
        .circular-timer-bg {
          fill: none;
          stroke: var(--border-color);
          stroke-width: 8;
        }
        .circular-timer-fill {
          fill: none;
          stroke: var(--primary);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
        }
        .circular-timer-fill.warning {
          stroke: var(--danger);
        }
        .circular-timer-text {
          position: absolute;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-primary);
          font-family: monospace;
        }
        .sim-option-btn {
          width: 100%;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          text-align: left;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sim-option-btn:hover:not(:disabled) {
          border-color: var(--primary);
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          transform: translateX(4px);
        }
        .sim-option-btn.selected {
          border-color: var(--primary);
          background-color: var(--primary-glow);
          color: var(--text-primary);
          font-weight: 600;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
        }
        .sim-progress-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--border-color);
          transition: all 0.2s;
        }
        .sim-progress-indicator.active {
          background-color: var(--primary);
          transform: scale(1.2);
          box-shadow: 0 0 8px var(--primary);
        }
        .sim-progress-indicator.answered {
          background-color: var(--success);
        }
      `}</style>

      {/* CABEÇALHO (Ocultado em fullscreen se desejado, mas mantido minimalista para controle) */}
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: inFullscreen ? '1.5rem' : '1.8rem' }}>
            <Compass size={inFullscreen ? 22 : 28} className="text-primary animate-spin" style={{ animationDuration: '6s' }} />
            Simulado de Prova
          </h1>
          <p className="subtitle" style={{ fontSize: '0.85rem' }}>Preparação cronometrada sob condições reais de exame</p>
        </div>

        {simulationStarted && (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleToggleFullscreen}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {inFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{inFullscreen ? "Sair Tela Cheia" : "Tela Cheia"}</span>
          </button>
        )}
      </div>

      {!simulationStarted && !simulationCompleted ? (
        /* ================= TELA INICIAL: SETUP ================= */
        <div style={{ maxWidth: '600px', margin: '40px auto 0 auto', width: '100%' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Clock size={48} className="text-primary animate-pulse" style={{ marginBottom: '12px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Modo Simulado Sem Distrações</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
              Este é um simulado cronometrado de **15 minutos** com 3 questões inéditas geradas por IA.
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--danger)', display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '20px', fontSize: '0.82rem' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Regras da Prova Cheia:</strong>
              <p style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>
                1. A tela entrará em tela cheia persistente.<br />
                2. Recarregar a página ou usar atalhos de navegação comuns será bloqueado.<br />
                3. O cronômetro não para. Se o tempo esgotar, a prova será entregue automaticamente.
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Selecione o Objetivo / Prova de Destino</label>
            <select 
              className="form-input"
              value={selectedExamPrepId}
              onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecione uma Preparação de Prova</option>
              {examPreps.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.title} (Meta: {ep.targetScore} pts)</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            disabled={!selectedExamPrepId || startSimulationMutation.isPending}
            onClick={handleStartSimulation}
          >
            <Play size={16} />
            {startSimulationMutation.isPending ? "Preparando Prova..." : "Iniciar Simulado de 15 Minutos"}
          </button>
        </div>
      ) : simulationCompleted ? (
        /* ================= TELA DE RESULTADO / REVISÃO ================= */
        <div style={{ maxWidth: '720px', margin: '20px auto 0 auto', width: '100%' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: '12px' }}>
              <Award size={48} />
            </div>
            
            {resultScore !== null && selectedPrep && resultScore >= selectedPrep.targetScore ? (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>Parabéns! Meta Atingida! 🏆</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Seu aproveitamento superou a meta de **{selectedPrep.targetScore}%** estabelecida!
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Simulado Concluído</h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Você finalizou a avaliação. Veja a análise de domínio abaixo.
                </p>
              </>
            )}
          </div>

          {/* Grid de score card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sua Pontuação Final</span>
              <p style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{resultScore}%</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Status da Prova</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '6px', color: resultStatus === 'TIMED_OUT' ? 'var(--danger)' : 'var(--success)' }}>
                {resultStatus === 'TIMED_OUT' ? 'Tempo Esgotado' : 'Concluído no Prazo'}
              </p>
            </div>
          </div>

          {/* Painel de Questões Resolvidas */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>Revisão de Questões</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {questions.map((q, idx) => {
                const studentAns = answers[idx];
                const isCorrect = studentAns === q.correctAnswer;
                
                return (
                  <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Questão {idx + 1}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                        {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {isCorrect ? "Correta" : "Incorreta"}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.4 }}>
                      {q.question}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
                      {(['A', 'B', 'C', 'D'] as const).map(key => {
                        const isStudentSel = studentAns === key;
                        const isCorrectAns = q.correctAnswer === key;
                        
                        let borderStyle = '1px solid var(--border-color)';
                        let textColor = 'var(--text-secondary)';
                        if (isCorrectAns) {
                          borderStyle = '1px solid var(--success)';
                          textColor = 'var(--success)';
                        } else if (isStudentSel && !isCorrectAns) {
                          borderStyle = '1px solid var(--danger)';
                          textColor = 'var(--danger)';
                        }

                        return (
                          <div 
                            key={key} 
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: '6px', 
                              border: borderStyle, 
                              color: textColor,
                              backgroundColor: isStudentSel ? 'rgba(255,255,255,0.02)' : 'transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>{key}) {q.options[key]}</span>
                            {isStudentSel && <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Sua escolha</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => {
                setSimulationCompleted(false);
                setSimulationStarted(false);
                setSelectedExamPrepId('');
              }}
            >
              <RefreshCw size={14} />
              Voltar ao Menu
            </button>
          </div>
        </div>
      ) : (
        /* ================= TELA ATIVA: SIMULADO CRONOMETRADO ================= */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Dashboard Superior do Simulado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
            {/* Indicadores de progresso */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {questions.map((_, idx) => {
                const isCurrent = idx === currentIdx;
                const isAnswered = answers[idx] !== undefined;
                let cName = 'sim-progress-indicator';
                if (isCurrent) cName += ' active';
                if (isAnswered) cName += ' answered';

                return <div key={idx} className={cName} />;
              })}
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 600 }}>
                Questão {currentIdx + 1} de {questions.length}
              </span>
            </div>

            {/* Circular Timer de 15 Minutos */}
            <div className="circular-timer-container">
              <svg className="circular-timer-svg">
                <circle cx="60" cy="60" r="45" className="circular-timer-bg" />
                <circle 
                  cx="60" 
                  cy="60" 
                  r="45" 
                  className={`circular-timer-fill ${timeLeft <= 60 ? 'warning' : ''}`}
                  strokeDasharray={circularCircumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="circular-timer-text">{formatTime(timeLeft)}</div>
            </div>
          </div>

          {/* Painel da Questão */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '340px', overflowY: 'auto' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px', lineHeight: 1.4 }}>
                {questions[currentIdx]?.question}
              </h3>

              {/* Opções (Múltipla Escolha sem feedback de correção na hora) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(['A', 'B', 'C', 'D'] as const).map((key) => {
                  const isSelected = answers[currentIdx] === key;
                  
                  return (
                    <button
                      key={key}
                      className={`sim-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectAnswer(key)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <strong style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>{key})</strong>
                        <span>{questions[currentIdx]?.options[key]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rodapé de navegação e entrega */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginTop: '24px', flexShrink: 0 }}>
              <button 
                className="btn btn-secondary btn-sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(i => i - 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              <button 
                className="btn btn-primary"
                onClick={handleSubmitSimulation}
              >
                Finalizar e Entregar Simulado
              </button>

              <button 
                className="btn btn-secondary btn-sm"
                disabled={currentIdx + 1 === questions.length}
                onClick={() => setCurrentIdx(i => i + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Próximo
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          {/* Informação adicional de integridade */}
          {inFullscreen && (
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <Info size={12} />
              Modo Tela Cheia Ativo • Evite sair da tela para não anular seu resultado.
            </p>
          )}

        </div>
      )}
    </div>
  );
}
