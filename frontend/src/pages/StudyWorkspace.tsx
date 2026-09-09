import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Sparkles, Upload, FileText, Trash2 } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, normalizeListResponse } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../hooks/useToast';
import type { PDFFile, SpringPage, Subject, Summary } from '../types';
import { triggerConfetti } from '../utils/confetti';
import { truncate } from '../utils/format';
// Importando componentes refatorados
import FlashcardCreatorModal from '../components/FlashcardCreatorModal';
import PaywallModal from '../components/PaywallModal';
import PdfViewer from '../components/PdfViewer';
import SummaryEditor from '../components/SummaryEditor';

export default function StudyWorkspace() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const premium = useAuthStore(state => state.premium);
  const [searchParams] = useSearchParams();

  const querySubjectId = searchParams.get('subjectId');
  const queryFileId = searchParams.get('fileId');
  const querySummaryId = searchParams.get('summaryId');

  // ─── Estados de Navegação e Layout ────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>(
    querySubjectId ? Number(querySubjectId) : ''
  );
  const [activeFileId, setActiveFileId] = useState<number | null>(
    queryFileId ? Number(queryFileId) : null
  );
  const [activeSummaryId, setActiveSummaryId] = useState<number | null>(
    querySummaryId ? Number(querySummaryId) : null
  );
  const [splitRatio, setSplitRatio] = useState<number>(55); // 55% PDF, 45% Editor

  // ─── Estados dos Modais Auxiliares ────────────────────────────────────
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [paywallModalOpen, setPaywallModalOpen] = useState(false);

  // Referência do editor Notion para inserção de citações
  const editorRef = useRef<HTMLDivElement | null>(null);

  // ─── Queries de dados ────────────────────────────────────────────────
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await apiClient.get<SpringPage<Subject>>('/api/subjects?size=1000');
      return normalizeListResponse<Subject>(res.data);
    },
  });

  const { data: pdfFiles = [] } = useQuery<PDFFile[]>({
    queryKey: ['pdf-files', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      return (await apiClient.get<PDFFile[]>(`/api/files/subject/${selectedSubjectId}`)).data;
    },
    enabled: !!selectedSubjectId,
  });

  const { data: summaries = [] } = useQuery<Summary[]>({
    queryKey: ['summaries-by-subject', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      return (await apiClient.get<Summary[]>(`/api/summaries/subject/${selectedSubjectId}`)).data;
    },
    enabled: !!selectedSubjectId,
  });

  const activeSummary = summaries.find(s => s.id === activeSummaryId);

  // ─── Auto-seleção inteligente para evitar tela vazia ──────────────────
  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      if (querySubjectId && subjects.some(s => s.id === Number(querySubjectId))) {
        setSelectedSubjectId(Number(querySubjectId));
      } else {
        setSelectedSubjectId(subjects[0].id);
      }
    }
  }, [subjects, selectedSubjectId, querySubjectId]);

  // Reseta ou inicializa IDs ao mudar de matéria
  useEffect(() => {
    if (selectedSubjectId) {
      if (queryFileId && selectedSubjectId === Number(querySubjectId)) {
        setActiveFileId(Number(queryFileId));
      } else {
        setActiveFileId(null);
      }
      if (querySummaryId && selectedSubjectId === Number(querySubjectId)) {
        setActiveSummaryId(Number(querySummaryId));
      } else {
        setActiveSummaryId(null);
      }
    }
  }, [selectedSubjectId, queryFileId, querySummaryId, querySubjectId]);

  useEffect(() => {
    if (pdfFiles.length > 0) {
      if (!activeFileId || !pdfFiles.some(f => f.id === activeFileId)) {
        setActiveFileId(pdfFiles[0].id);
      }
    } else {
      setActiveFileId(null);
    }
  }, [pdfFiles]);

  useEffect(() => {
    if (summaries.length > 0) {
      if (!activeSummaryId || !summaries.some(s => s.id === activeSummaryId)) {
        setActiveSummaryId(summaries[0].id);
      }
    } else {
      setActiveSummaryId(null);
    }
  }, [summaries]);

  // ─── Mutations de Arquivos e Resumos ──────────────────────────────────
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return (await apiClient.post<PDFFile>('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data;
    },
    onSuccess: (data) => {
      setUploadError(null);
      // Atualiza o cache do React Query imediatamente para evitar race condition com useEffect
      queryClient.setQueryData<PDFFile[]>(['pdf-files', selectedSubjectId], (old = []) => {
        const filtered = old.filter(f => f.id !== data.id);
        return [...filtered, data];
      });
      queryClient.invalidateQueries({ queryKey: ['pdf-files', selectedSubjectId] });
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
      setActiveFileId(data.id); // Abre o arquivo recém-enviado imediatamente
      triggerConfetti();
      toast.success(`PDF "${data.fileName}" carregado e pronto para estudo! 📄✨`);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const msg = error.response?.data?.message || error.message || 'Erro ao enviar o arquivo.';
      setUploadError(msg);
      toast.error(msg);
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiClient.delete(`/api/files/${fileId}`);
    },
    onSuccess: (_, fileId) => {
      queryClient.setQueryData<PDFFile[]>(['pdf-files', selectedSubjectId], (old = []) =>
        old.filter(f => f.id !== fileId)
      );
      queryClient.invalidateQueries({ queryKey: ['pdf-files', selectedSubjectId] });
      queryClient.invalidateQueries({ queryKey: ['uploaded-files'] });
      setActiveFileId(null);
      toast.success('Arquivo PDF removido com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir o arquivo PDF.');
    }
  });

  const createSummaryMutation = useMutation({
    mutationFn: async (newSummary: { title: string; content: string; subjectId: number }) => {
      return (await apiClient.post<Summary>('/api/summaries', newSummary)).data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Summary[]>(['summaries-by-subject', selectedSubjectId], (old = []) => [...old, data]);
      queryClient.invalidateQueries({ queryKey: ['summaries-by-subject', selectedSubjectId] });
      setActiveSummaryId(data.id); // Foca na página recém-criada
      toast.success('Nova página de anotações criada com sucesso! 📝');
    }
  });

  // Mutação para geração de resumo inteligente por IA a partir do PDF
  const generateSummaryMutation = useMutation({
    mutationFn: async (payload: { subjectId: number; fileId?: number | null; text?: string }) => {
      return (await apiClient.post<Summary>('/api/ai/generate-summary', payload)).data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Summary[]>(['summaries-by-subject', selectedSubjectId], (old = []) => [...old, data]);
      queryClient.invalidateQueries({ queryKey: ['summaries-by-subject', selectedSubjectId] });
      setActiveSummaryId(data.id);
      triggerConfetti();
      toast.success('Resumo Inteligente sintetizado com sucesso pelo Copiloto IA! ✨');
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (axiosErr?.response?.data?.message === 'upgrade_required') {
        setPaywallModalOpen(true);
      } else {
        toast.error(axiosErr?.response?.data?.message || 'Erro ao sintetizar resumo com IA.');
      }
    }
  });

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedSubjectId) return;
    const file = e.target.files[0];
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', String(selectedSubjectId));
    uploadMutation.mutate(formData);
    e.target.value = '';
  };

  const handleCreateSummary = () => {
    if (!selectedSubjectId) return;
    createSummaryMutation.mutate({
      title: `Página ${summaries.length + 1}`,
      content: '',
      subjectId: Number(selectedSubjectId)
    });
  };

  const handleGenerateAiSummary = () => {
    if (!selectedSubjectId) return;
    if (!premium) {
      setPaywallModalOpen(true);
      return;
    }
    generateSummaryMutation.mutate({
      subjectId: Number(selectedSubjectId),
      fileId: activeFileId
    });
  };

  // Callback acionado pelo visualizador de PDF para citar texto no editor do resumo
  const handleCite = (selectedText: string, fileName: string, pageNum: number) => {
    const citationHtml = `<blockquote style="border-left: 4px solid var(--primary); padding-left: 12px; margin: 12px 0; color: var(--text-secondary); font-style: italic;">
      "${selectedText}" 
      <span style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; font-style: normal; font-weight: 600;">
        — (${fileName}, pág. ${pageNum})
      </span>
    </blockquote><p><br></p>`;

    if (editorRef.current) {
      editorRef.current.innerHTML += citationHtml;

      // Posiciona o foco e move o scroll para o fim
      editorRef.current.focus();
      editorRef.current.scrollTop = editorRef.current.scrollHeight;

      // Dispara o salvamento automático simulando a entrada do usuário
      const event = new Event('input', { bubbles: true });
      editorRef.current.dispatchEvent(event);
      triggerConfetti();
    }
  };

  const handleManualFlashcardClick = (selectedText: string) => {
    setFlashcardFront(selectedText);
    setFlashcardModalOpen(true);
  };

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden', padding: 0 }}>

      {/* BARRA DE SELEÇÃO INICIAL */}
      <div className="flex-between" style={{ padding: '12px var(--space-md)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <BookOpen size={20} className="text-primary" />
          <select
            className="form-input"
            style={{ width: '100%', maxWidth: '280px', margin: 0 }}
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value ? Number(e.target.value) : '');
              setActiveFileId(null);
              setActiveSummaryId(null);
            }}
          >
            <option value="">Selecione a Matéria</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subjectName}</option>
            ))}
          </select>
        </div>

        {selectedSubjectId && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            {/* Seletor do PDF */}
            <select
              className="form-input dropdown-label"
              style={{ width: '100%', maxWidth: '240px', margin: 0 }}
              value={activeFileId || ''}
              onChange={(e) => setActiveFileId(e.target.value ? Number(e.target.value) : null)}
              title={activeFileId ? String(pdfFiles.find(f => f.id === activeFileId)?.fileName) : "Nenhum PDF selecionado"}
            >
              <option value="" title="Nenhum PDF selecionado">Nenhum PDF selecionado</option>
              {pdfFiles.map(f => (
                <option key={f.id} value={f.id} title={String(f.fileName)}>{truncate(String(f.fileName), 22)}</option>
              ))}
            </select>

            {/* Upload PDF */}
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', opacity: uploadMutation.isPending ? 0.6 : 1 }}>
              <Upload size={14} />
              {uploadMutation.isPending ? 'Enviando...' : 'PDF'}
              <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploadMutation.isPending} />
            </label>

            {/* Excluir PDF ativo */}
            {activeFileId && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 8px', color: 'var(--danger)', margin: 0 }}
                title="Excluir PDF selecionado"
                disabled={deleteFileMutation.isPending}
                onClick={() => {
                  const activeFile = pdfFiles.find(f => f.id === activeFileId);
                  if (confirm(`Deseja realmente excluir o arquivo "${activeFile?.fileName || 'PDF'}" desta matéria?`)) {
                    deleteFileMutation.mutate(activeFileId);
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Botão de destaque: Gerar Resumo Inteligente com IA */}
            <button
              className="btn btn-primary btn-sm"
              onClick={handleGenerateAiSummary}
              disabled={generateSummaryMutation.isPending}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
              }}
              title="Gerar resumo inteligente do PDF ou matéria usando Inteligência Artificial"
            >
              <Sparkles size={14} className={generateSummaryMutation.isPending ? "animate-spin" : ""} />
              <span>{generateSummaryMutation.isPending ? 'Sintetizando...' : '✨ Resumo IA'}</span>
            </button>

            {/* Split layout toggle buttons */}
            <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: 'var(--space-sm)', marginLeft: 'var(--space-sm)' }}>
              <button
                className={`btn btn-sm ${splitRatio === 100 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', minWidth: '40px' }}
                onClick={() => setSplitRatio(100)}
                title="Apenas PDF"
              >
                PDF
              </button>
              <button
                className={`btn btn-sm ${splitRatio === 55 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', minWidth: '40px' }}
                onClick={() => setSplitRatio(55)}
                title="Dividido (Fibonacci)"
              >
                Dividido
              </button>
              <button
                className={`btn btn-sm ${splitRatio === 0 ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px', minWidth: '40px' }}
                onClick={() => setSplitRatio(0)}
                title="Apenas Resumos (Zen)"
              >
                Zen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mensagem de erro do upload */}
      {uploadError && (
        <div style={{ padding: '10px 16px', backgroundColor: 'var(--danger-glow, rgba(239,68,68,0.1))', borderBottom: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Erro no upload: {uploadError}</span>
          <button onClick={() => setUploadError(null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* WORKSPACE DIVIDIDO */}
      {!selectedSubjectId ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Sparkles size={56} style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
          <h2>Abra sua Área de Estudos</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: 'var(--space-xs)', fontSize: '0.9rem' }}>
            Selecione uma matéria acima para carregar seus arquivos PDF da aula e escrever seus resumos integrados lado a lado.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* LADO ESQUERDO: PDF VIEWER */}
          <div style={{ width: `${splitRatio}%`, display: splitRatio === 0 ? 'none' : 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', height: '100%', overflow: 'hidden' }}>
            <PdfViewer
              activeFileId={activeFileId}
              selectedSubjectId={selectedSubjectId}
              activeSummaryId={activeSummaryId}
              pdfFiles={pdfFiles}
              onCite={handleCite}
            />
          </div>

          {/* LADO DIREITO: EDITOR DE TEXTO & PÁGINAS */}
          <div style={{ width: `${100 - splitRatio}%`, display: splitRatio === 100 ? 'none' : 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            {/* Barra explícita de abas de páginas ao lado do PDF */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              gap: '8px',
              flexShrink: 0
            }}>
              {/* Abas das páginas existentes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px', flexShrink: 0 }}>
                  Páginas:
                </span>
                {summaries.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhuma página criada
                  </span>
                ) : (
                  summaries.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSummaryId(s.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: activeSummaryId === s.id ? 700 : 500,
                        backgroundColor: activeSummaryId === s.id ? 'var(--primary)' : 'var(--bg-tertiary)',
                        color: activeSummaryId === s.id ? '#ffffff' : 'var(--text-secondary)',
                        border: '1px solid',
                        borderColor: activeSummaryId === s.id ? 'var(--primary)' : 'var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      title={s.title}
                    >
                      {truncate(s.title || 'Sem título', 18)}
                    </button>
                  ))
                )}
              </div>

              {/* Botões de Ação para Criar Página ou Resumo IA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCreateSummary}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '0.78rem', fontWeight: 600 }}
                  title="Criar nova página de anotações em branco ao lado do PDF"
                >
                  <Plus size={14} style={{ color: 'var(--primary)' }} />
                  <span>+ Criar Página</span>
                </button>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleGenerateAiSummary}
                  disabled={generateSummaryMutation.isPending}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                    border: 'none',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                    cursor: 'pointer'
                  }}
                  title="Sintetizar resumo inteligente via IA (PRO)"
                >
                  <Sparkles size={13} className={generateSummaryMutation.isPending ? "animate-spin" : ""} />
                  <span>{generateSummaryMutation.isPending ? 'Sintetizando...' : '✨ Resumo IA'}</span>
                </button>
              </div>
            </div>

            <SummaryEditor
              selectedSubjectId={selectedSubjectId}
              activeSummaryId={activeSummaryId}
              activeSummary={activeSummary}
              editorRef={editorRef}
              onCreatePage={handleCreateSummary}
              onGenerateAiSummary={handleGenerateAiSummary}
              isGeneratingSummary={generateSummaryMutation.isPending}
              onManualFlashcardClick={handleManualFlashcardClick}
              onUpgradeRequired={() => setPaywallModalOpen(true)}
            />
          </div>

        </div>
      )}

      {/* ================= MODAIS AUXILIARES ================= */}
      <FlashcardCreatorModal
        isOpen={flashcardModalOpen}
        onClose={() => setFlashcardModalOpen(false)}
        initialFront={flashcardFront}
        subjectId={selectedSubjectId}
        summaryId={activeSummaryId}
      />

      <PaywallModal
        isOpen={paywallModalOpen}
        onClose={() => setPaywallModalOpen(false)}
      />
    </div>
  );
}
