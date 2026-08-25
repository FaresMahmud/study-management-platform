import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ExamPrep, Subject, Flashcard, Summary } from '../types';
import { Play, Pause, X, Sparkles, AlertTriangle, MessageSquare, BookOpen, Brain, RefreshCw, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';
import './FocusMode.css';

export default function FocusMode() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Estados Principais ────────────────────────────────────────────────
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  const [sessionDuration, setSessionDuration] = useState<25 | 50>(25);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1500); // 25 min default
  const [totalDuration, setTotalDuration] = useState(1500);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  
  // Status de Concentração
  const [isTabBlurred, setIsTabBlurred] = useState(false);
  const [focusWarnings, setFocusWarnings] = useState(0);

  // Painel de Estudo Ativo
  const [studyTab, setStudyTab] = useState<'flashcards' | 'summaries' | 'tutor'>('flashcards');

  // RAG Chat no Modo Foco
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'tutor'; text: string }>>([
    { sender: 'tutor', text: 'Estou aqui para tirar dúvidas enquanto você foca. Pergunte sobre seu material!' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Flashcards no Modo Foco
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Queries
  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['examPreps'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ content?: ExamPrep[] }>('/api/v1/exam-preps');
        return Array.isArray(response.data) ? response.data : (response.data.content || []);
      } catch {
        return [];
      }
    },
  });

  const activeExam = examPreps.find(e => e.status === 'ACTIVE') || examPreps[0];

  useEffect(() => {
    if (activeExam && selectedExamPrepId === '') {
      setTimeout(() => setSelectedExamPrepId(activeExam.id), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam]);

  // Busca de flashcards vinculados ao Exame
  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ['focus-flashcards', selectedExamPrepId],
    queryFn: async () => {
      if (!selectedExamPrepId) return [];
      const res = await apiClient.get<Flashcard[]>(`/api/flashcards`);
      // Filtra os que pertencem às matérias deste exame
      const examSubjects = (await apiClient.get<Subject[]>(`/api/subjects`)).data
        .filter(s => s.examPrepId === selectedExamPrepId)
        .map(s => s.id);
      return res.data.filter(f => f.subject && examSubjects.includes(f.subject.id));
    },
    enabled: isSessionActive && !!selectedExamPrepId && studyTab === 'flashcards',
  });

  // Busca de resumos vinculados ao Exame
  const { data: summaries = [] } = useQuery<Summary[]>({
    queryKey: ['focus-summaries', selectedExamPrepId],
    queryFn: async () => {
      if (!selectedExamPrepId) return [];
      const res = await apiClient.get<Summary[]>(`/api/summaries`);
      const examSubjects = (await apiClient.get<Subject[]>(`/api/subjects`)).data
        .filter(s => s.examPrepId === selectedExamPrepId)
        .map(s => s.id);
      return res.data.filter(s => s.subject && examSubjects.includes(s.subject.id));
    },
    enabled: isSessionActive && !!selectedExamPrepId && studyTab === 'summaries',
  });

  // ─── Handlers do Fluxo ────────────────────────────────────────────────
  // Sintetizador de Som Chime Dinâmico em Web Audio API
  const playChime = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (success) {
        // Melodia de Sucesso (Arpejo)
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.15 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + index * 0.15);
          osc.stop(ctx.currentTime + index * 0.15 + 0.4);
        });
      } else {
        // Alerta de perda de foco (Frequência baixa dissonante)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Silently fail if audio context not available
    }
  };

  // ─── Mutations backend ────────────────────────────────────────────────
  const startSessionMutation = useMutation({
    mutationFn: async (params: { examPrepId: number; duration: number }) => {
      return (await apiClient.post<{ id: number }>('/api/v1/pomodoro/start', null, {
        params: { examPrepId: params.examPrepId, duration: params.duration }
      })).data;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      setIsSessionActive(true);
      setIsRunning(true);
      triggerConfetti();
    }
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (params: { sessionId: number; contentConsumed: string }) => {
      return (await apiClient.post<{ success: boolean }>(`/api/v1/pomodoro/complete/${params.sessionId}`, {
        contentConsumed: params.contentConsumed
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      triggerConfetti();
      playChime(true); // Toca chime festivo
    }
  });

  const handleSessionFinish = () => {
    setIsRunning(false);
    if (currentSessionId) {
      completeSessionMutation.mutate({
        sessionId: currentSessionId,
        contentConsumed: JSON.stringify({
          durationMinutes: sessionDuration,
          warningsCount: focusWarnings,
          completedAt: new Date().toISOString()
        })
      });
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isSessionActive && isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isSessionActive) {
      setTimeout(() => handleSessionFinish(), 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, isRunning, timeLeft, handleSessionFinish]);

  // ─── Monitor de Foco (Blur e Atalhos) ──────────────────────────────────
  useEffect(() => {
    if (!isSessionActive) return;

    const handleBlur = () => {
      setIsTabBlurred(true);
      setFocusWarnings(w => w + 1);
      playChime(false); // Som de alerta curto
    };

    const handleFocus = () => {
      setIsTabBlurred(false);
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua sessão Pomodoro está em andamento. Deseja mesmo sair e perder seu progresso?';
      return e.returnValue;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.ctrlKey && e.key === 'w')) {
        e.preventDefault();
        alert('Modo Foco Ativo: Evite recarregar a página para não quebrar seu ritmo!');
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSessionActive]);

  const handleStart = () => {
    if (!selectedExamPrepId) return;
    const seconds = sessionDuration * 60;
    setTimeLeft(seconds);
    setTotalDuration(seconds);
    startSessionMutation.mutate({
      examPrepId: Number(selectedExamPrepId),
      duration: sessionDuration
    });
  };

  const handleGiveUp = () => {
    setIsSessionActive(false);
    setIsRunning(false);
    setTimeLeft(sessionDuration * 60);
    setTotalDuration(sessionDuration * 60);
    setCurrentSessionId(null);
    setFocusWarnings(0);
    setIsTabBlurred(false);
  };

  // RAG Chat Handler no Foco
  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedExamPrepId || chatLoading) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await apiClient.post('/api/v1/chat/ask', {
        examPrepId: Number(selectedExamPrepId),
        question: userMsg
      });
      setChatMessages(prev => [...prev, { sender: 'tutor', text: res.data.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { sender: 'tutor', text: 'Desculpe, tive um problema ao buscar no seu material de estudos.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Círculo SVG de contagem regressiva
  const strokeDashoffset = isSessionActive 
    ? 282.7 - (282.7 * timeLeft) / totalDuration 
    : 0;

  // ─── TELA INICIAL: ESCOLHA DE OBJETIVOS E INICIALIZAÇÃO ──────────────────
  if (!isSessionActive) {
    return (
      <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', padding: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '34px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: 'var(--space-md)', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: 'var(--space-md)' }}>
            <Headphones size={36} className="animate-pulse" />
          </div>
          
          <h2 style={{ fontSize: '21px', fontWeight: 900, marginBottom: '6px' }}>Modo Foco Pomodoro</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Bloqueie distrações, concentre-se nas suas matérias e registre suas sessões produtivas na base de dados.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', textAlign: 'left' }}>
            {/* Escolha do Objetivo */}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Objetivo Vinculado
              </label>
              <select 
                className="form-input" 
                style={{ width: '100%', margin: 0 }}
                value={selectedExamPrepId} 
                onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione um Objetivo...</option>
                {examPreps.map(e => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>

            {/* Duração da Sessão */}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                Tempo de Foco
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                {[
                  { label: '25 min (Foco) + 5 min', value: 25 },
                  { label: '50 min (Foco) + 10 min', value: 50 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`focus-option ${sessionDuration === opt.value ? 'focus-option--active' : ''}`}
                    onClick={() => setSessionDuration(opt.value as 25 | 50)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Iniciar */}
            <button
              className="btn btn-primary"
              disabled={!selectedExamPrepId || startSessionMutation.isPending}
              onClick={handleStart}
              style={{ padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}
            >
              <Play size={16} fill="currentColor" />
              <span>{startSessionMutation.isPending ? 'Iniciando...' : 'Iniciar Modo Foco'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA SECUNDÁRIA: RESULTADO COM CONFETES ─────────────────────────────
  if (completeSessionMutation.isSuccess) {
    return (
      <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', padding: 'var(--space-lg)', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '34px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: 'var(--space-md)', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', marginBottom: 'var(--space-md)' }}>
            <Sparkles size={36} />
          </div>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '6px' }}>Sessão Concluída! 🎉</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Parabéns! Você completou os {sessionDuration} minutos de foco ininterrupto com sucesso.
          </p>

          <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', textAlign: 'left', marginBottom: 'var(--space-lg)', fontSize: '13px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
              <span>Duração Total:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{sessionDuration} minutos</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Desvios de Foco (Aba inativa):</span>
              <strong style={{ color: focusWarnings === 0 ? 'var(--success)' : 'var(--warning)' }}>
                {focusWarnings} {focusWarnings === 1 ? 'alerta' : 'alertas'}
              </strong>
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: 'var(--space-sm)' }} onClick={() => navigate('/')}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── TELA ATIVA DE FOCO (IMERSIVA / FULLSCREEN OVERLAY) ───────────────────
  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#050507', 
      zIndex: 9999, 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: 'Inter, sans-serif',
      color: 'var(--text-primary)',
      padding: 'var(--space-lg)'
    }}>
      
      {/* Overlay de desfocagem/saída de tela */}
      {isTabBlurred && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundColor: 'rgba(5, 5, 7, 0.95)', 
          backdropFilter: 'blur(16px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-md)',
          textAlign: 'center',
          padding: 'var(--space-lg)'
        }}>
          <AlertTriangle size={48} className="text-warning animate-bounce" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>Atenção: Mantenha o Foco!</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '380px' }}>
            Você saiu da aba de estudos. O timer continua correndo! Volte imediatamente para manter seu ritmo de alto rendimento.
          </p>
        </div>
      )}

      {/* Barra de Status Topo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <div style={{ width: 'var(--space-xs)', height: 'var(--space-xs)', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Modo Foco Ativo • {activeExam?.title}
          </span>
        </div>
        <button 
          onClick={handleGiveUp}
          className="btn btn-secondary btn-sm" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
        >
          <X size={14} />
          <span>Desistir</span>
        </button>
      </div>

      {/* Conteúdo Principal Split (Esquerda: Timer / Direita: Estudo Ativo) */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 800 ? '340px 1fr' : '1fr', gap: '34px', flex: 1, overflow: 'hidden' }}>
        
        {/* LADO ESQUERDO: CONTROLE E CRONÔMETRO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-lg)', borderRight: window.innerWidth > 800 ? '1px solid var(--border-color)' : 'none', paddingRight: window.innerWidth > 800 ? '34px' : 0 }}>
          
          {/* Cronômetro Circular SVG */}
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="220" height="220" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r="45" stroke="#18181b" strokeWidth="3.5" fill="transparent" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                stroke="var(--primary)" 
                strokeWidth="4" 
                fill="transparent"
                strokeDasharray="282.7" 
                strokeDashoffset={strokeDashoffset} 
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }} 
              />
            </svg>
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '38px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatTimer(timeLeft)}
              </span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {isRunning ? 'Focando...' : 'Pausado'}
              </span>
            </div>
          </div>

          {/* Ações do Timer */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button 
              className={`btn ${isRunning ? 'btn-secondary' : 'btn-primary'}`} 
              onClick={() => setIsRunning(!isRunning)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: '10px 24px', fontWeight: 700 }}
            >
              {isRunning ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              <span>{isRunning ? 'Pausar' : 'Retomar'}</span>
            </button>
          </div>

          {/* Indicadores de perda de foco */}
          {focusWarnings > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', padding: '8px 16px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--error)', fontSize: '0.75rem' }}>
              <AlertTriangle size={14} />
              <span>{focusWarnings} {focusWarnings === 1 ? 'desvio' : 'desvios'} de atenção detectados!</span>
            </div>
          )}
        </div>

        {/* LADO DIREITO: HUB DE ESTUDO ATIVO (FLASHCARDS, RESUMOS E TUTOR) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflow: 'hidden' }}>
          
          {/* Navegação entre Ferramentas de Estudo */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-sm)' }}>
            <button 
              onClick={() => setStudyTab('flashcards')} 
              className={`btn btn-sm ${studyTab === 'flashcards' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Brain size={14} />
              <span>Revisar Flashcards ({flashcards.length})</span>
            </button>
            <button 
              onClick={() => setStudyTab('summaries')} 
              className={`btn btn-sm ${studyTab === 'summaries' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <BookOpen size={14} />
              <span>Ler Resumos ({summaries.length})</span>
            </button>
            <button 
              onClick={() => setStudyTab('tutor')} 
              className={`btn btn-sm ${studyTab === 'tutor' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MessageSquare size={14} />
              <span>Tutor Virtual RAG</span>
            </button>
          </div>

          {/* Renderização das Ferramentas */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
            
            {/* Flashcards Panel */}
            {studyTab === 'flashcards' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '260px', gap: '20px' }}>
                {flashcards.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum flashcard pendente para as matérias deste edital.</p>
                ) : (
                  <div style={{ maxWidth: '420px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    
                    {/* Card 3D Flip */}
                    <div 
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      style={{ 
                        perspective: '1000px', 
                        cursor: 'pointer', 
                        height: '180px',
                        width: '100%'
                      }}
                    >
                      <div style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%', 
                        textAlign: 'center', 
                        transition: 'transform 0.6s', 
                        transformStyle: 'preserve-3d',
                        transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}>
                        {/* FRENTE */}
                        <div style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          backgroundColor: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-md)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          padding: 'var(--space-lg)', 
                          backfaceVisibility: 'hidden',
                          fontSize: '15px',
                          fontWeight: 600,
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                          <div>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, display: 'block', marginBottom: 'var(--space-xs)' }}>Frente</span>
                            {flashcards[flashcardIndex]?.front}
                          </div>
                        </div>

                        {/* VERSO */}
                        <div style={{ 
                          position: 'absolute', 
                          inset: 0, 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--primary)', 
                          borderRadius: 'var(--radius-md)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          padding: 'var(--space-lg)', 
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          fontSize: '15px',
                          color: 'var(--text-primary)',
                          boxShadow: 'var(--shadow-md)'
                        }}>
                          <div>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700, display: 'block', marginBottom: 'var(--space-xs)' }}>Verso (Gabarito)</span>
                            {flashcards[flashcardIndex]?.back}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navegação Flashcards */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Card {flashcardIndex + 1} de {flashcards.length}
                      </span>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          disabled={flashcardIndex === 0}
                          onClick={() => { setFlashcardIndex(prev => prev - 1); setIsCardFlipped(false); }}
                        >
                          Anterior
                        </button>
                        <button 
                          className="btn className btn-secondary btn-sm"
                          disabled={flashcardIndex === flashcards.length - 1}
                          onClick={() => { setFlashcardIndex(prev => prev + 1); setIsCardFlipped(false); }}
                        >
                          Próximo
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Resumos Panel */}
            {studyTab === 'summaries' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {summaries.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-lg)' }}>
                    Nenhum resumo estruturado para leitura neste objetivo.
                  </p>
                ) : (
                  summaries.map(s => (
                    <div key={s.id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'var(--bg-tertiary)' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>{s.title}</h4>
                      <div 
                        style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: s.content }}
                      />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tutor Virtual RAG Panel */}
            {studyTab === 'tutor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', height: '320px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: 'var(--space-md)' }}>
                {/* Janela de Mensagens */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', paddingRight: '4px' }}>
                  {chatMessages.map((m, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                        background: m.sender === 'user' ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: m.sender === 'user' ? '#fff' : 'var(--text-primary)',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        maxWidth: '85%',
                        fontSize: '12.5px',
                        lineHeight: '1.5',
                        border: m.sender === 'user' ? 'none' : '1px solid var(--border-color)'
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Buscando no seu material...</span>
                    </div>
                  )}
                </div>

                {/* Formulário de Input */}
                <form onSubmit={handleChatSend} style={{ display: 'flex', gap: 'var(--space-xs)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, margin: 0, fontSize: '13px', padding: 'var(--space-xs)' }}
                    placeholder="Faça uma pergunta sobre o assunto..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    disabled={chatLoading}
                  />
                  <button type="submit" className="btn btn-primary" disabled={chatLoading} style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Enviar
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
