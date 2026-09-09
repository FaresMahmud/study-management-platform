import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Clock, Compass, Flag, Plus, AlertCircle, Sparkles, RefreshCw, CheckCircle2, XCircle, Layers, BookOpen, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient, normalizeListResponse } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import ExamWizard from '../components/wizard/ExamWizard';
import { track, trackOnce } from '../utils/analytics';

interface ExamPrep {
  id: number;
  title: string;
  examDate: string;
  targetScore: number;
  status: string;
  daysRemaining: number;
}

interface Subject {
  id: number;
  subjectName: string;
  examPrepId?: number;
}

interface StyleProfile {
  id?: number;
  examBoard?: string;
  format?: 'MULTIPLE_CHOICE_4' | 'MULTIPLE_CHOICE_5' | 'TRUE_FALSE' | 'DISCURSIVE';
  typicalStatementLength?: string;
  usesContextText?: boolean;
  confidence?: number;
  sampleExercisesFound?: number;
  detectionSource?: 'EXTRACTED_FROM_MATERIAL' | 'DEFAULT_BY_EXAM_TYPE';
}

interface QuestionBankSummary {
  subjectId: number;
  subjectName: string;
  totalQuestions: number;
  activeQuestions: number;
  usedQuestions: number;
  retiredQuestions: number;
  styleProfile?: StyleProfile;
}

interface GenerationJob {
  jobId: string;
  subjectId: number;
  requestedCount: number;
  generatedCount: number;
  status: 'PENDING' | 'ANALYZING_STYLE' | 'GENERATING' | 'DONE' | 'FAILED';
  errorMessage?: string;
  styleProfile?: StyleProfile;
}

interface Question {
  id?: number;
  question: string;
  format?: 'MULTIPLE_CHOICE_4' | 'MULTIPLE_CHOICE_5' | 'TRUE_FALSE' | 'DISCURSIVE';
  alternatives?: string[];
  options?: Record<string, string>;
  correctAnswer?: string;
  explanation?: string;
  topicHint?: string;
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
  partial?: boolean;
  available?: number;
  requested?: number;
  generationJobId?: string;
}

export default function Simulation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const queryExamPrepId = searchParams.get('examPrepId');
  const querySubjectId = searchParams.get('subjectId');

  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [questionCount, setQuestionCount] = useState<number>(10);

  const [simulationStarted, setSimulationStarted] = useState(false);
  const [simulationId, setSimulationId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
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
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

  // Generation Job State
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateQuantity, setGenerateQuantity] = useState(5);
  const [jobError, setJobError] = useState<string | null>(null);

  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['exam-preps'],
    queryFn: async () => {
      const res = await apiClient.get<{ content?: ExamPrep[] }>('/api/v1/exam-preps');
      return normalizeListResponse<ExamPrep>(res.data);
    }
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient.get<Subject[]>('/api/subjects');
      return normalizeListResponse(res.data);
    }
  });

  // Pre-select exam prep or subject from search params
  useEffect(() => {
    if (querySubjectId) {
      const subIdNum = Number(querySubjectId);
      setSelectedSubjectId(subIdNum);
      const subj = subjects.find(s => s.id === subIdNum);
      if (subj?.examPrepId) {
        setSelectedExamPrepId(subj.examPrepId);
      }
    } else if (queryExamPrepId && examPreps.some(ep => ep.id === Number(queryExamPrepId))) {
      setSelectedExamPrepId(Number(queryExamPrepId));
    } else if (examPreps.length > 0 && selectedExamPrepId === '') {
      setSelectedExamPrepId(examPreps[0].id);
    }
  }, [examPreps, subjects, selectedExamPrepId, queryExamPrepId, querySubjectId]);

  // Subjects filtered for the currently selected ExamPrep
  const availableSubjects = useMemo(() => {
    if (!selectedExamPrepId) return subjects;
    const filtered = subjects.filter(s => s.examPrepId === selectedExamPrepId);
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, selectedExamPrepId]);

  // Auto-select first subject if none selected
  useEffect(() => {
    if (availableSubjects.length > 0 && (!selectedSubjectId || !availableSubjects.some(s => s.id === selectedSubjectId))) {
      setSelectedSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubjectId]);

  const selectedPrep = examPreps.find(ep => ep.id === selectedExamPrepId);

  // Question Bank Summary Query for selected Subject
  const { data: bankSummary, isLoading: isLoadingSummary } = useQuery<QuestionBankSummary | null>({
    queryKey: ['question-bank-summary', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return null;
      try {
        const res = await apiClient.get<QuestionBankSummary>(`/api/v1/subjects/${selectedSubjectId}/question-bank/summary`);
        return res.data;
      } catch (err) {
        console.warn('Banco de questões ainda vazio ou matéria não encontrada:', err);
        return null;
      }
    },
    enabled: !!selectedSubjectId,
  });

  // Disparar evento quando perfil de estilo for detectado e carregado
  useEffect(() => {
    if (bankSummary?.styleProfile && selectedSubjectId) {
      track('style_profile_detected', {
        subject_id: selectedSubjectId,
        bank: bankSummary.styleProfile.examBoard || 'Padrão da Prova',
        format: bankSummary.styleProfile.format,
        confidence: bankSummary.styleProfile.confidence,
        sample_count: bankSummary.styleProfile.sampleExercisesFound,
        source: bankSummary.styleProfile.detectionSource,
      });
    }
  }, [bankSummary, selectedSubjectId]);

  // Polling de Question Generation Job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'DONE' || activeJob.status === 'FAILED') return;

    const startTime = Date.now();
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get<GenerationJob>(`/api/v1/question-generation-jobs/${activeJob.jobId}`);
        const updated = res.data;
        setActiveJob(updated);

        if (updated.status === 'DONE') {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['question-bank-summary', selectedSubjectId] });
          track('question_generation_completed', {
            job_id: updated.jobId,
            subject_id: updated.subjectId,
            generated_count: updated.generatedCount,
            duration_ms: Date.now() - startTime,
          });
        } else if (updated.status === 'FAILED') {
          clearInterval(interval);
          setJobError(updated.errorMessage || 'Falha ao gerar questões via IA.');
          track('question_generation_failed', {
            job_id: updated.jobId,
            subject_id: updated.subjectId,
            error: updated.errorMessage,
            generated_so_far: updated.generatedCount,
          });
        }
      } catch (err) {
        console.warn('Erro ao checar status do job:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeJob?.jobId, activeJob?.status, selectedSubjectId, queryClient]);

  // Iniciar Job de Geração
  const startJobMutation = useMutation({
    mutationFn: async ({ subjectId, count }: { subjectId: number; count: number }) => {
      setJobError(null);
      const res = await apiClient.post<GenerationJob>(`/api/v1/subjects/${subjectId}/question-bank/generate-job`, {
        requestedCount: count,
        forceStyleRegeneration: false,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setActiveJob(data);
      track('question_generation_started', {
        job_id: data.jobId,
        subject_id: data.subjectId,
        requested_count: data.requestedCount,
        format: data.styleProfile?.format || 'AUTO',
      });
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message || 'Falha ao iniciar job de geração.';
      setJobError(msg);
    }
  });

  const handleTriggerGeneration = () => {
    if (selectedSubjectId) {
      startJobMutation.mutate({ subjectId: Number(selectedSubjectId), count: generateQuantity });
    }
  };

  // Start Simulation Mutation
  const startSimulationMutation = useMutation({
    mutationFn: async ({ prepId, subjId, count }: { prepId?: number; subjId?: number; count: number }) => {
      const params = new URLSearchParams();
      if (subjId) params.append('subjectId', subjId.toString());
      if (prepId) params.append('examPrepId', prepId.toString());
      params.append('questionCount', count.toString());

      return (await apiClient.post<ExamSimulation>(`/api/v1/simulation/start?${params.toString()}`)).data;
    },
    onSuccess: (data) => {
      setSimulationId(data.id);
      const parsed: Question[] = JSON.parse(data.contentJson);
      setQuestions(parsed);

      track('simulation_started_from_bank', {
        simulation_id: data.id,
        subject_id: selectedSubjectId || undefined,
        requested: data.requested || questionCount,
        available: data.available || parsed.length,
        is_partial: Boolean(data.partial),
      });

      if (data.partial) {
        setPartialWarning(`Iniciamos com as ${data.available} questões disponíveis no banco. Um job em background está gerando mais questões para suas próximas tentativas!`);
        track('question_bank_exhausted', {
          subject_id: selectedSubjectId || undefined,
          requested: data.requested || questionCount,
          available: data.available || parsed.length,
          remaining_deficit: (data.requested || questionCount) - (data.available || parsed.length),
        });
      } else {
        setPartialWarning(null);
      }

      // Tracking de funil
      trackOnce('first_simulation_started');
      trackOnce('first_questions_generated', { count: parsed.length });

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
      const msg = error?.response?.data?.message || 'Ainda não encontramos questões para esta matéria. Envie um PDF na Área de Estudos ou gere um lote de questões com a IA!';
      setStartError(msg);
    }
  });

  const autoStartedRef = useRef(false);
  useEffect(() => {
    const shouldAutoStart = searchParams.get('autoStart') === 'true' || searchParams.get('action') === 'generate';
    if (
      shouldAutoStart &&
      (selectedSubjectId || selectedExamPrepId) &&
      !autoStartedRef.current &&
      !simulationStarted &&
      !startSimulationMutation.isPending
    ) {
      autoStartedRef.current = true;
      startSimulationMutation.mutate({
        prepId: selectedExamPrepId ? Number(selectedExamPrepId) : undefined,
        subjId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
        count: questionCount,
      });
    }
  }, [selectedExamPrepId, selectedSubjectId, questionCount, searchParams, simulationStarted, startSimulationMutation]);

  const handleStartSimulation = () => {
    setStartError(null);
    setPartialWarning(null);
    startSimulationMutation.mutate({
      prepId: selectedExamPrepId ? Number(selectedExamPrepId) : undefined,
      subjId: selectedSubjectId ? Number(selectedSubjectId) : undefined,
      count: questionCount,
    });
  };

  const finishSimulationMutation = useMutation({
    mutationFn: async (payload: { id: number; answers: Record<number, string> }) => {
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
      queryClient.invalidateQueries({ queryKey: ['question-bank-summary', selectedSubjectId] });

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

  const handleSelectAnswer = (optionKey: string) => {
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

  const getFormatLabel = (fmt?: string) => {
    switch (fmt) {
      case 'TRUE_FALSE': return 'Certo ou Errado (estilo CESPE / Cebraspe)';
      case 'MULTIPLE_CHOICE_4': return 'Múltipla Escolha 4 alternativas (A–D)';
      case 'MULTIPLE_CHOICE_5': return 'Múltipla Escolha 5 alternativas (A–E)';
      case 'DISCURSIVE': return 'Discursiva';
      default: return 'Múltipla Escolha';
    }
  };

  const currentQuestion = questions[currentIdx];

  // Helper para verificar se a questão atual é Certo/Errado
  const isTrueFalseQuestion = (q?: Question) => {
    if (!q) return false;
    if (q.format === 'TRUE_FALSE') return true;
    if (q.alternatives && q.alternatives.length === 2) return true;
    if (q.options) {
      const keys = Object.keys(q.options);
      if (keys.length === 2) {
        const valA = (q.options.A || '').toUpperCase();
        if (valA === 'CERTO' || valA === 'VERDADEIRO') return true;
      }
    }
    return false;
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
        .count-selector-btn {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-tertiary);
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.85rem;
        }
        .count-selector-btn.active {
          border-color: var(--primary);
          background: var(--primary-glow);
          color: var(--primary);
        }
      `}</style>

      {/* Header */}
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '21px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '21px' }}>
            <Compass size={24} style={{ color: 'var(--warning)' }} />
            Simulado Cronometrado no Estilo da Prova
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>
            Questões servidas instantaneamente do Banco da Matéria no padrão detectado dos seus materiais
          </p>
        </div>
      </div>

      {!simulationStarted && !simulationCompleted ? (
        <div style={{ maxWidth: '680px', margin: '30px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <Clock size={48} style={{ color: 'var(--warning)', marginBottom: 'var(--space-sm)' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Simulado Cronometrado</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
              Treine sob pressão temporal com questões adaptadas ao padrão real dos seus materiais de estudo.
            </p>
          </div>

          {startError && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertCircle size={16} />
                <span style={{ fontWeight: 700 }}>Atenção</span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', lineHeight: 1.4 }}>{startError}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/workspace')}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  Ir para Área de Estudos e enviar PDF →
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowGenerateModal(true)}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  <Sparkles size={14} style={{ marginRight: '4px' }} />
                  Gerar questões com IA
                </button>
              </div>
            </div>
          )}

          {/* Seleção de Preparação de Prova */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>1. Preparação / Meta:</label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowWizard(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '3px 8px' }}
              >
                <Plus size={14} />
                <span>Nova Prova</span>
              </button>
            </div>

            {examPreps.length === 0 ? (
              <div style={{ padding: '20px 16px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Você ainda não cadastrou nenhuma prova alvo.
                </p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowWizard(true)}>
                  + Cadastrar Primeira Prova
                </button>
              </div>
            ) : (
              <select
                className="form-input"
                value={selectedExamPrepId}
                onChange={e => {
                  setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '');
                  setStartError(null);
                }}
              >
                <option value="">Todas as Preparações...</option>
                {examPreps.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            )}
          </div>

          {/* Seleção da Matéria */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '8px', fontWeight: 600 }}>2. Matéria de Estudo:</label>
            {availableSubjects.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Nenhuma matéria cadastrada. Crie matérias ou envie PDFs para gerar o banco de questões.
              </p>
            ) : (
              <select
                className="form-input"
                value={selectedSubjectId}
                onChange={e => {
                  setSelectedSubjectId(e.target.value ? Number(e.target.value) : '');
                  setStartError(null);
                }}
              >
                <option value="">Selecione uma matéria...</option>
                {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
              </select>
            )}
          </div>

          {/* Card do Perfil de Estilo e Banco de Questões da Matéria */}
          {selectedSubjectId && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      Banco de Questões: {bankSummary?.subjectName || 'Carregando...'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isLoadingSummary
                      ? 'Consultando disponibilidade...'
                      : `${bankSummary?.activeQuestions ?? 0} disponíveis para novo simulado (${bankSummary?.usedQuestions ?? 0} já resolvidas)`}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowGenerateModal(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '5px 10px' }}
                >
                  <Sparkles size={14} style={{ color: 'var(--warning)' }} />
                  <span>Gerar Mais</span>
                </button>
              </div>

              {/* Badge de Estilo Detectado */}
              {bankSummary?.styleProfile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  border: '1px solid var(--border-color)',
                }}>
                  <Layers size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <strong>Estilo detectado:</strong>{' '}
                    <span style={{ color: 'var(--primary)' }}>
                      {bankSummary.styleProfile.examBoard ? `${bankSummary.styleProfile.examBoard} — ` : ''}
                      {getFormatLabel(bankSummary.styleProfile.format)}
                    </span>
                    <span style={{ marginLeft: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      ({bankSummary.styleProfile.detectionSource === 'EXTRACTED_FROM_MATERIAL'
                        ? `${bankSummary.styleProfile.sampleExercisesFound} exercícios detectados no PDF`
                        : 'Padrão por tipo de prova'})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seletor de Quantidade de Questões */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ marginBottom: '8px', fontWeight: 600 }}>
              3. Quantidade de Questões:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[5, 10, 15, 20].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  className={`count-selector-btn ${questionCount === cnt ? 'active' : ''}`}
                  onClick={() => setQuestionCount(cnt)}
                >
                  {cnt} questões
                </button>
              ))}
            </div>
          </div>

          {/* Botão de Iniciar Simulado */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
            disabled={(!selectedExamPrepId && !selectedSubjectId) || startSimulationMutation.isPending}
            onClick={handleStartSimulation}
          >
            {startSimulationMutation.isPending ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                Carregando Simulado do Banco...
              </span>
            ) : (
              `Iniciar Simulado (${questionCount} Questões - 15 Minutos)`
            )}
          </button>
        </div>
      ) : simulationCompleted ? (
        <div style={{ maxWidth: '720px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
            <Award size={48} style={{ color: 'var(--warning)' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: 'var(--space-xs)' }}>Desempenho no Simulado</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Pontuação calculada sobre as {questions.length} questões respondidas
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-md)',
            backgroundColor: 'var(--bg-secondary)',
            padding: 'var(--space-md)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '21px'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Média de Acertos</span>
              <p style={{ fontSize: '32px', fontWeight: 900, color: 'var(--warning)' }}>{resultScore}%</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status da Prova</span>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginTop: 'var(--space-xs)' }}>Concluída</p>
            </div>
          </div>

          {/* Gabarito resumido com explicações */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Gabarito e Justificativas:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map((q, idx) => {
                const userAns = answers[idx];
                const isCorrect = userAns && (
                  userAns === q.correctAnswer ||
                  (userAns === 'CERTO' && q.correctAnswer === 'A') ||
                  (userAns === 'ERRADO' && q.correctAnswer === 'B') ||
                  (userAns === 'A' && q.correctAnswer === 'CERTO') ||
                  (userAns === 'B' && q.correctAnswer === 'ERRADO')
                );

                return (
                  <div key={idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Questão {idx + 1}</span>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isCorrect ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {isCorrect ? '✓ Acertou' : `✗ Errou (Gabarito: ${q.correctAnswer})`}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.84rem', margin: '0 0 6px 0' }}>{q.question}</p>
                    {q.explanation && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                        Justificativa: {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => {
              setSimulationCompleted(false);
              setSimulationStarted(false);
            }}
          >
            Voltar ao Menu
          </button>
        </div>
      ) : (
        <div className="simulation-grid">

          {/* Coluna Esquerda: Questão Ativa */}
          <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '440px' }}>
            <div>
              {/* Aviso suave se for simulado parcial */}
              {partialWarning && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: '6px',
                  color: '#eab308',
                  marginBottom: '16px',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                }}>
                  {partialWarning}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '21px' }}>
                <span className="badge badge-primary">
                  Questão {currentIdx + 1} de {questions.length}
                  {currentQuestion?.format ? ` • ${getFormatLabel(currentQuestion.format)}` : ''}
                </span>
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
                {currentQuestion?.question}
              </h3>

              {/* Renderização Dinâmica de Alternativas */}
              {isTrueFalseQuestion(currentQuestion) ? (
                /* Layout Certo / Errado com botões grandes */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
                  {(() => {
                    const ans = answers[currentIdx];
                    const isCerto = ans === 'CERTO' || ans === 'A' || ans === 'true';
                    const isErrado = ans === 'ERRADO' || ans === 'B' || ans === 'false';

                    return (
                      <>
                        <button
                          type="button"
                          className={`sim-option-btn ${isCerto ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer('CERTO')}
                          style={{
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            borderRadius: '12px',
                            borderWidth: '2px',
                            borderColor: isCerto ? 'var(--success)' : 'var(--border-color)',
                            backgroundColor: isCerto ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <CheckCircle2 size={36} style={{ color: isCerto ? 'var(--success)' : 'var(--text-secondary)' }} />
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isCerto ? 'var(--success)' : 'inherit' }}>
                            ✓ Certo
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`sim-option-btn ${isErrado ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer('ERRADO')}
                          style={{
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            borderRadius: '12px',
                            borderWidth: '2px',
                            borderColor: isErrado ? '#ef4444' : 'var(--border-color)',
                            backgroundColor: isErrado ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <XCircle size={36} style={{ color: isErrado ? '#ef4444' : 'var(--text-secondary)' }} />
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isErrado ? '#ef4444' : 'inherit' }}>
                            ✗ Errado
                          </span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* Layout de Múltipla Escolha Adaptável (4 ou 5 opções, sem 'E' fantasma) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {(() => {
                    let optionKeys: string[] = [];
                    if (currentQuestion?.options) {
                      optionKeys = Object.keys(currentQuestion.options);
                      if (currentQuestion.format === 'MULTIPLE_CHOICE_4') {
                        optionKeys = optionKeys.filter(k => k !== 'E');
                      }
                    } else if (currentQuestion?.alternatives) {
                      const letters = ['A', 'B', 'C', 'D', 'E'];
                      optionKeys = currentQuestion.alternatives.map((_, i) => letters[i] || `${i + 1}`);
                    } else {
                      optionKeys = ['A', 'B', 'C', 'D'];
                    }

                    return optionKeys.map((key, i) => {
                      const text = currentQuestion?.options ? currentQuestion.options[key] : currentQuestion?.alternatives?.[i];
                      const isSelected = answers[currentIdx] === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          className={`sim-option-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(key)}
                          style={{ textAlign: 'left', display: 'flex', alignItems: 'flex-start', padding: '12px 16px' }}
                        >
                          <span style={{ fontWeight: 800, marginRight: '10px', color: isSelected ? 'var(--primary)' : 'var(--text-secondary)' }}>
                            {key})
                          </span>
                          <span>{text}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
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

      {/* Modal de Geração de Questões com Progresso */}
      {showGenerateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sparkles size={22} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Gerar Questões no Estilo do Material</h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              A IA analisará os PDFs da matéria para extrair ou replicar o estilo exato das questões (banca, enunciados e alternativas) e salvará diretamente no seu Banco.
            </p>

            {jobError && (
              <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', marginBottom: '16px', fontSize: '0.84rem' }}>
                {jobError}
              </div>
            )}

            {activeJob ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {activeJob.status === 'DONE' ? (
                  <div>
                    <CheckCircle2 size={42} style={{ color: 'var(--success)', margin: '0 auto 12px auto' }} />
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: '8px' }}>
                      Lote Concluído!
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      {activeJob.generatedCount} novas questões foram adicionadas ao banco da matéria!
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setActiveJob(null);
                        setShowGenerateModal(false);
                      }}
                    >
                      OK, Fechar
                    </button>
                  </div>
                ) : activeJob.status === 'FAILED' ? (
                  <div>
                    <XCircle size={42} style={{ color: '#ef4444', margin: '0 auto 12px auto' }} />
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>
                      Falha na Geração
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      {activeJob.errorMessage || 'Ocorreu um erro durante o processamento do lote.'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setActiveJob(null);
                          setShowGenerateModal(false);
                        }}
                      >
                        Fechar
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={handleTriggerGeneration}
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 12px auto' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                      {activeJob.status === 'ANALYZING_STYLE' ? 'Analisando perfil de estilo...' : 'Gerando lote de questões...'}
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      {activeJob.generatedCount} de {activeJob.requestedCount} geradas
                    </p>
                    {/* Barra de progresso */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{
                        width: `${Math.round((activeJob.generatedCount / activeJob.requestedCount) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'var(--primary)',
                        transition: 'width 0.4s ease-out'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Você pode fechar esta tela, a geração continuará em segundo plano.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
                  Quantas questões deseja gerar neste lote?
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {[5, 10, 15].map(q => (
                    <button
                      key={q}
                      type="button"
                      className={`count-selector-btn ${generateQuantity === q ? 'active' : ''}`}
                      onClick={() => setGenerateQuantity(q)}
                    >
                      +{q} questões
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setShowGenerateModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={startJobMutation.isPending}
                    onClick={handleTriggerGeneration}
                  >
                    {startJobMutation.isPending ? 'Iniciando...' : 'Iniciar Geração'}
                  </button>
                </div>
              </div>
            )}
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
