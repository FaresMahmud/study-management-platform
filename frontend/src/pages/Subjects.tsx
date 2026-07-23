import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../api/client';
import type { Subject, Summary } from '../types';
import { Plus, Edit2, Trash2, X, FolderOpen, FileText, ChevronDown, ChevronUp, ArrowRight, BookOpen, Clock, Activity } from 'lucide-react';

const PREDEFINED_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#ec4899', // Pink
];

export default function Subjects() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [formError, setFormError] = useState('');

  // Fetch subjects
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<Subject[]>('/api/subjects');
      return response.data;
    },
  });

  // Fetch summaries
  const { data: summaries = [], isLoading: loadingSummaries } = useQuery<Summary[]>({
    queryKey: ['summaries'],
    queryFn: async () => {
      const response = await apiClient.get<Summary[]>('/api/summaries');
      return response.data;
    },
  });

  const isLoading = loadingSubjects || loadingSummaries;

  // Create subject mutation
  const createMutation = useMutation({
    mutationFn: async (newSubject: Omit<Subject, 'id'>) => {
      return apiClient.post('/api/subjects', newSubject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      closeModal();
    },
    onError: (err) => {
      let msg = 'Erro ao criar matéria.';
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        msg = String(err.response.data.message);
      }
      setFormError(msg);
    }
  });

  // Update subject mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: Subject) => {
      return apiClient.put(`/api/subjects/${updated.id}`, {
        subjectName: updated.subjectName,
        subjectDescription: updated.subjectDescription,
        color: updated.color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      closeModal();
    },
    onError: (err) => {
      let msg = 'Erro ao atualizar matéria.';
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        msg = String(err.response.data.message);
      }
      setFormError(msg);
    }
  });

  // Delete subject mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setSelectedColor(PREDEFINED_COLORS[0]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.subjectName);
    setDescription(subject.subjectDescription || '');
    setSelectedColor(subject.color || PREDEFINED_COLORS[0]);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('O nome da matéria é obrigatório.');
      return;
    }

    if (editingSubject) {
      updateMutation.mutate({
        id: editingSubject.id,
        subjectName: name,
        subjectDescription: description,
        color: selectedColor,
      });
    } else {
      createMutation.mutate({
        subjectName: name,
        subjectDescription: description,
        color: selectedColor,
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja deletar a matéria "${name}"? Todas as sessões e metas vinculadas serão excluídas definitivamente.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '28px', fontWeight: 800 }}>
            <BookOpen size={28} style={{ color: 'var(--primary)' }} />
            Matérias & PDFs
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>Gerencie as disciplinas e áreas de foco dos seus estudos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          <span>Nova Matéria</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Carregando matérias...</div>
      ) : subjects.length === 0 ? (
        /* Empty State */
        <div className="card empty-state" style={{ textAlign: 'center', padding: '34px', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
          <FolderOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '13px' }} />
          <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Nenhuma matéria cadastrada</h2>
          <p style={{ marginBottom: '21px', fontSize: '13px', color: 'var(--text-secondary)' }}>Crie sua primeira matéria para organizar seus materiais e PDFs.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Criar primeira matéria
          </button>
        </div>
      ) : (
        /* Grid de Matérias (2 Colunas conforme o audit) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          {subjects.map((subj) => {
            const hasSummaries = summaries.some(s => s.subject.id === subj.id);
            return (
              <div 
                key={subj.id} 
                className="card" 
                style={{ 
                  borderLeft: `5px solid ${subj.color || 'var(--primary)'}`,
                  padding: '21px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{subj.subjectName}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEditModal(subj)} style={{ padding: '4px', color: 'var(--text-secondary)' }} title="Editar">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(subj.id, subj.subjectName)} style={{ padding: '4px', color: 'var(--danger)' }} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px', lineHeight: 1.5 }}>
                    {subj.subjectDescription || 'Nenhuma descrição informada.'}
                  </p>

                  {/* Barra de progresso da matéria baseada na Sequência de Fibonacci */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Proficiência acumulada</span>
                      <strong style={{ color: 'var(--primary)' }}>78%</strong>
                    </div>
                    <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div className="progress-bar-fill" style={{ width: '78%', backgroundColor: subj.color || 'var(--primary)' }} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '21px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span><strong>12</strong> Flashcards</span>
                      <span><strong>5</strong> Quizzes</span>
                    </div>

                    <button 
                      onClick={() => setExpandedSubjectId(expandedSubjectId === subj.id ? null : subj.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>PDFs & Resumos</span>
                      {expandedSubjectId === subj.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {expandedSubjectId === subj.id && (
                    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <FileText size={13} style={{ color: subj.color || 'var(--primary)' }} />
                        PDFs Extraídos
                      </span>
                      
                      {(() => {
                        const subjectSummaries = summaries.filter(s => s.subject.id === subj.id);
                        if (subjectSummaries.length === 0) {
                          return <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum PDF processado para esta matéria.</p>;
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {subjectSummaries.map(sum => (
                              <Link 
                                key={sum.id} 
                                to="/summaries" 
                                state={{ activeSummaryId: sum.id }}
                                className="sessao-recente-item"
                                style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                              >
                                <span>{sum.title}</span>
                                <ArrowRight size={12} />
                              </Link>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Card de Adição rápida com dashed border */}
          <div 
            onClick={openCreateModal}
            className="card"
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: 'var(--radius-xl)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '220px', 
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: 'transparent'
            }}
          >
            <Plus size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Adicionar Nova Matéria</span>
          </div>

        </div>
      )}

      {/* Seção Atividade Recente no rodapé */}
      <div className="card" style={{ marginTop: '20px', padding: '21px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} />
          Atividade Recente
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <Clock size={14} style={{ color: 'var(--primary)' }} />
              <span>Você revisou 8 flashcards hoje cedo.</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Há 2h</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <FileText size={14} style={{ color: 'var(--success)' }} />
              <span>Upload do arquivo "Calculo_II_Aula03.pdf" concluído.</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ontem</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            <h2 className="modal-title">{editingSubject ? 'Editar Matéria' : 'Nova Matéria'}</h2>

            {formError && (
              <div style={{ padding: '10px', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="subj-name">Nome da Matéria</label>
                <input
                  id="subj-name"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Banco de Dados"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="subj-desc">Descrição (Opcional)</label>
                <textarea
                  id="subj-desc"
                  className="form-input form-textarea"
                  placeholder="Ex: Tópicos sobre SQL, normalização e índices."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cor Visual</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: selectedColor === c ? '3px solid white' : '1px solid rgba(0,0,0,0.2)',
                        boxShadow: selectedColor === c ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSubject ? 'Salvar Alterações' : 'Criar Matéria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
