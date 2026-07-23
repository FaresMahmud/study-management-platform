import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Flashcard, Subject } from '../types';
import { Brain, Layers, HelpCircle, Trash2, Edit3, Plus, Check, RotateCcw, ArrowRight, X, Sparkles } from 'lucide-react';

export default function Flashcards() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'review' | 'manage'>('review');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Manage state (create/edit modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [formFront, setFormFront] = useState('');
  const [formBack, setFormBack] = useState('');
  const [formSubjectId, setFormSubjectId] = useState<number | ''>('');
  const [formError, setFormError] = useState('');

  // Queries
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
  });

  const { data: allCards = [], isLoading: loadingAll } = useQuery<Flashcard[]>({
    queryKey: ['flashcards'],
    queryFn: async () => (await apiClient.get<Flashcard[]>('/api/flashcards')).data,
  });

  const { data: dueCards = [], isLoading: loadingDue } = useQuery<Flashcard[]>({
    queryKey: ['flashcards-due'],
    queryFn: async () => (await apiClient.get<Flashcard[]>('/api/flashcards/due')).data,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (newCard: { front: string; back: string; subjectId: number }) => {
      return (await apiClient.post<Flashcard>('/api/flashcards', newCard)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
      fecharModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: number; data: { front: string; back: string; subjectId: number } }) => {
      return (await apiClient.put<Flashcard>(`/api/flashcards/${payload.id}`, payload.data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
      fecharModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/flashcards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (payload: { id: number; quality: 'easy' | 'good' | 'hard' }) => {
      return (await apiClient.post<Flashcard>(`/api/flashcards/${payload.id}/review?quality=${payload.quality}`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['flashcards-due'] });
      
      setShowAnswer(false);
      setReviewedCount(c => c + 1);
      setCurrentIndex(i => i + 1);
    },
  });

  // Keyboard Navigation shortcuts (1, 2, 3, 4) + Space for Flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'review' || dueCards.length === 0 || currentIndex >= dueCards.length) return;
      
      // Don't trigger shortcuts inside text inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setShowAnswer(prev => !prev);
      } else if (showAnswer) {
        if (e.key === '1') handleReview('hard'); // De Novo
        if (e.key === '2') handleReview('hard'); // Difícil
        if (e.key === '3') handleReview('good'); // Bom
        if (e.key === '4') handleReview('easy'); // Fácil
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, dueCards, currentIndex, showAnswer]);

  const abrirCriar = () => {
    setEditingCard(null);
    setFormFront('');
    setFormBack('');
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setFormError('');
    setModalOpen(true);
  };

  const abrirEditar = (card: Flashcard) => {
    setEditingCard(card);
    setFormFront(card.front);
    setFormBack(card.back);
    setFormSubjectId(card.subject.id);
    setFormError('');
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditingCard(null);
    setFormFront('');
    setFormBack('');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFront.trim() || !formBack.trim() || !formSubjectId) {
      setFormError('Todos os campos obrigatórios devem ser preenchidos.');
      return;
    }

    const payload = {
      front: formFront,
      back: formBack,
      subjectId: Number(formSubjectId)
    };

    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleReview = (quality: 'easy' | 'good' | 'hard') => {
    if (currentIndex >= dueCards.length) return;
    const card = dueCards[currentIndex];
    reviewMutation.mutate({ id: card.id, quality });
  };

  const reiniciarRevisoes = () => {
    setCurrentIndex(0);
    setReviewedCount(0);
    setShowAnswer(false);
  };

  // FSRS metrics
  const totalAtrasadosCount = dueCards.length;
  const totalHojeCount = dueCards.length;
  const totalNovosCount = allCards.filter(c => c.box === 1).length;
  const totalCartoes = allCards.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease-out' }}>
      
      <style>{`
        .srs-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .srs-indicator-card {
          padding: 13px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          text-align: center;
          background-color: var(--bg-secondary);
        }
        .flashcard-box {
          perspective: 1000px;
          width: 100%;
          min-height: 240px;
          cursor: pointer;
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 240px;
          transition: transform 0.4s;
          transform-style: preserve-3d;
        }
        .flashcard-inner.flipped {
          transform: rotateY(180deg);
        }
        .flashcard-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
        }
        .flashcard-face.back {
          transform: rotateY(180deg);
          border-color: var(--primary);
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99, 102, 241, 0.05) 100%);
        }
        .fsrs-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 13px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
        }
        .fsrs-btn:hover {
          transform: translateY(-2px);
        }
        .fsrs-btn.again { border-color: var(--danger); background-color: var(--danger-glow); color: var(--danger); }
        .fsrs-btn.hard { border-color: var(--warning); background-color: var(--warning-glow); color: var(--warning); }
        .fsrs-btn.good { border-color: var(--primary); background-color: var(--primary-glow); color: var(--primary); box-shadow: 0 0 10px var(--primary-glow); }
        .fsrs-btn.easy { border-color: var(--success); background-color: var(--success-glow); color: var(--success); }
      `}</style>

      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '28px', fontWeight: 800 }}>
            <Brain size={28} style={{ color: 'var(--primary)' }} />
            Flashcards
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>Memorização ativa e repetição espaçada usando FSRS</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${activeTab === 'review' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setActiveTab('review')}>
            <Layers size={16} />
            Revisar ({dueCards.length})
          </button>
          <button className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setActiveTab('manage')}>
            Gerenciar Todos ({allCards.length})
          </button>
        </div>
      </div>

      {activeTab === 'review' ? (
        /* ================= TELA DE REVISÃO ATIVA FSRS ================= */
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          
          {/* Header e Fila SRS */}
          <div className="srs-grid" style={{ marginBottom: '20px' }}>
            <div className="srs-indicator-card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Atrasados</span>
              <p style={{ fontSize: '21px', fontWeight: 900, color: 'var(--danger)' }}>{totalAtrasadosCount}</p>
            </div>
            <div className="srs-indicator-card" style={{ borderLeft: '4px solid var(--warning)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Para Hoje</span>
              <p style={{ fontSize: '21px', fontWeight: 900, color: 'var(--warning)' }}>{totalHojeCount}</p>
            </div>
            <div className="srs-indicator-card" style={{ borderLeft: '4px solid var(--success)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Novos</span>
              <p style={{ fontSize: '21px', fontWeight: 900, color: 'var(--success)' }}>{totalNovosCount}</p>
            </div>
            <div className="srs-indicator-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total</span>
              <p style={{ fontSize: '21px', fontWeight: 900, color: 'var(--primary)' }}>{totalCartoes}</p>
            </div>
          </div>

          {loadingDue ? (
            <div className="flex-center" style={{ height: '240px' }}>Carregando revisões...</div>
          ) : dueCards.length === 0 ? (
            <div className="card empty-state" style={{ textAlign: 'center', padding: '34px' }}>
              <Check size={48} style={{ color: 'var(--success)', marginBottom: '13px' }} />
              <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Nada para revisar hoje! 🎉</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '21px' }}>Suas revisões estão em dia. Que tal carregar novos arquivos e PDFs?</p>
              <button className="btn btn-primary" onClick={() => setActiveTab('manage')}>Criar Flashcard Manual</button>
            </div>
          ) : currentIndex >= dueCards.length ? (
            <div className="card empty-state" style={{ textAlign: 'center', padding: '34px' }}>
              <Check size={48} style={{ color: 'var(--success)', marginBottom: '13px' }} />
              <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Sessão Concluída!</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '21px' }}>Você revisou {reviewedCount} cartões nesta rodada.</p>
              <button className="btn btn-primary" onClick={reiniciarRevisoes}>Reiniciar Sessão</button>
            </div>
          ) : (
            <div>
              {/* Área de Estudo Ativo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>Revisando {currentIndex + 1} de {dueCards.length}</span>
                <span>Matéria: <strong>{dueCards[currentIndex].subject.subjectName}</strong></span>
              </div>

              <div className="flashcard-box" onClick={() => setShowAnswer(prev => !prev)} style={{ marginBottom: '20px' }}>
                <div className={`flashcard-inner ${showAnswer ? 'flipped' : ''}`}>
                  {/* FRENTE */}
                  <div className="flashcard-face front">
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '16px' }}>Frente</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.4 }}>{dueCards[currentIndex].front}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', position: 'absolute', bottom: '16px' }}>Clique ou Pressione Space para revelar</span>
                  </div>

                  {/* VERSO */}
                  <div className="flashcard-face back">
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em', marginBottom: '16px' }}>Verso</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', lineHeight: 1.5 }}>{dueCards[currentIndex].back}</h3>
                    
                    {dueCards[currentIndex].summaryTitle && (
                      <div className="explanation-box" style={{ width: '100%', marginTop: '20px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Origem do PDF: {dueCards[currentIndex].summaryTitle}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões FSRS de Rating com Atalhos */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {!showAnswer ? (
                  <button className="btn btn-primary" style={{ width: '100%', maxWidth: '280px' }} onClick={() => setShowAnswer(true)}>Mostrar Resposta</button>
                ) : (
                  <>
                    <button className="fsrs-btn again" onClick={() => handleReview('hard')}>
                      <span>De Novo (1)</span>
                      <small style={{ fontSize: '10px', opacity: 0.8 }}>< 1min</small>
                    </button>
                    <button className="fsrs-btn hard" onClick={() => handleReview('hard')}>
                      <span>Difícil (2)</span>
                      <small style={{ fontSize: '10px', opacity: 0.8 }}>2 dias</small>
                    </button>
                    <button className="fsrs-btn good" onClick={() => handleReview('good')}>
                      <span>Bom (3)</span>
                      <small style={{ fontSize: '10px', opacity: 0.8 }}>5 dias</small>
                    </button>
                    <button className="fsrs-btn easy" onClick={() => handleReview('easy')}>
                      <span>Fácil (4)</span>
                      <small style={{ fontSize: '10px', opacity: 0.8 }}>12 dias</small>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Grid de Decks (Seção 5.3) */}
          <div style={{ marginTop: '34px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Seus Decks por Matéria</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {subjects.map(subj => {
                const count = allCards.filter(c => c.subject.id === subj.id).length;
                return (
                  <div key={subj.id} className="card" style={{ padding: '16px', borderLeft: `4px solid ${subj.color}` }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{subj.subjectName}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{count} cartões carregados</p>
                    
                    <button 
                      onClick={() => { setActiveTab('review'); reiniciarRevisoes(); }}
                      className="btn btn-secondary btn-sm" 
                      style={{ width: '100%', marginTop: '13px', fontSize: '12px' }}
                      disabled={count === 0}
                    >
                      Estudar Deck
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* ================= TELA DE GERENCIAMENTO ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <div className="flex-between">
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Banco de Flashcards</h2>
            <button className="btn btn-primary btn-sm" onClick={abrirCriar}>
              <Plus size={16} />
              Criar Flashcard
            </button>
          </div>

          {loadingAll ? (
            <div className="flex-center" style={{ minHeight: '200px' }}>Carregando cartões...</div>
          ) : allCards.length === 0 ? (
            <div className="card empty-state" style={{ textAlign: 'center', padding: '34px' }}>
              <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '13px' }} />
              <h2>Nenhum flashcard criado</h2>
              <button className="btn btn-primary" onClick={abrirCriar}>Criar Primeiro Flashcard</button>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Frente (Pergunta)</th>
                    <th>Verso (Resposta)</th>
                    <th>Matéria</th>
                    <th>Estado Leitner</th>
                    <th>Próxima Revisão</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {allCards.map(card => {
                    const nextDate = new Date(card.nextReviewDate);
                    const isDue = nextDate.getTime() <= Date.now();
                    return (
                      <tr key={card.id}>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{card.front}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>{card.back}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <span className="color-dot" style={{ backgroundColor: card.subject.color, margin: 0 }} />
                            {card.subject.subjectName}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${card.box === 5 ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '10px' }}>
                            Caixa {card.box}
                          </span>
                        </td>
                        <td>
                          {isDue ? (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>Pendente</span>
                          ) : (
                            <span style={{ fontSize: '11px' }}>{nextDate.toLocaleDateString()}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary btn-sm" style={{ padding: '6px', marginRight: '4px' }} onClick={() => abrirEditar(card)}>
                            <Edit3 size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '6px' }} onClick={() => deleteMutation.mutate(card.id)}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={fecharModal}><X size={20} /></button>
            <h2 className="modal-title">{editingCard ? 'Editar Flashcard' : 'Novo Flashcard'}</h2>
            
            {formError && <div style={{ padding: '8px 12px', backgroundColor: 'var(--danger-glow)', color: 'var(--danger)', marginBottom: '13px', fontSize: '13px' }}>{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="card-subject">Matéria Associada</label>
                <select id="card-subject" className="form-input" value={formSubjectId} onChange={e => setFormSubjectId(e.target.value ? Number(e.target.value) : '')} required>
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="card-front">Frente (Pergunta)</label>
                <textarea id="card-front" className="form-input" style={{ minHeight: '80px' }} placeholder="Ex: Qual é a fórmula da velocidade média?" value={formFront} onChange={e => setFormFront(e.target.value)} maxLength={500} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="card-back">Verso (Resposta)</label>
                <textarea id="card-back" className="form-input" style={{ minHeight: '80px' }} placeholder="Ex: V = d / t" value={formBack} onChange={e => setFormBack(e.target.value)} maxLength={1000} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingCard ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
