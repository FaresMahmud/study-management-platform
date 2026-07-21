import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { Flashcard, Subject } from '../types';
import { 
  Brain, 
  Layers, 
  HelpCircle, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  RotateCcw, 
  ArrowRight
} from 'lucide-react';

export default function Flashcards() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'review' | 'manage'>('review');

  // Flashcards reviews state
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
      
      // Prossiga para o próximo cartão
      setShowAnswer(false);
      setReviewedCount(c => c + 1);
      setCurrentIndex(i => i + 1);
    },
  });

  // Helpers
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

  const getQualityText = (box: number) => {
    switch (box) {
      case 1: return 'Caixa 1 (1 dia)';
      case 2: return 'Caixa 2 (3 dias)';
      case 3: return 'Caixa 3 (7 dias)';
      case 4: return 'Caixa 4 (14 dias)';
      case 5: return 'Caixa 5 (30 dias)';
      default: return `Caixa ${box}`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', animation: 'fadeIn 0.3s ease-out' }}>
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--space-lg)', fontWeight: 700 }}>
            <Brain size={28} style={{ color: 'var(--primary)' }} />
            Flashcards
          </h1>
          <p className="subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Memorização ativa e repetição espaçada usando o Leitner System</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${activeTab === 'review' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('review')}
          >
            <Layers size={16} />
            Revisar Pendentes ({dueCards.length - currentIndex > 0 ? dueCards.length - currentIndex : 0})
          </button>
          <button 
            className={`btn ${activeTab === 'manage' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setActiveTab('manage')}
          >
            <HelpCircle size={16} />
            Gerenciar Todos ({allCards.length})
          </button>
        </div>
      </div>

      {activeTab === 'review' ? (
        /* ================= TELA DE REVISÃO DIÁRIA ================= */
        <div style={{ maxWidth: '640px', width: '100%', margin: '0 auto', padding: '0 var(--space-xs)' }}>
          {loadingDue ? (
            <div className="flex-center" style={{ height: '300px', color: 'var(--text-secondary)' }}>
              Carregando cartões agendados...
            </div>
          ) : dueCards.length === 0 ? (
            <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
              <Check size={56} style={{ color: 'var(--success)', marginBottom: '8px' }} />
              <h2 style={{ fontSize: '21px', fontWeight: 700 }}>Nada para revisar hoje!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '13px', fontSize: '13px', maxWidth: '400px', margin: '8px auto' }}>
                Parabéns! Suas revisões estão em dia. Que tal criar novos flashcards a partir dos seus resumos?
              </p>
              <button className="btn btn-secondary" onClick={() => setActiveTab('manage')}>
                Criar Flashcard Manualmente
              </button>
            </div>
          ) : currentIndex >= dueCards.length ? (
            <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
              <Check size={56} style={{ color: 'var(--success)', marginBottom: '8px' }} />
              <h2 style={{ fontSize: '21px', fontWeight: 700 }}>Sessão Concluída! 🎉</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '13px', fontSize: '13px' }}>
                Você revisou <strong style={{ color: 'var(--primary)' }}>{reviewedCount}</strong> cartões nesta sessão. Continue mantendo seus hábitos!
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={reiniciarRevisoes}>
                  <RotateCcw size={16} />
                  Revisar Novamente
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('manage')}>
                  Ver Todos os Cartões
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Progresso da revisão */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Revisando: <strong>{currentIndex + 1}</strong> de {dueCards.length}</span>
                <span>Restante: {dueCards.length - currentIndex}</span>
              </div>
              
              <div className="progress-bar-container" style={{ height: '6px', marginBottom: '21px', borderRadius: '3px' }}>
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${((currentIndex) / dueCards.length) * 100}%`, 
                    backgroundColor: 'var(--primary)',
                    transition: 'width 0.3s ease'
                  }} 
                />
              </div>

              {/* Cartão 3D Flip */}
              <div className="flashcard-container" style={{ perspective: '1000px', width: '100%', minHeight: '320px', marginBottom: '21px' }}>
                <div 
                  className={`flashcard-inner ${showAnswer ? 'flipped' : ''}`}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '320px',
                    textAlign: 'center',
                    transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformStyle: 'preserve-3d',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  {/* FRENTE */}
                  <div 
                    className="card flashcard-face flashcard-front"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-lg)'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '13px', left: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="color-dot" style={{ backgroundColor: dueCards[currentIndex].subject.color }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {dueCards[currentIndex].subject.subjectName}
                      </span>
                    </div>

                    <div style={{ fontSize: '21px', fontWeight: 500, color: 'var(--text-primary)', padding: '0 13px', wordBreak: 'break-word' }}>
                      {dueCards[currentIndex].front}
                    </div>

                    <div style={{ position: 'absolute', bottom: '13px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      Clique no cartão para revelar a resposta
                    </div>
                  </div>

                  {/* VERSO */}
                  <div 
                    className="card flashcard-face flashcard-back"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 'var(--space-md)',
                      border: '1px solid var(--primary)',
                      boxShadow: 'var(--shadow-lg)',
                      background: 'linear-gradient(to bottom, var(--bg-secondary) 0%, hsla(217, 91%, 60%, 0.04) 100%)'
                    }}
                  >
                    <div style={{ position: 'absolute', top: '13px', left: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="color-dot" style={{ backgroundColor: dueCards[currentIndex].subject.color }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {dueCards[currentIndex].subject.subjectName} (Verso)
                      </span>
                    </div>

                    <div style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-primary)', padding: '0 13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {dueCards[currentIndex].back}
                    </div>

                    {dueCards[currentIndex].summaryTitle && (
                      <div style={{ position: 'absolute', bottom: '13px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        Origem: <strong style={{ color: 'var(--primary)' }}>{dueCards[currentIndex].summaryTitle}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões de Ação de Feedback */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {!showAnswer ? (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', maxWidth: '280px' }}
                    onClick={() => setShowAnswer(true)}
                  >
                    Revelar Resposta
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-danger" 
                      style={{ flex: 1 }}
                      onClick={() => handleReview('hard')}
                      disabled={reviewMutation.isPending}
                    >
                      Errei (Amanhã)
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1 }}
                      onClick={() => handleReview('good')}
                      disabled={reviewMutation.isPending}
                    >
                      Bom
                    </button>
                    <button 
                      className="btn btn-success" 
                      style={{ flex: 1 }}
                      onClick={() => handleReview('easy')}
                      disabled={reviewMutation.isPending}
                    >
                      Fácil
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= TELA DE GERENCIAMENTO DE FLASHCARDS ================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <div className="flex-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Ficha de Todos os Flashcards</h2>
            <button className="btn btn-primary btn-sm" onClick={abrirCriar}>
              <Plus size={16} />
              Criar Flashcard
            </button>
          </div>

          {loadingAll ? (
            <div className="flex-center" style={{ minHeight: '200px', color: 'var(--text-secondary)' }}>
              Carregando lista de cartões...
            </div>
          ) : allCards.length === 0 ? (
            <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
              <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Nenhum flashcard criado ainda</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '13px', fontSize: '13px' }}>
                Comece criando seu primeiro cartão de estudo para revisar os tópicos importantes.
              </p>
              <button className="btn btn-primary" onClick={abrirCriar}>
                Criar Primeiro Flashcard
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Pergunta (Frente)</th>
                    <th>Resposta (Verso)</th>
                    <th>Matéria</th>
                    <th>Estado de Revisão</th>
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
                        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }} title={card.front}>
                          {card.front}
                        </td>
                        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }} title={card.back}>
                          {card.back}
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            <span className="color-dot" style={{ backgroundColor: card.subject.color, margin: 0 }} />
                            {card.subject.subjectName}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${card.box === 5 ? 'badge-success' : 'badge-primary'}`} style={{ fontSize: '10px' }}>
                            {getQualityText(card.box)}
                          </span>
                        </td>
                        <td>
                          {isDue ? (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>Pendente</span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {nextDate.toLocaleDateString()} {nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '4px' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }} 
                              onClick={() => abrirEditar(card)}
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }} 
                              onClick={() => { if (confirm('Tem certeza que deseja excluir este flashcard?')) deleteMutation.mutate(card.id); }}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* ================= MODAL: CRIAR / EDITAR FLASHCARD ================= */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', padding: 'var(--space-sm)' }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={fecharModal} aria-label="Fechar">
              <X size={20} />
            </button>
            <h2 className="modal-title" id="modal-title" style={{ fontSize: '21px', fontWeight: 700, marginBottom: '13px' }}>
              {editingCard ? 'Editar Flashcard' : 'Novo Flashcard'}
            </h2>
            
            {formError && (
              <div style={{ padding: '8px 13px', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '13px', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '13px' }}>
                <label className="form-label" htmlFor="card-subject" style={{ fontSize: '13px', marginBottom: '5px' }}>Matéria Associada</label>
                <select 
                  id="card-subject" 
                  className="form-input" 
                  value={formSubjectId} 
                  onChange={e => setFormSubjectId(e.target.value ? Number(e.target.value) : '')} 
                  required
                >
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '13px' }}>
                <label className="form-label" htmlFor="card-front" style={{ fontSize: '13px', marginBottom: '5px' }}>Frente / Pergunta</label>
                <textarea 
                  id="card-front" 
                  className="form-input" 
                  style={{ minHeight: '75px', resize: 'vertical' }}
                  placeholder="Ex: Qual é a fórmula da fotossíntese?" 
                  value={formFront} 
                  onChange={e => setFormFront(e.target.value)} 
                  maxLength={500}
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '13px' }}>
                <label className="form-label" htmlFor="card-back" style={{ fontSize: '13px', marginBottom: '5px' }}>Verso / Resposta</label>
                <textarea 
                  id="card-back" 
                  className="form-input" 
                  style={{ minHeight: '75px', resize: 'vertical' }}
                  placeholder="Ex: 6 CO2 + 6 H2O + Luz -> C6H12O6 + 6 O2" 
                  value={formBack} 
                  onChange={e => setFormBack(e.target.value)} 
                  maxLength={1000}
                  required 
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '21px', gap: '13px' }}>
                <button type="button" className="btn btn-secondary" onClick={fecharModal}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Cartão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
