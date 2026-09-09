import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client';
import { track } from '../utils/analytics';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_SUBJECTS = [
  { name: 'Matemática', color: '#6366f1' },
  { name: 'Português', color: '#10b981' },
  { name: 'Biologia', color: '#14b8a6' },
  { name: 'Física', color: '#3b82f6' },
  { name: 'Química', color: '#f59e0b' },
  { name: 'História', color: '#8b5cf6' },
  { name: 'Geografia', color: '#06b6d4' },
  { name: 'Inglês', color: '#ec4899' },
];

const COLOR_PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#3b82f6'
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  // Step: 0 = Prova, 1 = Matérias, 2 = Primeiro PDF
  const [step, setStep] = useState(0);

  // Step 1: Prova
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [targetScore, setTargetScore] = useState(80);
  const [examPrepId, setExamPrepId] = useState<number | null>(null);

  // Step 2: Matérias
  const [selectedSubjects, setSelectedSubjects] = useState<{ name: string; color: string }[]>([
    { name: 'Matemática', color: '#6366f1' },
    { name: 'Português', color: '#10b981' }
  ]);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [createdSubjectIds, setCreatedSubjectIds] = useState<number[]>([]);

  // Step 3: PDF Upload
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);

  // Status de loading e erro
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTrackedStart = useRef(false);

  // ─── Analytics: onboarding_started e onboarding_step_viewed ────────────
  useEffect(() => {
    if (isOpen) {
      if (!hasTrackedStart.current) {
        hasTrackedStart.current = true;
        track('onboarding_started');
      }
      track('onboarding_step_viewed', { step: step + 1 });
    }
  }, [isOpen, step]);

  // ─── Tecla ESC para fechar salvando ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, examTitle, examDate, targetScore, selectedSubjects, examPrepId, createdSubjectIds]);

  if (!isOpen) return null;

  const handleFinishOnboarding = () => {
    track('onboarding_completed', {
      created_exam: Boolean(examPrepId || examTitle.trim()),
      subjects_count: selectedSubjects.length,
      uploaded_pdf: uploadSuccess
    });
    localStorage.setItem('study_onboarded', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
    localStorage.setItem('show_onboarding_welcome', 'true');
    onClose();
  };

  const handleDismiss = () => {
    track('onboarding_dismissed', { last_step: step + 1 });
    localStorage.setItem('study_onboarded', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
    localStorage.setItem('onboarding_dismissed_at', new Date().toISOString());

    // Se o usuário já preencheu a prova mas ainda não clicou em Avançar, salva em background
    if (step === 0 && examTitle.trim() && !examPrepId) {
      const dateToUse = examDate.trim() || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      apiClient.post('/api/v1/exam-preps', {
        title: examTitle.trim(),
        examDate: dateToUse,
        targetScore,
        status: 'ACTIVE'
      }).catch(() => {});
    }

    // Se está no passo 1 e não salvou matérias ainda, salva em background
    if (step === 1 && createdSubjectIds.length === 0 && selectedSubjects.length > 0) {
      selectedSubjects.forEach(s => {
        apiClient.post<{ id: number }>('/api/subjects', { subjectName: s.name, color: s.color }).then(res => {
          if (examPrepId && res.data?.id) {
            apiClient.put(`/api/v1/subjects/${res.data.id}`, { subjectName: s.name, examPrepId }).catch(() => {});
          }
        }).catch(() => {});
      });
    }

    onClose();
  };

  // ─── ETAPA 1: Criar ExamPrep ─────────────────────────────────────────
  const handleNextStep1 = async () => {
    if (!examTitle.trim()) {
      setErrorMessage('Por favor, informe o nome da prova ou objetivo.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Backend exige examDate não nula (@NotNull). Se omitida, default de 6 meses
      const dateToUse = examDate.trim() || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await apiClient.post('/api/v1/exam-preps', {
        title: examTitle.trim(),
        examDate: dateToUse,
        targetScore,
        status: 'ACTIVE'
      });

      if (res.data?.id) {
        setExamPrepId(res.data.id);
      }

      setStep(1);
    } catch (err: unknown) {
      console.error('Erro ao criar plano de estudos:', err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(axiosErr.response?.data?.message || 'Erro ao salvar a prova. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ─── ETAPA 2: Criar Matérias ──────────────────────────────────────────
  const toggleCommonSubject = (subj: { name: string; color: string }) => {
    const exists = selectedSubjects.some(s => s.name.toLowerCase() === subj.name.toLowerCase());
    if (exists) {
      setSelectedSubjects(selectedSubjects.filter(s => s.name.toLowerCase() !== subj.name.toLowerCase()));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectName.trim()) return;
    const exists = selectedSubjects.some(s => s.name.toLowerCase() === customSubjectName.trim().toLowerCase());
    if (!exists) {
      setSelectedSubjects([...selectedSubjects, { name: customSubjectName.trim(), color: customColor }]);
    }
    setCustomSubjectName('');
  };

  const handleNextStep2 = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const ids: number[] = [];
      const subjectsToCreate = selectedSubjects.length > 0
        ? selectedSubjects
        : [{ name: 'Geral', color: '#6366f1' }];

      for (const s of subjectsToCreate) {
        try {
          const res = await apiClient.post<{ id: number }>('/api/subjects', {
            subjectName: s.name,
            color: s.color
          });
          if (res.data?.id) {
            ids.push(res.data.id);
            if (examPrepId) {
              try {
                await apiClient.put(`/api/v1/subjects/${res.data.id}`, {
                  subjectName: s.name,
                  examPrepId
                });
              } catch {
                // Ignore
              }
            }
          }
        } catch {
          // Ignora se já existir matéria de mesmo nome
        }
      }

      setCreatedSubjectIds(ids);
      setStep(2);
    } catch (err: unknown) {
      console.error('Erro ao salvar matérias:', err);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // ─── ETAPA 3: Upload de PDF com Validação Prévia e Retry ───────────────
  const processFileUpload = async (file: File) => {
    setSelectedFile(file);
    setUploadFailed(false);
    track('pdf_upload_started', { source: 'onboarding' });

    // Validação ANTES de iniciar upload: tipo (PDF)
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      setErrorMessage('Formato não suportado — envie um arquivo PDF.');
      setUploadFailed(true);
      track('pdf_upload_failed', { reason: 'type', source: 'onboarding' });
      return;
    }

    // Validação ANTES de iniciar upload: tamanho (<=50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Arquivo muito grande — o limite é 50MB.');
      setUploadFailed(true);
      track('pdf_upload_failed', { reason: 'size', source: 'onboarding' });
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let targetSubjectId = createdSubjectIds.length > 0 ? createdSubjectIds[0] : null;

      if (!targetSubjectId) {
        const subRes = await apiClient.post<{ id: number }>('/api/subjects', {
          subjectName: examTitle.trim() ? `Estudos - ${examTitle.trim()}` : 'Material Geral',
          color: '#6366f1'
        });
        targetSubjectId = subRes.data?.id || 1;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', String(targetSubjectId));

      await apiClient.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
      track('pdf_upload_completed', { source: 'onboarding', size_mb: sizeMb });

      setUploadedFileName(file.name);
      setUploadSuccess(true);
      setUploadFailed(false);
    } catch (err: unknown) {
      console.error('Erro ao enviar PDF:', err);
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message || 'Falha de conexão ao enviar o arquivo. Verifique sua rede e tente novamente.';
      setErrorMessage(msg);
      setUploadFailed(true);
      track('pdf_upload_failed', { reason: 'network', source: 'onboarding' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 9999 }}
      onClick={(e) => {
        // Fechar ao clicar no backdrop preservando dados
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '540px',
          width: '94%',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-secondary)',
          position: 'relative',
          overflow: 'hidden'
        }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (salva e fecha) */}
        <button
          className="modal-close"
          onClick={handleDismiss}
          aria-label="Pular Onboarding"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%'
          }}
        >
          <X size={18} />
        </button>

        {/* Step Indicator Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                color: 'var(--primary)',
                backgroundColor: 'var(--primary-glow)',
                padding: '4px 10px',
                borderRadius: '20px',
                letterSpacing: '0.05em'
              }}
            >
              Passo {step + 1} de 3
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {step === 0 && 'Sua Prova'}
              {step === 1 && 'Suas Matérias'}
              {step === 2 && 'Seu Primeiro PDF'}
            </span>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '22px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: i === step ? 'var(--primary)' : i < step ? 'var(--success, #22c55e)' : 'var(--border-color)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* ─── STEP 0: SUA PROVA ────────────────────────────────────────── */}
        {step === 0 && (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Para qual prova você está estudando? 🎯
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                Configure sua meta principal para calcularmos seu ritmo e contagem regressiva.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Nome da prova ou concurso <span style={{ color: 'var(--primary)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: ENEM, Concurso TJ-SP, Residência Médica, OAB..."
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.92rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Data da prova <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={examDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setExamDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.92rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Nota alvo desejada
                  </label>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {targetScore}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={targetScore}
                  onChange={e => setTargetScore(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '16px', fontStyle: 'italic' }}>
              💡 O StudyFlow calcula sua contagem regressiva e o ritmo ideal de estudos.
            </p>
          </div>
        )}

        {/* ─── STEP 1: SUAS MATÉRIAS ────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Quais matérias você vai estudar? 📚
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                Selecione as matérias do seu edital ou adicione matérias customizadas.
              </p>
            </div>

            {/* Chips de matérias comuns */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {COMMON_SUBJECTS.map(subj => {
                const isSelected = selectedSubjects.some(s => s.name.toLowerCase() === subj.name.toLowerCase());
                return (
                  <button
                    key={subj.name}
                    type="button"
                    onClick={() => toggleCommonSubject(subj)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '20px',
                      fontSize: '0.84rem',
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? 'var(--primary-glow)' : 'var(--bg-tertiary)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: subj.color }} />
                    <span>{subj.name}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>

            {/* Campo "Outra..." com Seletor de Cor */}
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Adicionar outra matéria personalizada:
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Nome da matéria (ex: Direito Constitucional)..."
                  value={customSubjectName}
                  onChange={e => setCustomSubjectName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSubject(); } }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)'
                  }}
                />

                {/* Seletor simples de cor */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {COLOR_PALETTE.slice(0, 4).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomColor(c)}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: customColor === c ? '2px solid white' : 'none',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomSubject}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 12px' }}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
              💡 Você pode refinar metas de domínio por matéria depois, em Matérias.
            </p>
          </div>
        )}

        {/* ─── STEP 2: SEU PRIMEIRO PDF ─────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Agora o mágico: jogue seu material aqui 📄✨
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                Nossa IA transforma seu PDF em questões, flashcards, resumos e simulados.
              </p>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => !loading && !uploadSuccess && fileInputRef.current?.click()}
              style={{
                border: '2px dashed',
                borderColor: uploadSuccess
                  ? 'var(--success, #22c55e)'
                  : uploadFailed
                  ? '#ef4444'
                  : isDragging
                  ? 'var(--primary)'
                  : 'var(--border-color)',
                backgroundColor: uploadSuccess
                  ? 'rgba(34, 197, 94, 0.08)'
                  : uploadFailed
                  ? 'rgba(239, 68, 68, 0.06)'
                  : isDragging
                  ? 'var(--primary-glow)'
                  : 'var(--bg-tertiary)',
                borderRadius: '12px',
                padding: '32px 20px',
                textAlign: 'center',
                cursor: uploadSuccess ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: '16px'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    e.target.value = '';
                    processFileUpload(file);
                  }
                }}
              />

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Loader2 size={36} className="animate-spin text-primary" />
                  <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Processando seu PDF com IA...
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Extraindo tópicos e preparando banco de dados
                  </span>
                </div>
              ) : uploadSuccess ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(34, 197, 94, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--success, #22c55e)'
                    }}
                  >
                    <Check size={26} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {uploadedFileName}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success, #22c55e)', fontWeight: 600 }}>
                    PDF pronto para gerar simulados e flashcards!
                  </span>
                </div>
              ) : uploadFailed && selectedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444'
                    }}
                  >
                    <AlertCircle size={26} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, textAlign: 'center', maxWidth: '380px' }}>
                    {errorMessage || 'Ocorreu uma falha no upload deste arquivo'}
                  </span>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        processFileUpload(selectedFile);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Tentar novamente</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        track('onboarding_step_skipped', { step: 3 });
                        handleFinishOnboarding();
                      }}
                    >
                      <span>Enviar depois</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '4px'
                    }}
                  >
                    <Upload size={26} className="text-primary" />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Arraste seu PDF aqui ou clique para selecionar
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Suporta apostilas, provas anteriores e editais (até 50MB)
                  </span>
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
              Não tem um PDF agora? Você pode enviar a qualquer momento na Área de Estudos.
            </p>
          </div>
        )}

        {/* ─── MODAL ACTIONS FOOTER ─────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          {/* Botão Voltar */}
          {step > 0 ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setErrorMessage(null); setUploadFailed(false); setStep(step - 1); }}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} />
              <span>Anterior</span>
            </button>
          ) : (
            <div />
          )}

          {/* Botões de Avançar / Pular */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {step === 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  track('onboarding_step_skipped', { step: 2 });
                  setStep(2);
                }}
                disabled={loading}
              >
                Posso adicionar depois
              </button>
            )}

            {step === 2 && !uploadSuccess && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  track('onboarding_step_skipped', { step: 3 });
                  handleFinishOnboarding();
                }}
                disabled={loading}
              >
                Enviar depois
              </button>
            )}

            {step === 0 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleNextStep1}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Avançar</span>}
                {!loading && <ChevronRight size={16} />}
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleNextStep2}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Avançar</span>}
                {!loading && <ChevronRight size={16} />}
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleFinishOnboarding}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                  fontWeight: 700
                }}
              >
                <span>Ir pro meu painel →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
