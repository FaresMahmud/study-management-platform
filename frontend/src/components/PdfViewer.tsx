import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Highlighter, MessageSquare, ZoomIn, ZoomOut, ArrowRight, Trash2, FileText, Edit3, Type, X } from 'lucide-react';
import { apiClient } from '../api/client';
import * as pdfjsLib from 'pdfjs-dist';
import type { FileAnnotation, PDFFile } from '../types';

// Configura o worker do PDF.js para ser servido localmente
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfViewerProps {
  activeFileId: number | null;
  selectedSubjectId: number | '';
  activeSummaryId: number | null;
  pdfFiles: PDFFile[];
  onCite: (text: string, fileName: string, pageNum: number) => void;
}

export default function PdfViewer({
  activeFileId,
  selectedSubjectId,
  activeSummaryId,
  pdfFiles,
  onCite
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Ferramentas de anotação
  const [annotationTool, setAnnotationTool] = useState<'none' | 'highlight' | 'note' | 'drawing' | 'textbox'>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  // Queries
  const { data: dbAnnotations = [], refetch: refetchAnnotations } = useQuery<FileAnnotation[]>({
    queryKey: ['annotations', activeFileId, pageNum],
    queryFn: async () => {
      if (!activeFileId) return [];
      return (await apiClient.get<FileAnnotation[]>(`/api/files/${activeFileId}/annotations?page=${pageNum}`)).data;
    },
    enabled: !!activeFileId,
  });

  // Mutations
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

  // Render PDF page
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

  // Draw highlights and drawings
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
          ctx.fillStyle = coords.color || 'rgba(250, 204, 21, 0.4)';
          ctx.fillRect(coords.x, coords.y, coords.w, coords.h);
        } catch (e) {
          console.error(e);
        }
      } else if (ann.type === 'drawing') {
        try {
          const data = JSON.parse(ann.content);
          const points = data.points;
          if (points && points.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = data.color || 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = data.width || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  useEffect(() => {
    drawStoredHighlights();
  }, [dbAnnotations]);

  // Mouse coords
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (annotationTool === 'none') return;
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
    if (annotationTool === 'drawing') {
      currentPathRef.current = [pos];
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationTool === 'none') return;
    const pos = getMousePos(e);
    setCurrentPos(pos);

    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (annotationTool === 'highlight') {
      drawStoredHighlights();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
      const x = Math.min(startPos.x, pos.x);
      const y = Math.min(startPos.y, pos.y);
      const w = Math.abs(startPos.x - pos.x);
      const h = Math.abs(startPos.y - pos.y);
      ctx.fillRect(x, y, w, h);
    } else if (annotationTool === 'drawing') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const prev = currentPathRef.current[currentPathRef.current.length - 1];
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      currentPathRef.current.push(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || annotationTool === 'none') return;
    setIsDrawing(false);
    
    if (annotationTool === 'highlight') {
      const pos = getMousePos(e);
      const x = Math.min(startPos.x, pos.x);
      const y = Math.min(startPos.y, pos.y);
      const w = Math.abs(startPos.x - pos.x);
      const h = Math.abs(startPos.y - pos.y);

      if (w < 5 || h < 5 || !activeFileId) return;

      const newHighlight: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'highlight',
        content: JSON.stringify({ x, y, w, h, color: 'rgba(250, 204, 21, 0.4)' })
      };

      saveAnnotationMutation.mutate(newHighlight);
      setAnnotationTool('none');
    } else if (annotationTool === 'drawing') {
      if (currentPathRef.current.length < 2 || !activeFileId) return;

      const newDrawing: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'drawing',
        content: JSON.stringify({ points: currentPathRef.current, color: 'rgba(239, 68, 68, 0.8)', width: 3 })
      };

      saveAnnotationMutation.mutate(newDrawing);
      setAnnotationTool('none');
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeFileId) return;
    const pos = getMousePos(e);
    
    if (annotationTool === 'note') {
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
    } else if (annotationTool === 'textbox') {
      const text = prompt('Digite o texto a ser posicionado no PDF:');
      if (!text || !text.trim()) return;

      const newTextbox: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'textbox',
        content: JSON.stringify({ x: pos.x, y: pos.y, text })
      };

      saveAnnotationMutation.mutate(newTextbox);
      setAnnotationTool('none');
    }
  };

  const handleCiteInSummary = () => {
    if (!activeFileId) return;
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText) {
      alert('Selecione algum texto na página do PDF para citar no seu resumo!');
      return;
    }

    const activeFile = pdfFiles.find(f => f.id === activeFileId);
    const fileName = activeFile ? activeFile.fileName : 'PDF';
    onCite(selectedText, String(fileName), pageNum);
  };

  if (!activeFileId) {
    return (
      <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', padding: 'var(--space-md)' }}>
        <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h3>Nenhum arquivo PDF aberto</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
          Selecione um PDF existente no menu ou faça o upload de um novo slide/livro.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* PDF CONTROLLER */}
      <div className="flex-between" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-sm ${annotationTool === 'highlight' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'highlight' ? 'none' : 'highlight')}
            title="Marca-texto"
          >
            <Highlighter size={14} />
            Marcação
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'drawing' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'drawing' ? 'none' : 'drawing')}
            title="Desenhar livremente (Caneta)"
          >
            <Edit3 size={14} />
            Caneta
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'textbox' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'textbox' ? 'none' : 'textbox')}
            title="Adicionar Texto na Página"
          >
            <Type size={14} />
            Texto
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'note' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'note' ? 'none' : 'note')}
            title="Adicionar Post-it"
          >
            <MessageSquare size={14} />
            Nota
          </button>
          {activeSummaryId && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleCiteInSummary}
              title="Citar o texto selecionado no resumo"
            >
              <ArrowRight size={14} />
              Citar
            </button>
          )}
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
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 5 }}>
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

          {/* Rendered Sticky notes, textboxes & drawing badges */}
          {dbAnnotations.map((ann) => {
            if (ann.type === 'note') {
              try {
                const note = JSON.parse(ann.content);
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

            if (ann.type === 'textbox') {
              try {
                const box = JSON.parse(ann.content);
                return (
                  <div
                    key={ann.id}
                    style={{
                      position: 'absolute',
                      left: `${(box.x / (overlayCanvasRef.current?.width || 1)) * 100}%`,
                      top: `${(box.y / (overlayCanvasRef.current?.height || 1)) * 100}%`,
                      zIndex: 10,
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      transform: 'translate(-50%, -50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{box.text}</span>
                    <button 
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      onClick={() => { if (confirm('Excluir este texto?')) deleteAnnotationMutation.mutate(ann.id!); }}
                    >
                      <X size={12} style={{ color: 'var(--danger)' }} />
                    </button>
                  </div>
                );
              } catch (e) {
                return null;
              }
            }

            if (ann.type === 'drawing') {
              try {
                const data = JSON.parse(ann.content);
                const firstPoint = data.points[0];
                return (
                  <div 
                    key={ann.id}
                    style={{ 
                      position: 'absolute', 
                      left: `${(firstPoint.x / (overlayCanvasRef.current?.width || 1)) * 100}%`,
                      top: `${(firstPoint.y / (overlayCanvasRef.current?.height || 1)) * 100}%`,
                      zIndex: 10,
                      transform: 'translate(-50%, -50%)'
                    }}
                    className="pdf-sticky-container"
                  >
                    <div className="pdf-sticky-bubble" title="Desenho Livre">
                      <Edit3 size={14} color="var(--warning)" />
                      <div className="pdf-sticky-tooltip">
                        <span>Desenho livre</span>
                        <button onClick={() => { if (confirm('Excluir este desenho?')) deleteAnnotationMutation.mutate(ann.id!); }}>
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
  );
}
