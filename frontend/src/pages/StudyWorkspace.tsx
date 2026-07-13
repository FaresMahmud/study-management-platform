import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Subject, Summary } from '../types';
import { triggerConfetti } from '../utils/confetti';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  FileText, 
  Brain, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Plus, 
  Upload, 
  Trash2, 
  Highlighter, 
  MessageSquare, 
  Maximize2, 
  Minimize2,
  X,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';

// Configura o worker do PDF.js usando CDN pública estável
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.370/pdf.worker.min.js`;

interface PDFFile {
  id: number;
  fileName: String;
  contentType: String;
  fileSize: number;
  uploadDate: string;
  subjectId: number;
}

interface FileAnnotation {
  id?: number;
  fileId: number;
  pageNumber: number;
  type: 'highlight' | 'note';
  content: string; // JSON String
}

export default function StudyWorkspace() {
  const queryClient = useQueryClient();
  
  // Selection State
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeSummaryId, setActiveSummaryId] = useState<number | null>(null);
  const [splitRatio, setSplitRatio] = useState(55); // 55% PDF, 45% Editor

  // PDF Viewer State
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<'none' | 'highlight' | 'note'>('none');

  // Highlights draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  // Summary Editor state
  const [editorTitle, setEditorTitle] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flashcards state
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardFront, setFlashcardFront] = useState('');
  const [flashcardBack, setFlashcardBack] = useState('');
  const [flashcardError, setFlashcardError] = useState('');

  // Queries
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
  });

  const { data: pdfFiles = [], isLoading: loadingFiles } = useQuery<PDFFile[]>({
    queryKey: ['pdf-files', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      return (await apiClient.get<PDFFile[]>(`/api/files/subject/${selectedSubjectId}`)).data;
    },
    enabled: !!selectedSubjectId,
  });

  const { data: summaries = [], isLoading: loadingSummaries } = useQuery<Summary[]>({
    queryKey: ['summaries-by-subject', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      return (await apiClient.get<Summary[]>(`/api/summaries/subject/${selectedSubjectId}`)).data;
    },
    enabled: !!selectedSubjectId,
  });

  const { data: dbAnnotations = [], refetch: refetchAnnotations } = useQuery<FileAnnotation[]>({
    queryKey: ['annotations', activeFileId, pageNum],
    queryFn: async () => {
      if (!activeFileId) return [];
      return (await apiClient.get<FileAnnotation[]>(`/api/files/${activeFileId}/annotations?page=${pageNum}`)).data;
    },
    enabled: !!activeFileId,
  });

  const activeSummary = summaries.find(s => s.id === activeSummaryId);

  // Load selected summary into editor
  useEffect(() => {
    if (activeSummary) {
      setEditorTitle(activeSummary.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = activeSummary.content;
      }
      setUltimoSalvo(new Date(activeSummary.lastModifiedDate || activeSummary.creationDate).toLocaleTimeString());
    } else {
      setEditorTitle('');
      if (editorRef.current) editorRef.current.innerHTML = '';
    }
  }, [activeSummaryId, activeSummary]);

  // Load PDF document
  useEffect(() => {
    if (!activeFileId) {
      setPdfDoc(null);
      setPageNum(1);
      return;
    }

    const loadPdf = async () => {
      setPdfLoading(true);
      try {
        const fileUrl = `${apiClient.defaults.baseURL}/api/files/${activeFileId}/view`;
        const token = localStorage.getItem('token');
        
        // Passa o token de autenticação nos headers da requisição do PDF.js
        const loadingTask = pdfjsLib.getDocument({
          url: fileUrl,
          httpHeaders: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });

        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
      } catch (err) {
        console.error('Erro ao renderizar o PDF:', err);
        alert('Não foi possível ler o PDF do servidor.');
      } finally {
        setPdfLoading(false);
      }
    };

    loadPdf();
  }, [activeFileId]);

  // Render current PDF page
  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Sincroniza overlay canvas
      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.height = viewport.height;
        overlayCanvasRef.current.width = viewport.width;
      }

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      drawStoredHighlights();
    } catch (err) {
      console.error('Erro ao renderizar a página do PDF:', err);
    }
  };

  useEffect(() => {
    renderPage();
  }, [pdfDoc, pageNum, scale]);

  // Redesenha os destaques sobre a overlay canvas
  const drawStoredHighlights = () => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dbAnnotations.forEach((ann) => {
      if (ann.type === 'highlight') {
        try {
          const coords = JSON.parse(ann.content);
          ctx.fillStyle = coords.color || 'rgba(250, 204, 21, 0.4)'; // Amarelo marca-texto
          ctx.fillRect(coords.x, coords.y, coords.w, coords.h);
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  useEffect(() => {
    drawStoredHighlights();
  }, [dbAnnotations]);

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return (await apiClient.post<PDFFile>('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-files', selectedSubjectId] });
      triggerConfetti();
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiClient.delete(`/api/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-files', selectedSubjectId] });
      if (activeFileId === activeFileId) setActiveFileId(null);
    }
  });

  const createSummaryMutation = useMutation({
    mutationFn: async (newSummary: { title: string; content: string; subjectId: number }) => {
      return (await apiClient.post<Summary>('/api/summaries', newSummary)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['summaries-by-subject', selectedSubjectId] });
      setActiveSummaryId(data.id);
    }
  });

  const saveAnnotationMutation = useMutation({
    mutationFn: async (annotation: FileAnnotation) => {
      return (await apiClient.post<FileAnnotation>('/api/files/annotations', annotation)).data;
    },
    onSuccess: () => {
      refetchAnnotations();
    }
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annId: number) => {
      await apiClient.delete(`/api/files/annotations/${annId}`);
    },
    onSuccess: () => {
      refetchAnnotations();
    }
  });

  const createFlashcardMutation = useMutation({
    mutationFn: async (newCard: { front: string; back: string; subjectId: number; summaryId?: number }) => {
      return (await apiClient.post('/api/flashcards', newCard)).data;
    },
    onSuccess: () => {
      triggerConfetti();
      setFlashcardModalOpen(false);
      setFlashcardFront('');
      setFlashcardBack('');
      setFlashcardError('');
      alert('Flashcard criado com sucesso! 🎉');
    }
  });

  const generateAiMutation = useMutation({
    mutationFn: async (payload: { text: string; subjectId: number }) => {
      return (await apiClient.post('/api/ai/generate-flashcards', payload)).data;
    },
    onSuccess: (data: any) => {
      triggerConfetti();
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
      alert(`Copiloto IA: Gerados com sucesso ${data.length} flashcards na sua pilha de revisões! 🧠✨`);
    },
    onError: () => {
      alert('Erro ao gerar flashcards via inteligência artificial.');
    }
  });

  const handleGenerateAiFlashcards = () => {
    if (!selectedSubjectId) return;
    
    const selection = window.getSelection();
    let text = selection ? selection.toString().trim() : '';

    if (!text && editorRef.current) {
      text = editorRef.current.innerText.trim();
    }

    if (!text || text.length < 30) {
      alert('Escreva um resumo mais detalhado (mínimo 30 caracteres) ou selecione um trecho de texto no resumo para a IA ler.');
      return;
    }

    generateAiMutation.mutate({
      text: text,
      subjectId: Number(selectedSubjectId)
    });
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedSubjectId) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', String(selectedSubjectId));
    uploadMutation.mutate(formData);
  };

  // Create empty summary handler
  const handleCreateSummary = () => {
    if (!selectedSubjectId) return;
    createSummaryMutation.mutate({
      title: 'Sem título',
      content: '',
      subjectId: Number(selectedSubjectId)
    });
  };

  // Autosave Summary logic
  const updateSummaryMutation = useMutation({
    mutationFn: async (updated: { id: number; title: string; content: string; subjectId: number }) => {
      return (await apiClient.put<Summary>(`/api/summaries/${updated.id}`, updated)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries-by-subject', selectedSubjectId] });
      setUltimoSalvo(new Date().toLocaleTimeString());
      setSalvando(false);
    },
    onError: () => {
      setSalvando(false);
    }
  });

  const triggerAutoSave = (newTitle: string, newContent: string) => {
    if (!activeSummaryId || !selectedSubjectId) return;
    setSalvando(true);

    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);

    autoSaveTimeoutRef.current = setTimeout(() => {
      updateSummaryMutation.mutate({
        id: activeSummaryId,
        title: newTitle,
        content: newContent,
        subjectId: Number(selectedSubjectId)
      });
    }, 1200);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditorTitle(e.target.value);
    triggerAutoSave(e.target.value, editorRef.current?.innerHTML || '');
  };

  const handleEditorInput = () => {
    triggerAutoSave(editorTitle, editorRef.current?.innerHTML || '');
  };

  // Selection to Flashcard handler
  const handleCreateFlashcardFromSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText) {
      alert('Selecione um texto no seu resumo para usar como a frente do flashcard!');
      return;
    }

    setFlashcardFront(selectedText);
    setFlashcardBack('');
    setFlashcardError('');
    setFlashcardModalOpen(true);
  };

  const handleSaveFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcardFront.trim() || !flashcardBack.trim() || !selectedSubjectId) {
      setFlashcardError('Ambos os campos são obrigatórios.');
      return;
    }

    createFlashcardMutation.mutate({
      front: flashcardFront,
      back: flashcardBack,
      subjectId: Number(selectedSubjectId),
      summaryId: activeSummaryId || undefined
    });
  };

  // Highlights drawing logic
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Converte a posição do mouse considerando o tamanho real renderizado do Canvas
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool !== 'highlight') return;
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationTool !== 'highlight') return;
    const pos = getMousePos(e);
    setCurrentPos(pos);

    // Renderiza o retângulo ativo temporário
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawStoredHighlights(); // Limpa e redesenha o histórico

    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)'; // Desenha retângulo atual
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.abs(startPos.x - pos.x);
    const h = Math.abs(startPos.y - pos.y);
    ctx.fillRect(x, y, w, h);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationTool !== 'highlight') return;
    setIsDrawing(false);
    
    const pos = getMousePos(e);
    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const w = Math.abs(startPos.x - pos.x);
    const h = Math.abs(startPos.y - pos.y);

    // Evita salvar retângulos insignificantes (clicks acidentais)
    if (w < 5 || h < 5 || !activeFileId) return;

    const newHighlight: FileAnnotation = {
      fileId: activeFileId,
      pageNumber: pageNum,
      type: 'highlight',
      content: JSON.stringify({ x, y, w, h, color: 'rgba(250, 204, 21, 0.4)' })
    };

    saveAnnotationMutation.mutate(newHighlight);
    setAnnotationTool('none'); // Reseta a ferramenta
  };

  // Sticky note add logic
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool !== 'note' || !activeFileId) return;
    const pos = getMousePos(e);
    
    const noteText = prompt('Digite sua anotação/comentário:');
    if (!noteText || !noteText.trim()) return;

    const newNote: FileAnnotation = {
      fileId: activeFileId,
      pageNumber: pageNum,
      type: 'note',
      content: JSON.stringify({ x: pos.x, y: pos.y, text: noteText })
    };

    saveAnnotationMutation.mutate(newNote);
    setAnnotationTool('none');
  };

  // Format File Size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden', padding: 0 }}>
      
      {/* BARRA DE SELEÇÃO INICIAL */}
      <div className="flex-between" style={{ padding: '12px var(--space-md)', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', flexShrink: 0 }}>
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
          <div style={{ display: 'flex', gap: '12px' }}>
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
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={14} />
              PDF
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>

            {/* Criar Resumo */}
            <button className="btn btn-primary btn-sm" onClick={handleCreateSummary}>
              <Plus size={14} />
              Resumo
            </button>
          </div>
        )}
      </div>

      {/* WORKSPACE DIVIDIDO */}
      {!selectedSubjectId ? (
        <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)' }}>
          <Sparkles size={56} style={{ color: 'var(--primary)', marginBottom: '1.25rem' }} />
          <h2>Abra sua Área de Estudos</h2>
          <p style={{ maxWidth: '400px', textAlign: 'center', marginTop: '8px' }}>
            Selecione uma matéria acima para carregar seus arquivos PDF da aula e escrever seus resumos integrados lado a lado.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LADO ESQUERDO: PDF VIEWER (ou empty state de PDF) */}
          <div style={{ width: `${splitRatio}%`, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', height: '100%', overflow: 'hidden' }}>
            {!activeFileId ? (
              <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', padding: 'var(--space-md)' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3>Nenhum arquivo PDF aberto</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                  Selecione um PDF existente no menu ou faça o upload de um novo slide/livro.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* PDF CONTROLLER */}
                <div className="flex-between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '6px' }}
                      disabled={pageNum <= 1} 
                      onClick={() => setPageNum(p => p - 1)}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Página {pageNum} de {numPages}</span>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '6px' }}
                      disabled={pageNum >= numPages} 
                      onClick={() => setPageNum(p => p + 1)}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Annotation Tools */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className={`btn btn-sm ${annotationTool === 'highlight' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAnnotationTool(annotationTool === 'highlight' ? 'none' : 'highlight')}
                      title="Marca-texto"
                    >
                      <Highlighter size={14} />
                      Marcação
                    </button>
                    <button 
                      className={`btn btn-sm ${annotationTool === 'note' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAnnotationTool(annotationTool === 'note' ? 'none' : 'note')}
                      title="Adicionar Post-it"
                    >
                      <MessageSquare size={14} />
                      Nota
                    </button>
                  </div>

                  {/* Zoom controls */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => setScale(s => Math.max(0.6, s - 0.1))}><ZoomOut size={14} /></button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '6px' }} onClick={() => setScale(s => Math.min(2.5, s + 0.1))}><ZoomIn size={14} /></button>
                  </div>
                </div>

                {/* PDF VIEWER SCROLLPORT */}
                <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#334155', display: 'flex', justifyContent: 'center', padding: '16px', position: 'relative' }}>
                  {pdfLoading && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
                      Renderizando PDF...
                    </div>
                  )}
                  
                  <div style={{ position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', height: 'fit-content' }}>
                    {/* Rendered PDF Page */}
                    <canvas ref={canvasRef} />
                    
                    {/* Overlay Canvas para destaques temporários e capturas de mouse */}
                    <canvas 
                      ref={overlayCanvasRef} 
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        cursor: annotationTool !== 'none' ? 'crosshair' : 'default'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onClick={handleOverlayClick}
                    />

                    {/* Rendered Sticky notes */}
                    {dbAnnotations.map((ann) => {
                      if (ann.type === 'note') {
                        try {
                          const note = JSON.parse(ann.content);
                          // Ajusta a escala da posição do stick dependendo do zoom/scale
                          return (
                            <div 
                              key={ann.id}
                              style={{ 
                                position: 'absolute', 
                                left: `${(note.x / (overlayCanvasRef.current?.width || 1)) * 100}%`,
                                top: `${(note.y / (overlayCanvasRef.current?.height || 1)) * 100}%`,
                                zIndex: 10,
                                transform: 'translate(-50%, -50%)'
                              }}
                              className="pdf-sticky-container"
                            >
                              <div className="pdf-sticky-bubble" title={note.text}>
                                <MessageSquare size={16} fill="var(--primary)" color="white" />
                                <div className="pdf-sticky-tooltip">
                                  <span>{note.text}</span>
                                  <button onClick={() => { if (confirm('Excluir esta nota?')) deleteAnnotationMutation.mutate(ann.id!); }}>
                                    <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: EDITOR DE TEXTO (ou empty state de resumo) */}
          <div style={{ width: `${100 - splitRatio}%`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            {!activeSummaryId ? (
              <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', padding: 'var(--space-md)' }}>
                <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                <h3>Nenhum resumo aberto</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                  Crie um novo resumo do zero ou selecione um documento existente para sincronizar com sua aula.
                </p>
                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreateSummary}>
                  Criar Novo Resumo
                </button>
              </div>
            ) : (
              <div className="editor-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px var(--space-md)' }}>
                
                {/* Editor Header */}
                <div className="editor-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <input 
                      type="text"
                      className="editor-title-input"
                      placeholder="Sem Título"
                      value={editorTitle}
                      onChange={handleTitleChange}
                      style={{ fontSize: '1.5rem', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {salvando ? 'Salvando resumo...' : ultimoSalvo ? `Salvo às ${ultimoSalvo}` : 'Pronto'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={handleCreateFlashcardFromSelection} 
                      title="Criar Flashcard Manual"
                    >
                      <Brain size={14} />
                      <span>+ Manual</span>
                    </button>
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ 
                        background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                        border: 'none',
                        color: 'white',
                        fontWeight: 'bold',
                        boxShadow: '0 0 10px rgba(99,102,241,0.3)'
                      }}
                      onClick={handleGenerateAiFlashcards} 
                      disabled={generateAiMutation.isPending}
                      title="Gerar Flashcards automaticamente com Inteligência Artificial"
                    >
                      <Sparkles size={14} className={generateAiMutation.isPending ? "animate-spin" : ""} />
                      <span>{generateAiMutation.isPending ? "Gerando..." : "Gerar com IA"}</span>
                    </button>
                  </div>
                </div>

                {/* Editor Toolbar */}
                <div className="editor-toolbar" style={{ marginBottom: '8px', flexShrink: 0 }}>
                  <button type="button" className="toolbar-btn" onClick={() => document.execCommand('bold')}>B</button>
                  <button type="button" className="toolbar-btn" onClick={() => document.execCommand('italic')}>I</button>
                  <button type="button" className="toolbar-btn" onClick={() => document.execCommand('underline')}>U</button>
                  <div className="toolbar-separator" />
                  <button type="button" className="toolbar-btn" onClick={() => document.execCommand('insertUnorderedList')}>List</button>
                  <button type="button" className="toolbar-btn" onClick={() => document.execCommand('formatBlock', '<blockquote>')}>Quote</button>
                </div>

                {/* Content Area */}
                <div 
                  ref={editorRef}
                  className="editor-content-area"
                  contentEditable
                  onInput={handleEditorInput}
                  data-placeholder="Escreva suas anotações da aula e resumos integrados aqui..."
                  style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px' }}
                />
              </div>
            )}
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
              Gere uma pergunta rápida baseada na sua seleção.
            </p>
            
            {flashcardError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {flashcardError}
              </div>
            )}

            <form onSubmit={handleSaveFlashcard}>
              <div className="form-group">
                <label className="form-label" htmlFor="fc-front">Frente / Pergunta (Trecho Selecionado)</label>
                <textarea 
                  id="fc-front" 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
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
                  placeholder="Escreva a resposta para o cartão..." 
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
