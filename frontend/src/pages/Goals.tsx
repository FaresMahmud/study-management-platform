import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Edit2, Plus, Target, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { apiClient, normalizeListResponse } from '../api/client';
import type { Goal, SpringPage, Subject } from '../types';

interface GoalInput {
  title: string;
  targetMastery: number;
  currentMastery: number;
  startDateGoal: string;
  endDateGoal: string;
  subjectId: number | null;
}

export default function Goals() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [targetMastery, setTargetMastery] = useState<number>(80);
  const [currentMastery, setCurrentMastery] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [formError, setFormError] = useState('');

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiClient.get<SpringPage<Goal>>('/api/goals?size=1000');
      return normalizeListResponse<Goal>(response.data);
    },
  });

  // Fetch subjects for select dropdown
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<SpringPage<Subject>>('/api/subjects?size=1000');
      return normalizeListResponse<Subject>(response.data);
    },
  });

  // Create Goal Mutation
  const createMutation = useMutation({
    mutationFn: async (newGoal: GoalInput) => {
      return apiClient.post('/api/goals', newGoal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (err) => {
      let msg = 'Erro ao criar meta.';
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

  // Update Goal Mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: GoalInput & { id: number }) => {
      return apiClient.put(`/api/goals/${updated.id}`, {
        title: updated.title,
        targetMastery: updated.targetMastery,
        currentMastery: updated.currentMastery,
        startDateGoal: updated.startDateGoal,
        endDateGoal: updated.endDateGoal,
        subjectId: updated.subjectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
    onError: (err) => {
      let msg = 'Erro ao atualizar meta.';
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

  // Delete Goal Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const openCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetMastery(80);
    setCurrentMastery(0);
    setStartDate(new Date().toISOString().split('T')[0]);
    // Default end date: 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setEndDate(futureDate.toISOString().split('T')[0]);
    setSelectedSubjectIds([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetMastery(goal.targetMastery);
    setCurrentMastery(goal.currentMastery);
    setStartDate(goal.startDateGoal);
    setEndDate(goal.endDateGoal);
    setSelectedSubjectIds(goal.subject ? [goal.subject.id] : []);
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('O título da meta é obrigatório.');
      return;
    }

    if (targetMastery <= 0 || targetMastery > 100) {
      setFormError('A meta de domínio deve ser entre 1% e 100%.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('A data de início não pode ser posterior à data de fim.');
      return;
    }

    const basePayload = {
      title,
      targetMastery: Number(targetMastery),
      currentMastery: Number(currentMastery),
      startDateGoal: startDate,
      endDateGoal: endDate,
    };

    try {
      if (editingGoal) {
        await updateMutation.mutateAsync({
          id: editingGoal.id,
          ...basePayload,
          subjectId: selectedSubjectIds.length > 0 ? selectedSubjectIds[0] : null
        });
      } else {
        if (selectedSubjectIds.length === 0) {
          await createMutation.mutateAsync({
            ...basePayload,
            subjectId: null
          });
        } else {
          for (const subId of selectedSubjectIds) {
            const sub = subjects.find(s => s.id === subId);
            await createMutation.mutateAsync({
              ...basePayload,
              title: `${title} (${sub?.subjectName})`,
              subjectId: subId
            });
          }
        }
        closeModal();
      }
    } catch (err) {
      // O erro é tratado no callback onError da mutation
    }
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Tem certeza que deseja excluir a meta "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const calculateDaysRemaining = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expirada';
    if (diffDays === 0) return 'Termina hoje';
    if (diffDays === 1) return '1 dia restante';
    return `${diffDays} dias restantes`;
  };

  const isLoading = isLoadingGoals || isLoadingSubjects;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="title-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: 'var(--space-lg)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Metas de Maestria</h1>
          <p className="subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Defina e monitore objetivos de proficiência por disciplina de estudo</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} />
          <span>Nova Meta</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ minHeight: '200px', color: 'var(--text-secondary)' }}>Carregando metas...</div>
      ) : goals.length === 0 ? (
        <div className="card empty-state" style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
          <h2 style={{ fontSize: '21px', fontWeight: 700 }}>Nenhuma meta cadastrada</h2>
          <p style={{ marginBottom: '13px', fontSize: '13px', color: 'var(--text-secondary)' }}>Defina sua primeira meta de maestria para acompanhar sua evolução no painel.</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Criar Primeira Meta de Maestria
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 'var(--space-xs)' }}>
          {goals.map((goal) => {
            const percentage = Math.round(goal.completionPercentage || 0);
            const isCompleted = percentage >= 100;
            const daysRemaining = calculateDaysRemaining(goal.endDateGoal);

            return (
              <div key={goal.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px', padding: 'var(--space-sm)' }}>
                <div>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px' }}>{goal.title}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => openEditModal(goal)}
                        style={{ color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id, goal.title)}
                        style={{ color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {goal.subject ? (
                    <div style={{ marginBottom: '13px', display: 'flex', alignItems: 'center' }}>
                      <span className="badge badge-primary" style={{ backgroundColor: `${goal.subject.color || 'var(--primary)'}22`, color: goal.subject.color || 'var(--primary)', padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}>
                        <span className="color-dot" style={{ backgroundColor: goal.subject.color, margin: 0, marginRight: '6px' }} />
                        {goal.subject.subjectName}
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '13px' }}>
                      <span className="badge badge-secondary" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}>
                        Meta Geral
                      </span>
                    </div>
                  )}

                  <div className="flex-between" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Progresso: {goal.currentMastery}% de {goal.targetMastery}% de maestria</span>
                    <span style={{ fontWeight: 600, color: isCompleted ? 'var(--success)' : 'var(--text-primary)' }}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: isCompleted ? 'var(--success)' : (goal.subject?.color || 'var(--primary)')
                      }}
                    />
                  </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '13px', marginTop: '13px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {formatDate(goal.startDateGoal)} até {formatDate(goal.endDateGoal)}
                  </span>
                  <span style={{
                    fontWeight: 600,
                    color: daysRemaining === 'Expirada' ? 'var(--danger)' : daysRemaining === 'Termina hoje' || daysRemaining === '1 dia restante' ? 'var(--warning)' : 'var(--text-secondary)'
                  }}>
                    {daysRemaining}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: 'var(--space-sm)' }}>
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>
            <h2 className="modal-title" style={{ fontSize: '21px', fontWeight: 700, marginBottom: '13px' }}>
              {editingGoal ? 'Editar Meta de Maestria' : 'Criar Meta de Maestria'}
            </h2>

            {formError && (
              <div style={{ padding: '8px 13px', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '13px', fontSize: '13px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '13px' }}>
                <label className="form-label" htmlFor="goal-title" style={{ fontSize: '13px', marginBottom: '5px' }}>Título da Meta</label>
                <input
                  id="goal-title"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Dominar Banco de Dados Relacional"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '13px' }}>
                <label className="form-label" style={{ fontSize: '13px', marginBottom: '5px' }}>Matérias Relacionadas (Selecione uma ou mais)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.length === 0}
                      onChange={() => setSelectedSubjectIds([])}
                    />
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Nenhuma (Meta Geral)</span>
                  </label>
                  {subjects.map((sub) => (
                    <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(sub.id)}
                        onChange={() => {
                          setSelectedSubjectIds(prev => 
                            prev.includes(sub.id) 
                              ? prev.filter(id => id !== sub.id) 
                              : [...prev, sub.id]
                          );
                        }}
                      />
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: sub.color || 'var(--primary)' }} />
                      <span>{sub.subjectName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px', marginBottom: '13px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="goal-curr-mastery" style={{ fontSize: '13px', marginBottom: '5px' }}>Domínio Atual (%)</label>
                  <input
                    id="goal-curr-mastery"
                    type="number"
                    className="form-input"
                    min="0"
                    max="100"
                    value={currentMastery}
                    onChange={(e) => setCurrentMastery(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="goal-target-mastery" style={{ fontSize: '13px', marginBottom: '5px' }}>Domínio Alvo (%)</label>
                  <input
                    id="goal-target-mastery"
                    type="number"
                    className="form-input"
                    min="1"
                    max="100"
                    value={targetMastery}
                    onChange={(e) => setTargetMastery(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px', marginBottom: '13px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="goal-start" style={{ fontSize: '13px', marginBottom: '5px' }}>Data de Início</label>
                  <input
                    id="goal-start"
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="goal-end" style={{ fontSize: '13px', marginBottom: '5px' }}>Data Limite</label>
                  <input
                    id="goal-end"
                    type="date"
                    className="form-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '21px', gap: '13px' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
