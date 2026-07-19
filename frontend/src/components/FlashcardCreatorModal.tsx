import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';

interface FlashcardCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFront: string;
  subjectId: number | '';
  summaryId: number | null;
}

export default function FlashcardCreatorModal({
  isOpen,
  onClose,
  initialFront,
  subjectId,
  summaryId
}: FlashcardCreatorModalProps) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [error, setError] = useState('');

  // Sincroniza a seleção inicial
  useEffect(() => {
    if (isOpen) {
      setFront(initialFront);
      setBack('');
      setError('');
    }
  }, [isOpen, initialFront]);

  const createFlashcardMutation = useMutation({
    mutationFn: async (newCard: { front: string; back: string; subjectId: number; summaryId?: number }) => {
      return (await apiClient.post('/api/flashcards', newCard)).data;
    },
    onSuccess: () => {
      triggerConfetti();
      onClose();
      alert('Flashcard criado com sucesso! 🎉');
    }
  });

  const handleSaveFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim() || !subjectId) {
      setError('Ambos os campos são obrigatórios.');
      return;
    }

    createFlashcardMutation.mutate({
      front: front.trim(),
      back: back.trim(),
      subjectId: Number(subjectId),
      summaryId: summaryId || undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }} role="dialog" aria-modal="true" aria-labelledby="fc-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <h2 className="modal-title" id="fc-modal-title">Criar Flashcard</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Gere uma pergunta rápida baseada na sua seleção.
        </p>
        
        {error && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSaveFlashcard}>
          <div className="form-group">
            <label className="form-label" htmlFor="fc-front">Frente / Pergunta (Trecho Selecionado)</label>
            <textarea 
              id="fc-front" 
              className="form-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={front} 
              onChange={e => setFront(e.target.value)} 
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
              value={back} 
              onChange={e => setBack(e.target.value)} 
              maxLength={1000}
              required 
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
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
  );
}
