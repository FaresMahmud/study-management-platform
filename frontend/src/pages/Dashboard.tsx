import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Flame, Pause, Play, Share2, Sparkles, Square, Target, X } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import ActiveGoalsCard from '../components/ActiveGoalsCard';
import RecentSessionsCard from '../components/RecentSessionsCard';
import WeeklyFocusCard from '../components/WeeklyFocusCard';
import type { ExamPrep, Goal, StudySession, Subject } from '../types';
import { triggerConfetti } from '../utils/confetti';

export default function Dashboard() {
  const queryClient = useQueryClient();

  // ─── Timer State ───
  const [time, setTime] = useState(1500); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<any | null>(null);
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

  const { data: aiStatus } = useQuery<{ configured: boolean; textModel: string }>({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/ai/status');
      return response.data;
    },
  });

  // ─── Wizard & Sharing States ───
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [targetScore, setTargetScore] = useState(80);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // ─── ExamPrep Mutations ───
  const createExamPrepMutation = useMutation({
    mutationFn: async (newExam: { title: string; examDate: string; targetScore: number; status: string }) => {
      return (await apiClient.post<ExamPrep>('/api/v1/exam-preps', newExam)).data;
    },
    onSuccess: async (data) => {
      // Associa matérias selecionadas ao novo ExamPrep
      for (const subjId of selectedSubjects) {
        const subj = subjects.find(s => s.id === subjId);
        if (subj) {
          await apiClient.put(`/api/v1/subjects/${subjId}`, {
            subjectName: subj.subjectName,
            subjectDescription: subj.subjectDescription,
            color: subj.color,
            examPrepId: data.id
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['examPreps'] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setWizardOpen(false);
      setWizardStep(1);
      setExamTitle('');
      setSelectedSubjects([]);
      triggerConfetti();
    },
    onError: () => {
      alert('Erro ao criar preparação de exame.');
    }
  });

  const shareExamPrepMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await apiClient.post<ExamPrep>(`/api/v1/exam-preps/${id}/share`)).data;
    },
    onSuccess: (data) => {
      const link = `${window.location.origin}/public/share/${data.shareToken}`;
      setShareLink(link);
      setShareModalOpen(true);
      navigator.clipboard.writeText(link);
    },
    onError: () => {
      alert('Erro ao compartilhar preparação.');
    }
  });

  const revokeShareMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await apiClient.delete<ExamPrep>(`/api/v1/exam-preps/${id}/share`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examPreps'] });
      alert('Plano de estudos tornado privado.');
    }
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

  // ─── Chat Tutor State ───
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'tutor'; text: string; sources?: string[] }>>([
    { sender: 'tutor', text: 'Olá! Faça qualquer pergunta sobre as matérias e PDFs vinculados ao seu objetivo ativo. Responderei baseando-me exclusivamente no seu material!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !activeExam) return;

    const userText = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await apiClient.post<any>('/api/v1/chat/ask', {
        examPrepId: activeExam.id,
        question: userText
      });
      setChatMessages(prev => [...prev, {
        sender: 'tutor',
        text: response.data.answer || 'Não consegui formular uma resposta baseada no contexto fornecido.',
        sources: response.data.sources
      }]);
    } catch (err) {
      setChatMessages(prev => [...prev, {
        sender: 'tutor',
        text: 'Erro ao conectar ao tutor. Por favor, certifique-se de que fez o upload de arquivos PDF para o seu exame na área de estudos.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

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
  const completedGoals = goals.filter(g => (g.progress ?? 0) >= (g.objectiveHours ?? 0)).length;
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

  if (examPreps.length === 0 || wizardOpen) {
    return (
      <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 120px)', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '34px', position: 'relative', border: '1px solid var(--border-color)' }}>

          {examPreps.length > 0 && (
            <button className="modal-close" onClick={() => setWizardOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          )}

          {/* Wizard Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '21px', borderBottom: '1px solid var(--border-color)', paddingBottom: '13px' }}>
            <h2 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text-primary)' }}>🎯 Preparação para Prova</h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Passo {wizardStep} de 3</span>
          </div>

          {/* Steps Progress Indicator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '34px' }}>
            <div style={{ flex: 1, height: '4px', backgroundColor: wizardStep >= 1 ? 'var(--primary)' : 'var(--border-color)', borderRadius: '2px', transition: 'all 0.3s' }} />
            <div style={{ flex: 1, height: '4px', backgroundColor: wizardStep >= 2 ? 'var(--primary)' : 'var(--border-color)', borderRadius: '2px', transition: 'all 0.3s' }} />
            <div style={{ flex: 1, height: '4px', backgroundColor: wizardStep >= 3 ? 'var(--primary)' : 'var(--border-color)', borderRadius: '2px', transition: 'all 0.3s' }} />
          </div>

          {/* Step 1: Objetivo */}
          {wizardStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '21px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Qual prova você vai realizar?</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Dê um nome para sua meta (ex: ENEM 2026, Concurso PRF, OAB).</p>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Nome da Prova</label>
                <input type="text" className="form-input" style={{ width: '100%' }} placeholder="Ex: ENEM 2026" value={examTitle} onChange={e => setExamTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Data da Prova</label>
                <input type="date" className="form-input" style={{ width: '100%' }} value={examDate} onChange={e => setExamDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2: Meta de Domínio */}
          {wizardStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '21px', textAlign: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Qual é a sua meta de nota?</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Defina o percentual de acertos ideal para garantir sua aprovação.</p>
              </div>
              <div style={{ fontSize: '56px', fontWeight: 900, color: 'var(--primary)', margin: '13px 0', fontFamily: 'monospace' }}>
                {targetScore}%
              </div>
              <input type="range" min="30" max="100" value={targetScore} onChange={e => setTargetScore(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <div>
                <span className="badge" style={{ padding: '6px 16px', borderRadius: '15px', backgroundColor: targetScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: targetScore >= 80 ? 'var(--success)' : 'var(--warning)', fontSize: '12px', fontWeight: 700 }}>
                  {targetScore >= 80 ? 'Meta: Excelente (Alta Competitividade)' : 'Meta: Aprovado (Segurança)'}
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Vinculação de Matérias */}
          {wizardStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '21px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>Mapear matérias do edital</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selecione quais das matérias abaixo fazem parte do seu plano de estudos para esta prova.</p>
              </div>

              {subjects.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nenhuma matéria cadastrada no momento. Prossiga para criar seu objetivo e adicione matérias depois!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {subjects.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: selectedSubjects.includes(s.id) ? '1px solid var(--primary)' : '1px solid transparent', transition: 'all 0.2s' }}>
                      <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={() => {
                        setSelectedSubjects(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]);
                      }} />
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: s.color || 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{s.subjectName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wizard Footer Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '34px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            {wizardStep > 1 ? (
              <button className="btn btn-secondary" onClick={() => setWizardStep(prev => prev - 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronLeft size={16} />
                <span>Voltar</span>
              </button>
            ) : (
              examPreps.length > 0 ? (
                <button className="btn btn-secondary" onClick={() => setWizardOpen(false)}>
                  Cancelar
                </button>
              ) : <div />
            )}

            {wizardStep < 3 ? (
              <button className="btn btn-primary" disabled={wizardStep === 1 && !examTitle.trim()} onClick={() => setWizardStep(prev => prev + 1)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Avançar</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => createExamPrepMutation.mutate({ title: examTitle, examDate, targetScore, status: 'ACTIVE' })} disabled={createExamPrepMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {createExamPrepMutation.isPending ? 'Salvando...' : 'Salvar e Começar!'}
                <Check size={16} />
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ─── Render Active Dashboard View ───
  const activeExamGoals = goals.filter(g => g.examPrepId === activeExam?.id);
  const averageMastery = activeExamGoals.length > 0
    ? Math.round(activeExamGoals.reduce((sum, g) => sum + g.currentMastery, 0) / activeExamGoals.length)
    : 0;
  const strokeDashoffset = 251.2 - (251.2 * averageMastery) / 100;

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ─── TELA 1: HERO SECTION - POMODORO + EXAME ATIVO ─── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, hsla(258, 90%, 66%, 0.12), hsla(162, 72%, 45%, 0.06))',
        border: '1px solid hsla(258, 90%, 66%, 0.2)',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <span
            className="badge"
            style={{
              backgroundColor: aiStatus?.configured ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: aiStatus?.configured ? 'var(--success)' : 'var(--warning)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.02em'
            }}
          >
            Gemini {aiStatus?.configured ? 'ativo' : 'não configurado'}{aiStatus?.textModel ? ` · ${aiStatus.textModel}` : ''}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '34px', alignItems: 'center' }}>

          {/* COLUNA ESQUERDA: TIMER POMODORO */}
          <div style={{ borderRight: window.innerWidth > 768 ? '1px solid var(--border-color)' : 'none', paddingRight: window.innerWidth > 768 ? '24px' : 0 }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 800 }}>Sessão de Foco Ativa</span>
            <div style={{ fontSize: '56px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '4px 0', fontVariantNumeric: 'tabular-nums' }}>
              {formatTimer(time)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '13px', marginTop: '13px', flexWrap: 'wrap' }}>
              <select
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontSize: '13px', color: 'var(--text-primary)' }}
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecione a Matéria...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subjectName}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary btn-sm" onClick={toggleTimer} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {isRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isRunning ? 'Pausar' : 'Focar'}</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleCompleteSession} disabled={time === 1500} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Square size={10} />
                  <span>Concluir</span>
                </button>
                <Link to="/focus" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--primary)' }}>
                  <Sparkles size={11} />
                  <span>Modo Imersivo</span>
                </Link>
              </div>
            </div>

            {/* Indicadores de Pomodoro */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '13px' }}>
              {[1, 2, 3, 4, 5].map((dot) => (
                <div
                  key={dot}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: dot <= 3 ? 'var(--success)' : 'var(--border-color)',
                    boxShadow: dot <= 3 ? '0 0 6px var(--success)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>

          {/* COLUNA DIREITA: EXAME ATIVO & MAESTRIA */}
          {activeExam && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '21px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', fontWeight: 800 }}>Objetivo Ativo</span>
                  {activeExam.isPublic && (
                    <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontSize: '9px', padding: '1px 6px' }}>Público</span>
                  )}
                </div>
                <h3 style={{ fontSize: '21px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{activeExam.title}</h3>

                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} className="text-warning" />
                  {activeExam.daysRemaining !== undefined && activeExam.daysRemaining >= 0
                    ? `Faltam ${activeExam.daysRemaining} dias para a prova`
                    : `Prova concluída`
                  }
                </span>

                <div style={{ display: 'flex', gap: '8px', marginTop: '13px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => shareExamPrepMutation.mutate(activeExam.id)} disabled={shareExamPrepMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Share2 size={12} />
                    <span>{activeExam.isPublic ? 'Copiar Link' : 'Compartilhar'}</span>
                  </button>

                  {activeExam.isPublic && (
                    <button className="btn btn-secondary btn-sm" onClick={() => revokeShareMutation.mutate(activeExam.id)} disabled={revokeShareMutation.isPending} style={{ color: 'var(--text-muted)' }}>
                      Privar
                    </button>
                  )}

                  <button className="btn btn-secondary btn-sm" onClick={() => { setWizardOpen(true); setWizardStep(1); }} style={{ color: 'var(--primary)' }}>
                    Novo Objetivo
                  </button>
                </div>
              </div>

              {/* Círculo de Maestria Geral SVG */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <svg width="84" height="84" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="var(--border-color)" strokeWidth="8" fill="transparent" />
                  <circle cx="50" cy="50" r="40" stroke="var(--success)" strokeWidth="8" fill="transparent"
                    strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
                  <text x="50" y="56" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="bold">
                    {averageMastery}%
                  </text>
                </svg>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Maestria Geral</span>
              </div>
            </div>
          )}

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

      {/* ─── MODAL DE COMPARTILHAMENTO DE EXAME ─── */}
      {shareModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)' }}>
          <div className="modal-content" style={{ maxWidth: '480px', padding: '24px', textAlign: 'center', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                <Share2 size={32} />
              </div>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Plano Compartilhado com Sucesso!</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 16px', lineHeight: 1.4 }}>
              O link público para este plano de estudos foi copiado para a sua área de transferência. Qualquer pessoa poderá acessá-lo.
            </p>
            <input type="text" className="form-input" readOnly value={shareLink} style={{ textAlign: 'center', width: '100%', marginBottom: '21px', background: 'var(--bg-tertiary)' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                navigator.clipboard.writeText(shareLink);
                alert('Link copiado!');
              }}>
                Copiar Novamente
              </button>
              <button className="btn btn-secondary" onClick={() => setShareModalOpen(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHAT FLUTUANTE DO TUTOR INTELIGENTE ─── */}
      <div style={{ position: 'fixed', bottom: '34px', right: '34px', zIndex: 999 }}>
        {!chatOpen ? (
          <button
            onClick={() => setChatOpen(true)}
            style={{
              backgroundColor: 'var(--ai)',
              color: 'white',
              borderRadius: '50px',
              padding: '13px 21px',
              border: 'none',
              boxShadow: '0 8px 34px rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'transform 0.2s',
              animation: 'pulse 2s infinite'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Sparkles size={18} />
            <span>Perguntar ao Tutor</span>
          </button>
        ) : (
          <div className="card animate-fadeIn" style={{ width: '380px', height: '480px', display: 'flex', flexDirection: 'column', padding: 0, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '4px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--ai)', display: 'flex' }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Tutor Virtual IA</h4>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Respondendo via RAG</span>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages List */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.sender === 'tutor' ? '4px' : '16px',
                    backgroundColor: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    border: msg.sender === 'tutor' ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                      Fonte: {msg.sources.join(', ')}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: '16px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Tutor digitando...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', backgroundColor: 'var(--bg-tertiary)' }}>
              <input
                type="text"
                className="form-input"
                placeholder={activeExam ? "Pergunte algo sobre seus PDFs..." : "Crie um objetivo para perguntar"}
                disabled={!activeExam || chatLoading}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                style={{ flex: 1, margin: 0, fontSize: '13px', height: '36px' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!activeExam || !chatInput.trim() || chatLoading}
                style={{ padding: '0 16px', height: '36px', minWidth: 'auto', margin: 0 }}
              >
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
