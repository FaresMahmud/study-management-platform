import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Upload, Plus, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import type { Subject, PDFFile, Summary } from '../types';

// Importando componentes refatorados
import PdfViewer from '../components/PdfViewer';
import SummaryEditor from '../components/SummaryEditor';
import FlashcardCreatorModal from '../components/FlashcardCreatorModal';
import PaywallModal from '../components/PaywallModal';

export default function StudyWorkspace() {
  const queryClient = useQueryClient();

  // ─── Estados de Navegação e Layout ────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeSummaryId, setActiveSummaryId] = useState<number | null>(null);
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
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
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

  // ─── Mutations de Arquivos e Resumos ──────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return (await apiClient.post<PDFFile>('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-files', selectedSubjectId] });
      setActiveFileId(data.id); // Abre o arquivo recém-enviado
      triggerConfetti();
    }
  });

  const createSummaryMutation = useMutation({
    mutationFn: async (newSummary: { title: string; content: string; subjectId: number }) => {
      return (await apiClient.post<Summary>('/api/summaries', newSummary)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['summaries-by-subject', selectedSubjectId] });
      setActiveSummaryId(data.id); // Foca no resumo recém-criado
    }
  });

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedSubjectId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', String(selectedSubjectId));
    uploadMutation.mutate(formData);
  };

  const handleCreateSummary = () => {
    if (!selectedSubjectId) return;
    createSummaryMutation.mutate({
      title: 'Sem título',
      content: '',
      subjectId: Number(selectedSubjectId)
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <BookOpen size={20} className="text-primary" />
          <select 
            className="form-input" 
            style={{ width: '220px', margin: 0 }}
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Seletor do PDF */}
            <select
              className="form-input"
              style={{ width: '200px', margin: 0 }}
              value={activeFileId || ''}
              onChange={(e) => setActiveFileId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Nenhum PDF selecionado</option>
              {pdfFiles.map(f => (
                <option key={f.id} value={f.id}>{String(f.fileName)}</option>
              ))}
            </select>

            {/* Seletor do Resumo */}
            <select
              className="form-input"
              style={{ width: '200px', margin: 0 }}
              value={activeSummaryId || ''}
              onChange={(e) => setActiveSummaryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Nenhum resumo selecionado</option>
              {summaries.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>

            {/* Upload PDF */}
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Upload size={14} />
              PDF
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>

            {/* Criar Resumo */}
            <button className="btn btn-primary btn-sm" onClick={handleCreateSummary} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={14} />
              Resumo
            </button>

            {/* Split layout toggle buttons */}
            <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '12px' }}>
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

      {/* WORKSPACE DIVIDIDO */}
      {!selectedSubjectId ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Sparkles size={56} style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
          <h2>Abra sua Área de Estudos</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: '8px', fontSize: '0.9rem' }}>
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

          {/* LADO DIREITO: EDITOR DE TEXTO */}
          <div style={{ width: `${100 - splitRatio}%`, display: splitRatio === 100 ? 'none' : 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            <SummaryEditor 
              selectedSubjectId={selectedSubjectId}
              activeSummaryId={activeSummaryId}
              activeSummary={activeSummary}
              editorRef={editorRef}
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
