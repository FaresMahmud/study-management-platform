import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bold,
  BookOpen,
  Brain,
  Check,
  CloudRain,
  Code,
  Coffee,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  Timer,
  Trash2,
  Underline,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient, normalizeListResponse } from '../api/client';
import type { SpringPage, Subject, Summary } from '../types';
import { triggerConfetti } from '../utils/confetti';

export default function Summaries() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const routeState = location.state as { activeSummaryId?: number } | null;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [activeSummaryId, setActiveSummaryId] = useState<number | null>(
    routeState?.activeSummaryId ?? null
  );

  // Sync activeSummaryId when route state changes (e.g. user clicks another summary from subjects page)
  useEffect(() => {
    if (routeState?.activeSummaryId) {
      setTimeout(() => setActiveSummaryId(routeState.activeSummaryId ?? null), 0);
    }
  }, [routeState]);

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSubjectId, setEditorSubjectId] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEditingRef = useRef(false); // Evita loop de atualização de estado no contentEditable

  // Zen Mode & Focus Panel State
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFocusPanelOpen, setIsFocusPanelOpen] = useState(false);

  // Pomodoro State
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60); // 25 min
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroType, setPomodoroType] = useState<'study' | 'break'>('study');

  // Ambient Audio State
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'white'>('none');
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioFilterRef = useRef<BiquadFilterNode | null>(null);

  // Flashcard from Selection State
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [flashcardError, setFlashcardError] = useState('');

  const createFlashcardMutation = useMutation({
    mutationFn: async (newCard: { front: string; back: string; subjectId: number; summaryId?: number }) => {
      return (await apiClient.post<{ id: number }>('/api/flashcards', newCard)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
      triggerConfetti();
      setFlashcardModalOpen(false);
      setFlashcardFront('');
      setFlashcardBack('');
      setFlashcardError('');
      alert('Flashcard criado com sucesso! 🎉');
    },
    onError: () => {
      setFlashcardError('Erro ao criar flashcard.');
    }
  });

  const handleCreateFlashcardFromSelection = () => {
    if (!activeSummary) {
      alert('Selecione ou crie um resumo primeiro.');
      return;
    }
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText) {
      alert('Selecione uma palavra ou frase no seu texto do resumo para preencher a frente do flashcard!');
      return;
    }

    setFlashcardFront(selectedText);
    setFlashcardBack('');
    setFlashcardError('');
    setFlashcardModalOpen(true);
  };

  const handleSaveFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcardFront.trim() || !flashcardBack.trim()) {
      setFlashcardError('Ambos os campos da frente e do verso são obrigatórios.');
      return;
    }
    if (!activeSummary) return;

    createFlashcardMutation.mutate({
      front: flashcardFront,
      back: flashcardBack,
      subjectId: activeSummary.subject.id,
      summaryId: activeSummary.id
    });
  };

  // Sync Zen Mode to Body class (to hide global Navbar)
  useEffect(() => {
    if (isZenMode) {
      document.body.classList.add('zen-mode-active');
    } else {
      document.body.classList.remove('zen-mode-active');
    }
    return () => {
      document.body.classList.remove('zen-mode-active');
    };
  }, [isZenMode]);

  // Pomodoro countdown logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (pomodoroActive && pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(t => {
          if (t <= 1) {
            handlePomodoroFinished();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroActive, pomodoroTime]);

  const enviarNotificacao = (titulo: string, corpo: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(titulo, { body: corpo });
      } catch {
        // Ignore notification errors
      }
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const handlePomodoroFinished = () => {
    setPomodoroActive(false);
    playBeepNotification();
    triggerConfetti();

    if (pomodoroType === 'study') {
      enviarNotificacao('Hora da Pausa! ☕', 'Sua sessão de foco de 25m terminou. Descanse por 5 minutos.');
      alert('Sessão de foco concluída! Hora de um descanso de 5 minutos.');
      setPomodoroType('break');
      setPomodoroTime(5 * 60);
    } else {
      enviarNotificacao('Hora de Voltar ao Foco! 📚', 'Seu tempo de descanso terminou. Pronto para focar novamente?');
      alert('Descanso concluído! Pronto para mais uma sessão de foco?');
      setPomodoroType('study');
      setPomodoroTime(25 * 60);
    }
  };

  const playBeepNotification = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 523.25; // C5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch {
      // Ignore audio errors
    }
  };

  // Synthesize rain/white noise using Web Audio API (highly lightweight & offline friendly)
  const startAmbientSound = (type: 'rain' | 'white') => {
    stopAmbientSound();
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Generate pinkish-white noise using deterministic pseudo-random
      let lastOut = 0.0;
      let seed = 123456; // Fixed seed for deterministic generation
      for (let i = 0; i < bufferSize; i++) {
        // Simple linear congruential generator for deterministic pseudo-random
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        const white = (seed / 4294967296) * 2 - 1;
        // Simple filter to make white noise sound more like pink/brown noise (deeper)
        output[i] = (lastOut * 0.9 + white * 0.1);
        lastOut = output[i];
      }

      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      audioSourceRef.current = whiteNoise;

      const filter = audioCtx.createBiquadFilter();
      audioFilterRef.current = filter;

      if (type === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Muffled rain
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 850; // Ocean/White noise
      }

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.12; // Muted focus volume

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      whiteNoise.start();
    } catch (e) {
      console.error('Error starting ambient noise:', e);
    }
  };

  const stopAmbientSound = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch {
        // Ignore audio errors
      }
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // Ignore audio errors
      }
      audioCtxRef.current = null;
    }
  };

  const handleAmbientSoundToggle = (type: 'rain' | 'white' | 'none') => {
    setAmbientSound(type);
    if (type === 'none') {
      stopAmbientSound();
    } else {
      startAmbientSound(type);
    }
  };

  // Stop sounds if navigating away
  useEffect(() => {
    return () => {
      stopAmbientSound();
    };
  }, []);

  const formatarPomodoroTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Queries
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient.get<SpringPage<Subject>>('/api/subjects?size=1000');
      return normalizeListResponse<Subject>(res.data);
    },
  });

  const { data: summaries = [] } = useQuery<Summary[]>({
    queryKey: ['summaries'],
    queryFn: async () => {
      const res = await apiClient.get<SpringPage<Summary>>('/api/summaries?size=1000');
      return normalizeListResponse<Summary>(res.data);
    },
  });

  // Active Summary computation
  const activeSummary = summaries.find(s => s.id === activeSummaryId);

  // Auto-fill editor when active summary changes
  useEffect(() => {
    if (activeSummary && !isEditingRef.current) {
      setEditorTitle(activeSummary.title);
      setEditorSubjectId(activeSummary.subject.id);
      if (editorRef.current) {
        editorRef.current.innerHTML = activeSummary.content;
      }
      setUltimoSalvo(new Date(activeSummary.lastModifiedDate || activeSummary.creationDate).toLocaleTimeString());
    } else if (!activeSummaryId) {
      setTimeout(() => {
        setEditorTitle('');
        setEditorSubjectId('');
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }, 0);
    }
  }, [activeSummaryId, activeSummary]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newSummary: { title: string; content: string; subjectId: number }) => {
      return (await apiClient.post<Summary>('/api/summaries', newSummary)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      setActiveSummaryId(data.id);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updated: { id: number; title: string; content: string; subjectId: number }) => {
      return (await apiClient.put<Summary>(`/api/summaries/${updated.id}`, updated)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      setUltimoSalvo(new Date().toLocaleTimeString());
      setSalvando(false);
    },
    onError: () => {
      setSalvando(false);
      alert('Erro ao salvar resumo automaticamente.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/api/summaries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      setActiveSummaryId(null);
    }
  });

  // Auto-save logic
  const triggerAutoSave = (newTitle: string, newSubjectId: number | '', newContent: string) => {
    if (!activeSummaryId || newSubjectId === '') return;

    setSalvando(true);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate({
        id: activeSummaryId,
        title: newTitle,
        content: newContent,
        subjectId: Number(newSubjectId)
      });
    }, 1200); // Salva após 1.2s de inatividade
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditorTitle(val);
    isEditingRef.current = true;
    triggerAutoSave(val, editorSubjectId, editorRef.current?.innerHTML || '');
  };

  const handleSubjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : '';
    setEditorSubjectId(val);
    isEditingRef.current = true;
    triggerAutoSave(editorTitle, val, editorRef.current?.innerHTML || '');
  };

  const handleEditorInput = () => {
    isEditingRef.current = true;
    triggerAutoSave(editorTitle, editorSubjectId, editorRef.current?.innerHTML || '');
  };

  // Rich Text Commands
  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleEditorInput();
    }
  };

  const handleCreate = () => {
    if (subjects.length === 0) {
      alert('Crie pelo menos uma matéria antes de adicionar resumos.');
      return;
    }
    // Associa à matéria ativa no filtro se possível, ou à primeira matéria
    let targetSubjId = subjects[0].id;
    if (selectedSubjectId !== 'all') {
      targetSubjId = Number(selectedSubjectId);
    }

    isEditingRef.current = false;
    createMutation.mutate({
      title: 'Resumo sem título',
      content: 'Comece a escrever seu resumo aqui...',
      subjectId: targetSubjId
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('Deseja realmente excluir este resumo?')) {
      deleteMutation.mutate(id);
    }
  };

  // Filter summaries by sidebar selection
  const filteredSummaries = summaries.filter(s => {
    if (selectedSubjectId === 'all') return true;
    return s.subject.id.toString() === selectedSubjectId;
  });

  // Extract clean text preview from HTML content
  const getPreviewText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.substring(0, 75) + (text.length > 75 ? '...' : '');
  };

  return (
    <div className={`summaries-container ${isZenMode ? 'zen-active' : ''}`}>
      {/* 1. Sidebar de Organização */}
      <div className="summaries-sidebar">
        <div className="sidebar-header">
          <h2>Resumos</h2>
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>
            <Plus size={16} />
            <span>Novo</span>
          </button>
        </div>

        {/* Lista de Matérias (Pastas) */}
        <div className="sidebar-section">
          <h3>Matérias</h3>
          <div className="sidebar-list">
            <button
              className={`sidebar-item ${selectedSubjectId === 'all' ? 'active' : ''}`}
              onClick={() => { setSelectedSubjectId('all'); setActiveSummaryId(null); isEditingRef.current = false; }}
            >
              <BookOpen size={16} />
              <span>Todas</span>
              <span className="badge-count">{summaries.length}</span>
            </button>

            {subjects.map(sub => {
              const count = summaries.filter(s => s.subject.id === sub.id).length;
              return (
                <button
                  key={sub.id}
                  className={`sidebar-item ${selectedSubjectId === sub.id.toString() ? 'active' : ''}`}
                  onClick={() => { setSelectedSubjectId(sub.id.toString()); setActiveSummaryId(null); isEditingRef.current = false; }}
                >
                  <span className="color-dot" style={{ backgroundColor: sub.color || 'var(--primary)' }} />
                  <span>{sub.subjectName}</span>
                  <span className="badge-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Resumos no Filtro Selecionado */}
        <div className="sidebar-section border-top">
          <h3>Documentos</h3>
          <div className="documents-list">
            {filteredSummaries.length === 0 ? (
              <p className="empty-text">Nenhum resumo nesta pasta.</p>
            ) : (
              filteredSummaries.map(s => (
                <div
                  key={s.id}
                  className={`document-card ${activeSummaryId === s.id ? 'active' : ''}`}
                  onClick={() => { setActiveSummaryId(s.id); isEditingRef.current = false; }}
                >
                  <div className="doc-title">{s.title || 'Sem título'}</div>
                  <div className="doc-preview">{getPreviewText(s.content)}</div>
                  <div className="doc-meta">
                    <span
                      className="subject-tag"
                      style={{ color: s.subject.color || 'var(--primary)' }}
                    >
                      {s.subject.subjectName}
                    </span>
                    <button
                      className="btn-delete-doc"
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 2. Área do Editor Notion-style */}
      <div className="summaries-editor-pane">
        {activeSummary ? (
          <div className="editor-wrapper">
            {/* Cabeçalho do Editor (Metadados, Modo Zen, Pomodoro e Auto-save) */}
            <div className="editor-header">
              <div className="meta-inputs">
                <select
                  className="subject-select"
                  value={editorSubjectId}
                  onChange={handleSubjectChange}
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subjectName}
                    </option>
                  ))}
                </select>

                {salvando ? (
                  <span className="save-status saving">
                    <RefreshCw size={12} className="spin" />
                    Salvando...
                  </span>
                ) : (
                  ultimoSalvo && (
                    <span className="save-status saved">
                      <Check size={12} />
                      Salvo às {ultimoSalvo}
                    </span>
                  )
                )}
              </div>

              {/* Controles de Foco (Modo Zen e Pomodoro) */}
              <div className="editor-header-controls">
                <button
                  type="button"
                  className={`control-btn ${isZenMode ? 'active' : ''}`}
                  onClick={() => setIsZenMode(!isZenMode)}
                  title={isZenMode ? "Sair do Modo Zen" : "Ativar Modo Zen (Foco Total)"}
                >
                  {isZenMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  <span>{isZenMode ? "Modo Normal" : "Modo Zen"}</span>
                </button>

                <button
                  type="button"
                  className={`control-btn ${isFocusPanelOpen ? 'active' : ''}`}
                  onClick={() => setIsFocusPanelOpen(!isFocusPanelOpen)}
                  title="Menu de Foco e Pomodoro"
                >
                  <Timer size={15} />
                  <span>Sessão de Foco</span>
                </button>
              </div>
            </div>

            {/* Input de Título */}
            <input
              type="text"
              className="editor-title-input"
              placeholder="Digite o título do resumo..."
              value={editorTitle}
              onChange={handleTitleChange}
            />

            {/* Barra de Ferramentas Notion-style */}
            <div className="editor-toolbar">
              <button
                type="button"
                className="toolbar-btn"
                title="Negrito"
                onClick={() => executeCommand('bold')}
              >
                <Bold size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Itálico"
                onClick={() => executeCommand('italic')}
              >
                <Italic size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Sublinhado"
                onClick={() => executeCommand('underline')}
              >
                <Underline size={16} />
              </button>

              <div className="toolbar-separator" />

              <button
                type="button"
                className="toolbar-btn"
                title="Título 1"
                onClick={() => executeCommand('formatBlock', '<h1>')}
              >
                <Heading1 size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Título 2"
                onClick={() => executeCommand('formatBlock', '<h2>')}
              >
                <Heading2 size={16} />
              </button>

              <div className="toolbar-separator" />

              <button
                type="button"
                className="toolbar-btn"
                title="Lista com Marcadores"
                onClick={() => executeCommand('insertUnorderedList')}
              >
                <List size={16} />
              </button>

              <button
                type="button"
                className="toolbar-btn"
                title="Citação"
                onClick={() => executeCommand('formatBlock', '<blockquote>')}
              >
                <Quote size={16} />
              </button>
              <button
                type="button"
                className="toolbar-btn"
                title="Bloco de Código"
                onClick={() => executeCommand('formatBlock', '<pre>')}
              >
                <Code size={16} />
              </button>

              <div className="toolbar-separator" />

              {/* Cores Rápidas */}
              <button
                type="button"
                className="toolbar-btn text-color-btn"
                title="Texto Vermelho"
                onClick={() => executeCommand('foreColor', '#ef4444')}
                style={{ color: '#ef4444' }}
              >
                A
              </button>
              <button
                type="button"
                className="toolbar-btn text-color-btn"
                title="Texto Verde"
                onClick={() => executeCommand('foreColor', '#10b981')}
                style={{ color: '#10b981' }}
              >
                A
              </button>
              <button
                type="button"
                className="toolbar-btn text-color-btn"
                title="Texto Azul"
                onClick={() => executeCommand('foreColor', '#6366f1')}
                style={{ color: '#6366f1' }}
              >
                A
              </button>
              <button
                type="button"
                className="toolbar-btn text-color-btn"
                title="Cor Padrão (Branco)"
                onClick={() => executeCommand('foreColor', '#f8fafc')}
                style={{ color: '#f8fafc' }}
              >
                A
              </button>

              <div className="toolbar-separator" />

              <button
                type="button"
                className="toolbar-btn"
                title="Criar Flashcard a partir da Seleção"
                onClick={handleCreateFlashcardFromSelection}
                style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '0 8px' }}
              >
                <Brain size={15} />
                <span style={{ fontSize: '0.75rem' }}>+ Card</span>
              </button>
            </div>

            {/* Área de Edição contentEditable */}
            <div
              ref={editorRef}
              className="editor-content-area"
              contentEditable
              onInput={handleEditorInput}
              onFocus={() => { isEditingRef.current = true; }}
              onBlur={() => { isEditingRef.current = false; }}
              data-placeholder="Comece a digitar seu resumo estilo Notion aqui..."
            />
          </div>
        ) : (
          <div className="editor-empty-state">
            <FileText size={64} className="empty-icon animate-pulse" />
            <h2>Nenhum resumo selecionado</h2>
            <p>Selecione um documento na barra lateral ou crie um novo para começar a escrever.</p>
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={20} />
              <span>Criar Novo Resumo</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Painel de Foco e Pomodoro (Direita) */}
      {isFocusPanelOpen && activeSummary && (
        <div className="summaries-focus-panel">
          <div className="focus-panel-header">
            <h3>Sessão de Foco</h3>
            <button className="btn-close-focus" onClick={() => setIsFocusPanelOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {/* Pomodoro Widget */}
          <div className="focus-widget pomodoro-widget">
            <div className="widget-icon">
              {pomodoroType === 'study' ? <Timer size={24} className="text-primary" /> : <Coffee size={24} className="text-success" />}
            </div>
            <h4>{pomodoroType === 'study' ? 'Hora de Focar' : 'Hora de Descansar'}</h4>
            <div className="pomodoro-timer">{formatarPomodoroTime(pomodoroTime)}</div>

            <div className="pomodoro-controls">
              <button
                type="button"
                className={`btn btn-${pomodoroActive ? 'secondary' : 'primary'} btn-sm`}
                onClick={() => { requestNotificationPermission(); setPomodoroActive(!pomodoroActive); }}
              >
                {pomodoroActive ? <Pause size={14} /> : <Play size={14} />}
                <span>{pomodoroActive ? 'Pausar' : 'Iniciar'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setPomodoroActive(false); setPomodoroTime(pomodoroType === 'study' ? 25 * 60 : 5 * 60); }}
                title="Reiniciar"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="pomodoro-types">
              <button
                type="button"
                className={`type-btn ${pomodoroType === 'study' ? 'active' : ''}`}
                onClick={() => { setPomodoroActive(false); setPomodoroType('study'); setPomodoroTime(25 * 60); }}
              >
                Estudo (25m)
              </button>
              <button
                type="button"
                className={`type-btn ${pomodoroType === 'break' ? 'active' : ''}`}
                onClick={() => { setPomodoroActive(false); setPomodoroType('break'); setPomodoroTime(5 * 60); }}
              >
                Pausa (5m)
              </button>
            </div>
          </div>

          {/* Sons de Foco Widget */}
          <div className="focus-widget audio-widget">
            <h4>Isolamento Acústico</h4>
            <p className="widget-desc">Sons suaves gerados pelo navegador para focar e acalmar.</p>

            <div className="audio-options">
              <button
                type="button"
                className={`audio-btn ${ambientSound === 'none' ? 'active' : ''}`}
                onClick={() => handleAmbientSoundToggle('none')}
              >
                <VolumeX size={14} />
                <span>Silêncio</span>
              </button>

              <button
                type="button"
                className={`audio-btn ${ambientSound === 'rain' ? 'active' : ''}`}
                onClick={() => handleAmbientSoundToggle('rain')}
              >
                <CloudRain size={14} />
                <span>Chuva</span>
              </button>

              <button
                type="button"
                className={`audio-btn ${ambientSound === 'white' ? 'active' : ''}`}
                onClick={() => handleAmbientSoundToggle('white')}
              >
                <Volume2 size={14} />
                <span>Ruído</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CRIAR FLASHCARD A PARTIR DE SELEÇÃO ================= */}
      {flashcardModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }} role="dialog" aria-modal="true" aria-labelledby="fc-modal-title">
            <button className="modal-close" onClick={() => setFlashcardModalOpen(false)} aria-label="Fechar">
              <X size={18} />
            </button>
            <h2 className="modal-title" id="fc-modal-title">Criar Flashcard</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Transforme este trecho de texto em uma pergunta e resposta de revisão rápida.
            </p>

            {flashcardError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
                {flashcardError}
              </div>
            )}

            <form onSubmit={handleSaveFlashcard}>
              <div className="form-group">
                <label className="form-label" htmlFor="fc-subject">Matéria Associada</label>
                <input
                  type="text"
                  id="fc-subject"
                  className="form-input"
                  value={activeSummary?.subject.subjectName || ''}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fc-front">Frente / Pergunta (Trecho Selecionado)</label>
                <textarea
                  id="fc-front"
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Ex: O que é...?"
                  value={flashcardFront}
                  onChange={e => setFlashcardFront(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="fc-back">Verso / Resposta</label>
                <textarea
                  id="fc-back"
                  className="form-input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="Ex: É o processo pelo qual..."
                  value={flashcardBack}
                  onChange={e => setFlashcardBack(e.target.value)}
                  maxLength={1000}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setFlashcardModalOpen(false)}>Cancelar</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createFlashcardMutation.isPending}
                >
                  {createFlashcardMutation.isPending ? 'Criando...' : 'Criar Flashcard'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
