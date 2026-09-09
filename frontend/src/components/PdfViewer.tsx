import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Highlighter, MessageSquare, ZoomIn, ZoomOut, ArrowRight, Trash2, FileText, Edit3, Type, X, AlertCircle, RefreshCw, Maximize2 } from 'lucide-react';
import axios from 'axios';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import * as pdfjsLib from 'pdfjs-dist';
import type { FileAnnotation, PDFFile } from '../types';
import './PdfViewer.css';

// Configura o worker do PDF.js para ser servido localmente
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Instância axios separada (sem interceptors) para requisições binárias de PDF.
// O apiClient intercepts-response modifica response.data para respostas paginadas,
// o que corrompe ArrayBuffers quando responseType: 'arraybuffer'.
const pdfAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  responseType: 'arraybuffer',
});

interface PdfViewerProps {
  activeFileId: number | null;
  activeSummaryId: number | null;
  pdfFiles: PDFFile[];
  onCite: (text: string, fileName: string, pageNum: number) => void;
  selectedSubjectId?: number;
}

export default function PdfViewer({
  activeFileId,
  activeSummaryId,
  pdfFiles,
  onCite
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [overlayCanvasSize, setOverlayCanvasSize] = useState({ width: 0, height: 0 });
  const loadedFileIdRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const naturalWidthRef = useRef<number>(800);
  const naturalHeightRef = useRef<number>(1100);
  const renderTaskRef = useRef<any>(null);
  const [dragPositions, setDragPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [draggingAnnId, setDraggingAnnId] = useState<number | null>(null);

  // Ferramentas de anotação
  const [annotationTool, setAnnotationTool] = useState<'none' | 'highlight' | 'note' | 'drawing' | 'textbox'>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [, setCurrentPos] = useState({ x: 0, y: 0 });

  const [textInputModal, setTextInputModal] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    type: 'note' | 'textbox';
  } | null>(null);
  const [customInputValue, setCustomInputValue] = useState('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);

  // Queries
  const { data: dbAnnotations = [], refetch: refetchAnnotations } = useQuery<FileAnnotation[]>({
    queryKey: ['annotations', activeFileId, pageNum],
    queryFn: async () => {
      if (!activeFileId) return [];
      return (await apiClient.get<FileAnnotation[]>(`/api/v1/files/${activeFileId}/annotations?page=${pageNum}`)).data;
    },
    enabled: !!activeFileId,
  });

  // Mutations
  const saveAnnotationMutation = useMutation({
    mutationFn: async (annotation: FileAnnotation) => {
      return (await apiClient.post<FileAnnotation>('/api/v1/files/annotations', annotation)).data;
    },
    onSuccess: () => {
      refetchAnnotations();
    }
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annId: number) => {
      await apiClient.delete(`/api/v1/files/annotations/${annId}`);
    },
    onSuccess: () => {
      refetchAnnotations();
    }
  });

  // Reset local drag positions when page changes
  useEffect(() => {
    setDragPositions({});
  }, [pageNum, activeFileId]);

  // Handler for dragging sticky notes and textboxes across the PDF
  const handleStartDrag = (
    e: React.MouseEvent,
    ann: FileAnnotation,
    currentX: number,
    currentY: number
  ) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    e.preventDefault();

    const overlay = overlayCanvasRef.current;
    if (!overlay || !ann.id) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let didMove = false;
    setDraggingAnnId(ann.id);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        didMove = true;
      }

      const canvasW = overlayCanvasSize.width || overlay.width || 800;
      const canvasH = overlayCanvasSize.height || overlay.height || 1100;
      const newX = Math.max(15, Math.min(canvasW - 15, currentX + deltaX));
      const newY = Math.max(15, Math.min(canvasH - 15, currentY + deltaY));

      setDragPositions(prev => ({
        ...prev,
        [ann.id!]: { x: newX, y: newY }
      }));
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setDraggingAnnId(null);

      if (didMove && ann.id) {
        const deltaX = upEvent.clientX - startClientX;
        const deltaY = upEvent.clientY - startClientY;
        const canvasW = overlayCanvasSize.width || overlay.width || 800;
        const canvasH = overlayCanvasSize.height || overlay.height || 1100;
        const finalX = Math.max(15, Math.min(canvasW - 15, currentX + deltaX));
        const finalY = Math.max(15, Math.min(canvasH - 15, currentY + deltaY));

        try {
          const parsed = JSON.parse(ann.content);
          const finalXRatio = Number((finalX / canvasW).toFixed(4));
          const finalYRatio = Number((finalY / canvasH).toFixed(4));
          const updatedContent = JSON.stringify({
            ...parsed,
            x: Math.round(finalX),
            y: Math.round(finalY),
            xRatio: finalXRatio,
            yRatio: finalYRatio
          });
          saveAnnotationMutation.mutate({
            ...ann,
            content: updatedContent
          });
        } catch (err) {
          console.error('Falha ao atualizar posição da anotação:', err);
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const [pdfError, setPdfError] = useState<string | null>(null);

  const loadPdfDoc = useCallback(async (fileId: number) => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      // Usa instância axios sem interceptors para obter o ArrayBuffer puro
      const token = useAuthStore.getState().token;
      const response = await pdfAxios.get(`/api/v1/files/${fileId}/view`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      let rawData: ArrayBuffer;
      if (response.data instanceof ArrayBuffer) {
        rawData = response.data;
      } else if (ArrayBuffer.isView(response.data)) {
        rawData = response.data.buffer as ArrayBuffer;
      } else {
        rawData = new Uint8Array(response.data).buffer as ArrayBuffer;
      }

      if (rawData.byteLength > 0) {
        const header = new Uint8Array(rawData.slice(0, 10));
        const headerStr = String.fromCharCode(...header);
        const isPDF = headerStr.startsWith('%PDF');

        if (!isPDF) {
          setPdfError('O arquivo recebido não é um PDF válido ou está corrompido.');
          loadedFileIdRef.current = null;
          return;
        }
      }

      if (!rawData || rawData.byteLength === 0) {
        setPdfError('O arquivo PDF está vazio no servidor.');
        loadedFileIdRef.current = null;
        return;
      }

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(rawData),
      });

      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setPageNum(1);
      setPdfError(null);
    } catch (err) {
      loadedFileIdRef.current = null;
      setPdfDoc(null);
      console.error('Erro ao renderizar o PDF:', err);
      let msg = 'Não foi possível carregar o arquivo PDF do servidor.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number } };
        if (axiosErr.response?.status === 404) {
          msg = 'Arquivo PDF não encontrado no servidor. Ele pode ter sido removido ou o upload não foi concluído.';
        } else if (axiosErr.response?.status === 403) {
          msg = 'Você não tem permissão para acessar este arquivo.';
        } else if (axiosErr.response?.status === 401) {
          msg = 'Sessão expirada. Faça login novamente.';
        }
      } else if (err instanceof Error && err.message?.includes('Password')) {
        msg = 'Este PDF está protegido por senha e não pode ser aberto.';
      }
      setPdfError(msg);
    } finally {
      setPdfLoading(false);
    }
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!activeFileId) {
      setPdfDoc(null);
      setPageNum(1);
      setPdfError(null);
      loadedFileIdRef.current = null;
      return;
    }

    if (loadedFileIdRef.current === activeFileId) return;
    loadedFileIdRef.current = activeFileId;

    loadPdfDoc(activeFileId);
  }, [activeFileId, loadPdfDoc]);

  // Draw highlights and drawings
  const drawStoredHighlights = useCallback(() => {
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
          if (coords.xRatio !== undefined) {
            ctx.fillRect(
              coords.xRatio * canvas.width,
              coords.yRatio * canvas.height,
              coords.wRatio * canvas.width,
              coords.hRatio * canvas.height
            );
          } else {
            ctx.fillRect(coords.x, coords.y, coords.w, coords.h);
          }
        } catch (_e) {
          console.error(_e);
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
        } catch (_e) {
          console.error(_e);
        }
      }
    });
  }, [dbAnnotations]);

  // Render PDF page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (_e) {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1.0 });
      naturalWidthRef.current = baseViewport.width;
      naturalHeightRef.current = baseViewport.height;

      let currentScale = scale;
      if (isAutoFit && scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.clientWidth;
        if (containerWidth > 100) {
          const availableWidth = Math.max(200, containerWidth - 40);
          const fitScale = Number((availableWidth / baseViewport.width).toFixed(3));
          if (Math.abs(fitScale - scale) > 0.02) {
            setScale(fitScale);
            currentScale = fitScale;
          }
        }
      }

      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      if (overlayCanvasRef.current) {
        overlayCanvasRef.current.width = Math.floor(viewport.width);
        overlayCanvasRef.current.height = Math.floor(viewport.height);
        overlayCanvasRef.current.style.width = `${Math.floor(viewport.width)}px`;
        overlayCanvasRef.current.style.height = `${Math.floor(viewport.height)}px`;
        setOverlayCanvasSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height) });
      }

      const transform = outputScale !== 1
        ? [outputScale, 0, 0, outputScale, 0, 0]
        : undefined;

      const renderTask = page.render({
        canvas: canvas,
        canvasContext: context,
        transform: transform,
        viewport: viewport
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;

      drawStoredHighlights();
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        return;
      }
      console.error('Erro ao renderizar a página do PDF:', err);
    }
  }, [pdfDoc, pageNum, scale, isAutoFit, drawStoredHighlights]);

  // Keep refs in sync with latest functions
  const renderPageRef = useRef(renderPage);
  useEffect(() => {
    renderPageRef.current = renderPage;
  }, [renderPage]);

  const drawStoredHighlightsRef = useRef(drawStoredHighlights);
  useEffect(() => {
    drawStoredHighlightsRef.current = drawStoredHighlights;
  }, [drawStoredHighlights]);

  useEffect(() => {
    renderPageRef.current();
  }, [pdfDoc, pageNum, scale, isAutoFit]);

  useEffect(() => {
    drawStoredHighlightsRef.current();
  }, [dbAnnotations]);

  // ResizeObserver para manter o auto-fit sempre perfeito ao mexer no split ou janela
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 100 && isAutoFit && naturalWidthRef.current > 0) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            const availableWidth = Math.max(200, entry.contentRect.width - 40);
            const newScale = Math.max(0.3, Math.min(3.0, availableWidth / naturalWidthRef.current));
            setScale(Number(newScale.toFixed(3)));
          }, 50);
        }
      }
    });

    observer.observe(container);
    return () => {
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [isAutoFit]);

  const handleToggleFitWidth = () => {
    if (isAutoFit) {
      setIsAutoFit(false);
      setScale(1.0);
    } else {
      setIsAutoFit(true);
      if (scrollContainerRef.current && naturalWidthRef.current > 0) {
        const availableWidth = Math.max(200, scrollContainerRef.current.clientWidth - 40);
        const newScale = Math.max(0.3, Math.min(3.0, availableWidth / naturalWidthRef.current));
        setScale(Number(newScale.toFixed(3)));
      }
    }
  };

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

      const canvasW = overlayCanvasSize.width || 1;
      const canvasH = overlayCanvasSize.height || 1;

      const newHighlight: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'highlight',
        content: JSON.stringify({ 
          x, y, w, h,
          xRatio: Number((x / canvasW).toFixed(4)),
          yRatio: Number((y / canvasH).toFixed(4)),
          wRatio: Number((w / canvasW).toFixed(4)),
          hRatio: Number((h / canvasH).toFixed(4)),
          color: 'rgba(250, 204, 21, 0.4)' 
        })
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
    
    if (annotationTool === 'note' || annotationTool === 'textbox') {
      setCustomInputValue('');
      setTextInputModal({
        isOpen: true,
        x: pos.x,
        y: pos.y,
        type: annotationTool
      });
    }
  };

  const handleConfirmCustomInput = () => {
    if (!textInputModal || !customInputValue.trim() || !activeFileId) return;

    const canvasW = overlayCanvasSize.width || 800;
    const canvasH = overlayCanvasSize.height || 1100;
    const xRatio = Number((textInputModal.x / canvasW).toFixed(4));
    const yRatio = Number((textInputModal.y / canvasH).toFixed(4));

    if (textInputModal.type === 'note') {
      const newNote: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'note',
        content: JSON.stringify({ 
          x: textInputModal.x, 
          y: textInputModal.y, 
          xRatio,
          yRatio,
          text: customInputValue.trim() 
        })
      };
      saveAnnotationMutation.mutate(newNote);
    } else if (textInputModal.type === 'textbox') {
      const newTextbox: FileAnnotation = {
        fileId: activeFileId,
        pageNumber: pageNum,
        type: 'textbox',
        content: JSON.stringify({ 
          x: textInputModal.x, 
          y: textInputModal.y, 
          xRatio,
          yRatio,
          text: customInputValue.trim() 
        })
      };
      saveAnnotationMutation.mutate(newTextbox);
    }
    
    setTextInputModal(null);
    setAnnotationTool('none');
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
    <div className="workspace">
      {/* PDF CONTROLLER */}
      <div className="workspace__toolbar">
        {/* Navigation */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '5px 8px' }}
            disabled={pageNum <= 1} 
            onClick={() => setPageNum(p => p - 1)}
            title="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '68px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {pageNum} / {numPages || 1}
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '5px 8px' }}
            disabled={pageNum >= numPages} 
            onClick={() => setPageNum(p => p + 1)}
            title="Próxima página"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Annotation Tools */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className={`btn btn-sm ${annotationTool === 'highlight' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'highlight' ? 'none' : 'highlight')}
            title="Marca-texto: destaque partes do texto"
            style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Highlighter size={14} />
            <span>Marcação</span>
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'drawing' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'drawing' ? 'none' : 'drawing')}
            title="Desenhar livremente (Caneta)"
            style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Edit3 size={14} />
            <span>Caneta</span>
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'textbox' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'textbox' ? 'none' : 'textbox')}
            title="Adicionar texto digitado na página"
            style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Type size={14} />
            <span>Texto</span>
          </button>
          <button 
            className={`btn btn-sm ${annotationTool === 'note' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAnnotationTool(annotationTool === 'note' ? 'none' : 'note')}
            title="Adicionar Post-it / Nota adesiva"
            style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={14} />
            <span>Nota</span>
          </button>
          {activeSummaryId && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleCiteInSummary}
              title="Citar o texto selecionado no resumo"
              style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
            >
              <ArrowRight size={14} />
              <span>Citar</span>
            </button>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '5px 7px' }} 
            onClick={() => {
              setIsAutoFit(false);
              setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))));
            }}
            title="Reduzir zoom (-)"
          >
            <ZoomOut size={14} />
          </button>
          
          <button
            className="btn btn-secondary btn-sm"
            style={{ 
              padding: '4px 8px', 
              fontSize: '0.75rem', 
              fontWeight: 600, 
              minWidth: '56px',
              textAlign: 'center',
              backgroundColor: isAutoFit ? 'var(--bg-tertiary)' : undefined,
              borderColor: isAutoFit ? 'var(--primary)' : undefined
            }}
            onClick={handleToggleFitWidth}
            title={isAutoFit ? "Modo: Ajustado à Largura (Clique para 100%)" : "Clique para Ajustar à Largura"}
          >
            {isAutoFit ? 'Ajustar' : `${Math.round(scale * 100)}%`}
          </button>

          <button 
            className="btn btn-secondary btn-sm" 
            style={{ padding: '5px 7px' }} 
            onClick={() => {
              setIsAutoFit(false);
              setScale(s => Math.min(3.0, Number((s + 0.15).toFixed(2))));
            }}
            title="Aumentar zoom (+)"
          >
            <ZoomIn size={14} />
          </button>

          <button
            className={`btn btn-sm ${isAutoFit ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '5px 7px' }}
            onClick={handleToggleFitWidth}
            title="Ajustar à largura do painel"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* PDF VIEWER SCROLLPORT */}
      <div 
        ref={scrollContainerRef}
        className="workspace__pdf"
      >
        {pdfLoading && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Carregando arquivo PDF...</span>
          </div>
        )}

        {pdfError && !pdfLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
            <AlertCircle size={44} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Não foi possível exibir o PDF</h3>
            <p style={{ maxWidth: '380px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {pdfError}
            </p>
            {activeFileId && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  loadedFileIdRef.current = null;
                  loadPdfDoc(activeFileId);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {!pdfError && !pdfLoading && (!activeFileId || pdfFiles.length === 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>
            <FileText size={48} style={{ color: 'var(--primary)', opacity: 0.7, marginBottom: '1rem' }} />
            <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Nenhum PDF selecionado</h3>
            <p style={{ maxWidth: '360px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.5 }}>
              {pdfFiles.length === 0
                ? 'Esta matéria ainda não possui arquivos PDF. Clique em "+ PDF" no topo para enviar o material de aula.'
                : 'Selecione um dos PDFs da lista acima para iniciar a leitura e anotações.'}
            </p>
          </div>
        )}

        {pdfDoc && !pdfError && (
          <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'min-content', width: '100%' }}>
            <div className="pdf-canvas-card">
              {/* Rendered PDF Page */}
              <canvas ref={canvasRef} style={{ display: 'block' }} />
              
              {/* Overlay Canvas para destaques temporários e capturas de mouse */}
              <canvas 
                ref={overlayCanvasRef} 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  cursor: annotationTool !== 'none' ? 'crosshair' : 'default',
                  display: 'block'
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
                    const posXRatio = note.xRatio !== undefined ? note.xRatio : (note.x / (overlayCanvasSize.width || 1));
                    const posYRatio = note.yRatio !== undefined ? note.yRatio : (note.y / (overlayCanvasSize.height || 1));
                    const isDraggingThis = draggingAnnId === ann.id;
                    const posX = isDraggingThis && dragPositions[ann.id!] ? dragPositions[ann.id!].x : (posXRatio * (overlayCanvasSize.width || 1));
                    const posY = isDraggingThis && dragPositions[ann.id!] ? dragPositions[ann.id!].y : (posYRatio * (overlayCanvasSize.height || 1));
                    return (
                      <div 
                        key={ann.id}
                        onMouseDown={(e) => handleStartDrag(e, ann, posX, posY)}
                        style={{ 
                          position: 'absolute', 
                          left: `${(posX / (overlayCanvasSize.width || 1)) * 100}%`,
                          top: `${(posY / (overlayCanvasSize.height || 1)) * 100}%`,
                          zIndex: isDraggingThis ? 30 : 10,
                          transform: 'translate(-50%, -50%)',
                          cursor: isDraggingThis ? 'grabbing' : 'grab',
                          userSelect: 'none',
                        }}
                        className="pdf-sticky-container"
                      >
                        <div 
                          className="pdf-sticky-bubble" 
                          title={`${note.text} (Arraste para reposicionar)`}
                          style={{ 
                            boxShadow: isDraggingThis ? '0 0 14px var(--primary)' : undefined,
                            transform: isDraggingThis ? 'scale(1.15)' : undefined,
                            transition: isDraggingThis ? 'none' : 'transform 0.15s, box-shadow 0.15s',
                          }}
                        >
                          <MessageSquare size={16} fill="var(--primary)" color="white" />
                          <div className="pdf-sticky-tooltip">
                            <span>{note.text}</span>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta nota?')) deleteAnnotationMutation.mutate(ann.id!); }}>
                              <Trash2 size={12} style={{ color: 'var(--danger)' }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } catch {
                    return null;
                  }
                }

                if (ann.type === 'textbox') {
                  try {
                    const box = JSON.parse(ann.content);
                    const posXRatio = box.xRatio !== undefined ? box.xRatio : (box.x / (overlayCanvasSize.width || 1));
                    const posYRatio = box.yRatio !== undefined ? box.yRatio : (box.y / (overlayCanvasSize.height || 1));
                    const isDraggingThis = draggingAnnId === ann.id;
                    const posX = isDraggingThis && dragPositions[ann.id!] ? dragPositions[ann.id!].x : (posXRatio * (overlayCanvasSize.width || 1));
                    const posY = isDraggingThis && dragPositions[ann.id!] ? dragPositions[ann.id!].y : (posYRatio * (overlayCanvasSize.height || 1));
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={(e) => handleStartDrag(e, ann, posX, posY)}
                        style={{
                          position: 'absolute',
                          left: `${(posX / (overlayCanvasSize.width || 1)) * 100}%`,
                          top: `${(posY / (overlayCanvasSize.height || 1)) * 100}%`,
                          zIndex: isDraggingThis ? 30 : 10,
                          color: 'var(--text-primary)',
                          backgroundColor: 'var(--bg-secondary)',
                          border: isDraggingThis ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isDraggingThis ? '0 6px 20px rgba(99, 102, 241, 0.4)' : '0 2px 8px rgba(0,0,0,0.15)',
                          whiteSpace: 'nowrap',
                          cursor: isDraggingThis ? 'grabbing' : 'grab',
                          userSelect: 'none',
                        }}
                        title="Arraste para reposicionar"
                      >
                        <span>{box.text}</span>
                        <button 
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                          onClick={(e) => { e.stopPropagation(); if (confirm('Excluir este texto?')) deleteAnnotationMutation.mutate(ann.id!); }}
                        >
                          <X size={12} style={{ color: 'var(--danger)' }} />
                        </button>
                      </div>
                    );
                  } catch {
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
                      left: `${(firstPoint.x / (overlayCanvasSize.width || 1)) * 100}%`,
                      top: `${(firstPoint.y / (overlayCanvasSize.height || 1)) * 100}%`,
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
              } catch {
                return null;
              }
            }

            return null;
          })}

          {textInputModal && textInputModal.isOpen && (
            <div
              style={{
                position: 'absolute',
                left: `${(textInputModal.x / (overlayCanvasSize.width || 1)) * 100}%`,
                top: `${(textInputModal.y / (overlayCanvasSize.height || 1)) * 100}%`,
                transform: 'translate(-50%, -100%) translateY(-10px)',
                zIndex: 1000,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '260px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {textInputModal.type === 'note' ? 'Nova Nota' : 'Novo Texto'}
                </span>
                <button 
                  onClick={() => setTextInputModal(null)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                autoFocus
                placeholder={textInputModal.type === 'note' ? 'Digite sua nota...' : 'Digite o texto...'}
                value={customInputValue}
                onChange={e => setCustomInputValue(e.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                  resize: 'none',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleConfirmCustomInput();
                  }
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setTextInputModal(null)}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleConfirmCustomInput}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
