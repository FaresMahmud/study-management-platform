import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Brain, FileText, Image, Paperclip, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { triggerConfetti } from '../utils/confetti';
import type { Summary } from '../types';

interface SummaryEditorProps {
  selectedSubjectId: number | '';
  activeSummaryId: number | null;
  activeSummary: Summary | undefined;
  editorRef: React.RefObject<HTMLDivElement | null>;
  onManualFlashcardClick: (selectedText: string) => void;
  onUpgradeRequired: () => void;
}

export default function SummaryEditor({
  selectedSubjectId,
  activeSummaryId,
  activeSummary,
  editorRef,
  onManualFlashcardClick,
  onUpgradeRequired
}: SummaryEditorProps) {
  const queryClient = useQueryClient();
  const premium = useAuthStore(state => state.premium);

  const [editorTitle, setEditorTitle] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvo, setUltimoSalvo] = useState('');
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [subindoArquivo, setSubindoArquivo] = useState(false);

  // Sync summary contents when activeSummary changes
  useEffect(() => {
    if (activeSummary) {
      setEditorTitle(activeSummary.title);
      if (editorRef.current) {
        editorRef.current.innerHTML = activeSummary.content;
      }
      setUltimoSalvo(new Date(activeSummary.lastModifiedDate || activeSummary.creationDate).toLocaleTimeString());
    } else {
      setEditorTitle('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [activeSummaryId, activeSummary, editorRef]);

  // Autosave Summary mutation
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

  // AI Flashcard Generation mutation
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
    onError: (err: any) => {
      if (err.response?.data?.message === 'upgrade_required') {
        onUpgradeRequired();
      } else {
        alert('Erro ao gerar flashcards via inteligência artificial.');
      }
    }
  });

  const handleGenerateAiFlashcards = () => {
    if (!premium) {
      onUpgradeRequired();
      return;
    }

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

  const handleCreateFlashcardFromSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText) {
      alert('Selecione um texto no seu resumo para usar como a frente do flashcard!');
      return;
    }

    onManualFlashcardClick(selectedText);
  };

  const handleInsertFile = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file || !selectedSubjectId) return;

    setSubindoArquivo(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', String(selectedSubjectId));

    try {
      const response = await apiClient.post<{ id: number; fileName: string }>('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const data = response.data;
      const fileUrl = `${apiClient.defaults.baseURL}/api/files/${data.id}/view`;

      if (editorRef.current) {
        editorRef.current.focus();
      }

      if (fileType === 'image') {
        const imgHtml = `<img src="${fileUrl}" alt="${data.fileName}" style="max-width: 100%; max-height: 400px; border-radius: var(--radius-sm); margin: 8px 0; display: block; border: 1px solid var(--border-color);" />&nbsp;`;
        document.execCommand('insertHTML', false, imgHtml);
      } else {
        const pdfHtml = `<a href="${fileUrl}" target="_blank" contenteditable="false" style="display: inline-flex; align-items: center; gap: 6px; background-color: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 4px 8px; color: var(--primary); font-size: 0.8rem; text-decoration: none; margin: 4px 0; font-weight: 500; vertical-align: middle;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg><span>${data.fileName}</span></a>&nbsp;`;
        document.execCommand('insertHTML', false, pdfHtml);
      }

      handleEditorInput();
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload do anexo para o resumo.');
    } finally {
      setSubindoArquivo(false);
      e.target.value = '';
    }
  };

  if (!activeSummaryId) {
    return (
      <div className="flex-center" style={{ flex: 1, flexDirection: 'column', color: 'var(--text-secondary)', padding: 'var(--space-md)' }}>
        <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h3>Nenhum resumo aberto</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
          Crie um novo resumo do zero ou selecione um documento existente para sincronizar com sua aula.
        </p>
      </div>
    );
  }

  return (
    <div className="editor-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px var(--space-md)' }}>
      {/* Editor Header */}
      <div className="editor-header" style={{ marginBottom: '16px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <input 
            type="text"
            className="editor-title-input"
            placeholder="Sem Título"
            value={editorTitle}
            onChange={handleTitleChange}
            style={{ fontSize: '1.5rem', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', width: '100%' }}
          />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {salvando ? 'Salvando resumo...' : ultimoSalvo ? `Salvo às ${ultimoSalvo}` : 'Pronto'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleCreateFlashcardFromSelection} 
            title="Criar Flashcard Manual"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
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
              boxShadow: '0 0 10px rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
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
      <div className="editor-toolbar" style={{ marginBottom: '8px', flexShrink: 0, display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="toolbar-btn" onClick={() => document.execCommand('bold')} title="Negrito">B</button>
        <button type="button" className="toolbar-btn" onClick={() => document.execCommand('italic')} title="Itálico">I</button>
        <button type="button" className="toolbar-btn" onClick={() => document.execCommand('underline')} title="Sublinhado">U</button>
        <div className="toolbar-separator" style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 6px' }} />
        <button type="button" className="toolbar-btn" onClick={() => document.execCommand('insertUnorderedList')} title="Lista Sem Ordenação">List</button>
        <button type="button" className="toolbar-btn" onClick={() => document.execCommand('formatBlock', '<blockquote>')} title="Citação">Quote</button>
        <div className="toolbar-separator" style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 6px' }} />
        
        {/* Hidden inputs for uploading */}
        <input 
          type="file" 
          id="summary-image-upload" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={(e) => handleInsertFile(e, 'image')} 
          disabled={subindoArquivo} 
        />
        <input 
          type="file" 
          id="summary-pdf-upload" 
          accept=".pdf" 
          style={{ display: 'none' }} 
          onChange={(e) => handleInsertFile(e, 'pdf')} 
          disabled={subindoArquivo} 
        />

        <button 
          type="button" 
          className="toolbar-btn text-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
          onClick={() => document.getElementById('summary-image-upload')?.click()}
          disabled={subindoArquivo}
          title="Inserir Foto/Imagem no Resumo"
        >
          {subindoArquivo ? <Loader2 size={12} className="animate-spin" /> : <Image size={12} />}
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Foto</span>
        </button>
        
        <button 
          type="button" 
          className="toolbar-btn text-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px' }}
          onClick={() => document.getElementById('summary-pdf-upload')?.click()}
          disabled={subindoArquivo}
          title="Inserir PDF/Documento no Resumo"
        >
          {subindoArquivo ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>PDF</span>
        </button>
      </div>

      {/* Content Area */}
      <div 
        ref={editorRef}
        className="editor-content-area"
        contentEditable
        onInput={handleEditorInput}
        data-placeholder="Escreva suas anotações da aula e resumos integrados aqui..."
        style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px', outline: 'none' }}
      />
    </div>
  );
}
