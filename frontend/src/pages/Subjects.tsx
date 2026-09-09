import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Activity, ArrowRight, BookOpen, ChevronDown, ChevronUp, Clock, Edit2, FileText, FolderOpen, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, normalizeListResponse } from '../api/client';
import { useToast } from '../hooks/useToast';
import type { SpringPage, Subject, Summary, Goal, Flashcard, StudySession, PDFFile } from '../types';

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
  const toast = useToast();
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
      const response = await apiClient.get<SpringPage<Subject>>('/api/subjects?size=1000');
      return normalizeListResponse<Subject>(response.data);
    },
  });

  // Fetch summaries
  const { data: summaries = [], isLoading: loadingSummaries } = useQuery<Summary[]>({
    queryKey: ['summaries'],
    queryFn: async () => {
      const response = await apiClient.get<SpringPage<Summary>>('/api/summaries?size=1000');
      return normalizeListResponse<Summary>(response.data);
    },
  });

  // Fetch goals
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiClient.get<{ content?: Goal[] }>('/api/v1/goals?size=1000');
      return normalizeListResponse<Goal>(response.data);
    },
  });

  // Fetch flashcards
  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ['flashcards'],
    queryFn: async () => {
      const response = await apiClient.get<{ content?: Flashcard[] }>('/api/flashcards?size=1000');
      return normalizeListResponse<Flashcard>(response.data);
    },
  });

  // Fetch sessions
  const { data: sessions = [] } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await apiClient.get<{ content?: StudySession[] }>('/api/study-sessions?size=1000');
      return normalizeListResponse<StudySession>(response.data);
    },
  });

  // Fetch uploaded files (PDFs)
  const { data: uploadedFiles = [] } = useQuery<PDFFile[]>({
    queryKey: ['uploaded-files'],
    queryFn: async () => {
      const response = await apiClient.get<SpringPage<PDFFile>>('/api/files?size=1000');
      return normalizeListResponse<PDFFile>(response.data);
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
      toast.success('Matéria criada com sucesso!');
    },
    onError: (err) => {
      let msg = 'Erro ao criar matéria.';
      if (axios.isAxiosError(err) && err.message) {
        msg = err.message;
      }
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        msg = String(err.response.data.message);
      }
      setFormError(msg);
      toast.error(msg);
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
      toast.success('Matéria atualizada com sucesso!');
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
      toast.error(msg);
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
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      toast.success('Matéria excluída com sucesso!');
    },
    onError: (err: unknown) => {
      let msg = 'Erro ao excluir matéria.';
      if (axios.isAxiosError(err)) {
        if (err.response?.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
          msg = String(err.response.data.message);
        } else if (err.message) {
          msg = err.message;
        }
      }
      toast.error(msg);
    }
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '28px', fontWeight: 800 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {subjects.map((subj) => {
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
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button onClick={() => openEditModal(subj)} style={{ padding: '4px', color: 'var(--text-secondary)' }} title="Editar">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(subj.id, subj.subjectName)} style={{ padding: '4px', color: 'var(--danger)' }} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: 'var(--space-xs)', lineHeight: 1.5 }}>
                    {subj.subjectDescription || 'Nenhuma descrição informada.'}
                  </p>

                  {/* Barra de progresso da matéria baseada na Maestria do Goal */}
                  {(() => {
                    const subjGoal = goals.find(g => g.subject?.id === subj.id);
                    const mastery = subjGoal ? Math.round(subjGoal.currentMastery) : 0;
                    return (
                      <div style={{ marginTop: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>Proficiência acumulada</span>
                          <strong style={{ color: subj.color || 'var(--primary)' }}>{mastery}%</strong>
                        </div>
                        <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div className="progress-bar-fill" style={{ width: `${mastery}%`, backgroundColor: subj.color || 'var(--primary)' }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ marginTop: '21px', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {(() => {
                      const cardsCount = flashcards.filter(f => f.subject?.id === subj.id).length;
                      const subjectFiles = uploadedFiles.filter(f => f.subjectId === subj.id || (f as any).subject?.id === subj.id);
                      const subjectSummaries = summaries.filter(s => s.subject?.id === subj.id);
                      return (
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span><strong>{cardsCount}</strong> Flashcards</span>
                          <span>•</span>
                          <span><strong>{subjectFiles.length}</strong> PDFs</span>
                          <span>•</span>
                          <span><strong>{subjectSummaries.length}</strong> Resumos</span>
                        </div>
                      );
                    })()}

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
                    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Seção 1: PDFs enviados */}
                      {(() => {
                        const subjectFiles = uploadedFiles.filter(f => f.subjectId === subj.id || (f as any).subject?.id === subj.id);
                        return (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-xs)' }}>
                              <FileText size={13} style={{ color: subj.color || 'var(--primary)' }} />
                              PDFs de Estudo ({subjectFiles.length})
                            </span>
                            {subjectFiles.length === 0 ? (
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Nenhum PDF anexado. <Link to={`/workspace?subjectId=${subj.id}`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Enviar PDF na Área de Estudo</Link>
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {subjectFiles.map(f => (
                                  <Link
                                    key={f.id}
                                    to={`/workspace?subjectId=${subj.id}&fileId=${f.id}`}
                                    className="sessao-recente-item"
                                    style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                    title="Abrir este PDF na Área de Estudos"
                                  >
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>📄 {f.fileName}</span>
                                    <ArrowRight size={12} />
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Seção 2: Resumos & Anotações */}
                      {(() => {
                        const subjectSummaries = summaries.filter(s => s.subject?.id === subj.id);
                        return (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-xs)' }}>
                              <BookOpen size={13} style={{ color: subj.color || 'var(--primary)' }} />
                              Páginas de Resumos ({subjectSummaries.length})
                            </span>
                            {subjectSummaries.length === 0 ? (
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Nenhum resumo criado ainda.
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {subjectSummaries.map(sum => (
                                  <Link
                                    key={sum.id}
                                    to={`/workspace?subjectId=${subj.id}&summaryId=${sum.id}`}
                                    className="sessao-recente-item"
                                    style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  >
                                    <span>📝 {sum.title}</span>
                                    <ArrowRight size={12} />
                                  </Link>
                                ))}
                              </div>
                            )}
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
            <Plus size={36} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xs)' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>Adicionar Nova Matéria</span>
          </div>

        </div>
      )}

      {/* Seção Atividade Recente no rodapé */}
      <div className="card" style={{ marginTop: '20px', padding: '21px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} />
          Atividade Recente
        </h3>
        {sessions.length === 0 && summaries.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
            Nenhuma atividade de estudos ou upload registrado. Comece enviando um PDF ou completando uma sessão de foco!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.slice(0, 2).map(session => (
              <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '13px' }}>
                  <Clock size={14} style={{ color: 'var(--primary)' }} />
                  <span>Você estudou a matéria "{session.subject?.subjectName}" por {session.duration} minutos.</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ativo</span>
              </div>
            ))}
            {summaries.slice(0, 2).map(sum => (
              <div key={sum.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: '13px' }}>
                  <FileText size={14} style={{ color: 'var(--success)' }} />
                  <span>Upload do material "{sum.title}" concluído com sucesso.</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Processado</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}><X size={20} /></button>
            <h2 className="modal-title">{editingSubject ? 'Editar Matéria' : 'Nova Matéria'}</h2>

            {formError && (
              <div style={{ padding: '10px', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: 'var(--space-md)', fontSize: '13px' }}>
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
                <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', marginTop: 'var(--space-xs)' }}>
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      style={{
                        width: 'var(--space-lg)',
                        height: 'var(--space-lg)',
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
