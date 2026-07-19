import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Camera, RefreshCw, Save, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerConfetti } from '../utils/confetti';
import type { Subject } from '../types';

interface WhiteboardOcrCardProps {
  subjects: Subject[];
}

interface AnalysisResponse {
  subjectId: number | null;
  suggestedSubjectName: string | null;
  confidence: number;
  transcription: string;
}

export default function WhiteboardOcrCard({ subjects }: WhiteboardOcrCardProps) {
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');

  // Mutation para enviar a foto e analisar por IA
  const analyzePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post<AnalysisResponse>('/api/ai/analyze-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setSelectedSubjectId(data.subjectId || '');
      setSummaryTitle(`Resumo do Quadro - ${new Date().toLocaleDateString('pt-BR')}`);
      setModalAberto(true);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Falha ao analisar a foto com Inteligência Artificial.';
      setErro(msg);
    },
  });

  // Mutation para criar o resumo no banco
  const createSummaryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubjectId || !analysisResult) return;
      
      return await apiClient.post('/api/summaries', {
        title: summaryTitle,
        content: analysisResult.transcription,
        subjectId: Number(selectedSubjectId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      triggerConfetti();
      alert('Resumo importado com sucesso!');
      fecharEResetar();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Erro ao salvar o resumo.';
      setErro(msg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErro('');
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErro('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      
      // Executa a análise automaticamente ao selecionar
      analyzePhotoMutation.mutate(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErro('');
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErro('Por favor, selecione apenas arquivos de imagem.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      analyzePhotoMutation.mutate(file);
    }
  };

  const fecharEResetar = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setSelectedSubjectId('');
    setSummaryTitle('');
    setModalAberto(false);
    setErro('');
  };

  const handleSalvarResumo = (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!selectedSubjectId) {
      setErro('Por favor, selecione uma matéria para vincular este resumo.');
      return;
    }
    createSummaryMutation.mutate();
  };

  return (
    <>
      <div 
        className="card whiteboard-ocr-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Camera size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <h2 className="card-title" style={{ margin: 0 }}>Digitalizar Quadro de Aula</h2>
          <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Sparkles size={10} /> IA Multimodal
          </span>
        </div>

        {/* Drag and Drop Zone / File Input */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: analyzePhotoMutation.isPending ? 'not-allowed' : 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            transition: 'all 0.2s ease',
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => !analyzePhotoMutation.isPending && document.getElementById('whiteboard-file-input')?.click()}
        >
          <input
            id="whiteboard-file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={analyzePhotoMutation.isPending}
          />

          {analyzePhotoMutation.isPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw className="animate-spin text-primary" size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>IA analisando foto do quadro...</p>
            </div>
          ) : (
            <>
              <Camera size={28} style={{ color: 'var(--text-secondary)' }} />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Arraste a foto do quadro ou clique para selecionar
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Suporta PNG, JPG, JPEG e WEBP (Focado em OCR cognitivo)
                </p>
              </div>
            </>
          )}
        </div>

        {erro && (
          <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '8px', textAlign: 'left' }}>
            ⚠️ {erro}
          </p>
        )}
      </div>

      {/* Modal: Resultado da Análise da Foto */}
      {modalAberto && analysisResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }} role="dialog" aria-modal="true" aria-labelledby="modal-ocr-title">
            <button className="modal-close" onClick={fecharEResetar} aria-label="Fechar">
              <X size={18} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles size={20} style={{ color: 'var(--primary)' }} />
              <h2 className="modal-title" id="modal-ocr-title" style={{ margin: 0 }}>Foto de Aula Analisada por IA</h2>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Nossa IA leu o quadro e formatou um resumo completo. Revise e salve abaixo.
            </p>

            <form onSubmit={handleSalvarResumo}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {/* Preview da foto */}
                <div>
                  <label className="form-label">Visualização da Foto</label>
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Preview do Quadro" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '180px', 
                        objectFit: 'cover', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)' 
                      }} 
                    />
                  )}
                </div>

                {/* Classificação de Matéria */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" htmlFor="ocr-subject">Matéria Sugerida</label>
                    <select 
                      id="ocr-subject" 
                      className="form-input" 
                      style={{ width: '100%' }}
                      value={selectedSubjectId} 
                      onChange={e => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')} 
                      required
                    >
                      <option value="" disabled>Vincular à matéria...</option>
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--success)', backgroundColor: 'var(--success-glow)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <CheckCircle2 size={14} />
                    <span>Confiança da IA: <strong>{Math.round(analysisResult.confidence * 100)}%</strong></span>
                  </div>

                  {analysisResult.suggestedSubjectName && !analysisResult.subjectId && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      💡 Sugerimos criar a matéria: <strong>{analysisResult.suggestedSubjectName}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Título do Resumo */}
              <div className="form-group">
                <label className="form-label" htmlFor="ocr-title">Título do Resumo</label>
                <input 
                  id="ocr-title" 
                  type="text" 
                  className="form-input" 
                  value={summaryTitle} 
                  onChange={e => setSummaryTitle(e.target.value)} 
                  required 
                />
              </div>

              {/* Transcrição da IA */}
              <div className="form-group">
                <label className="form-label" htmlFor="ocr-transcription">Conteúdo Transcrito (Markdown)</label>
                <textarea 
                  id="ocr-transcription" 
                  className="form-input form-textarea" 
                  style={{ height: '180px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                  value={analysisResult.transcription} 
                  onChange={e => setAnalysisResult({ ...analysisResult, transcription: e.target.value })} 
                  required 
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={fecharEResetar}>Descartar</button>
                <button type="submit" className="btn btn-primary" disabled={createSummaryMutation.isPending}>
                  <Save size={14} />
                  {createSummaryMutation.isPending ? 'Salvando...' : 'Salvar como Resumo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
