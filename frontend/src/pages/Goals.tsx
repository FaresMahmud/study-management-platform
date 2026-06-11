import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import type { Goal, Subject } from '../types';
import { Plus, Edit2, Trash2, X, Target, Calendar } from 'lucide-react';

interface GoalInput {
  title: string;
  progress: number;
  objectiveHours: number;
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
  const [objectiveHours, setObjectiveHours] = useState<number>(10);
  const [progress, setProgress] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>('');
  const [subjectId, setSubjectId] = useState<number | string>('');
  const [formError, setFormError] = useState('');

  // Fetch goals
  const { data: goals = [], isLoading: isLoadingGoals } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiClient.get<Goal[]>('/api/goals');
      return response.data;
    },
  });

  // Fetch subjects for select dropdown
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<Subject[]>('/api/subjects');
      return response.data;
    },
  });

  // Create Goal Mutation
  const createMutation = useMutation({
    mutationFn: async (newGoal: GoalInput) => {
      return apiClient.post('/api/goals', newGoal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
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
        progress: updated.progress,
        objectiveHours: updated.objectiveHours,
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
    setObjectiveHours(10);
    setProgress(0);
    setStartDate(new Date().toISOString().split('T')[0]);
    // Default end date: 30 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setEndDate(futureDate.toISOString().split('T')[0]);
    setSubjectId('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setObjectiveHours(goal.objectiveHours);
    setProgress(goal.progress);
    setStartDate(goal.startDateGoal);
    setEndDate(goal.endDateGoal);
    setSubjectId(goal.subject ? goal.subject.id : '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGoal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('O título da meta é obrigatório.');
      return;
    }

    if (objectiveHours <= 0) {
      setFormError('O objetivo de horas deve ser maior que 0.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('A data de início não pode ser posterior à data de fim.');
      return;
    }

    const payload = {
      title,
      progress: Number(progress),
      objectiveHours: Number(objectiveHours),
      startDateGoal: startDate,
      endDateGoal: endDate,
      subjectId: subjectId ? Number(subjectId) : null,
    };

    if (editingGoal) {
      updateMutation.mutate({
        id: editingGoal.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
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
    <div>
      <div className="title-section">
        <div>
          <h1>Minhas Metas</h1>
          <p className="subtitle">Defina e acompanhe objetivos de horas de estudo</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={20} />
          <span>Nova Meta</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Carregando metas...</div>
      ) : goals.length === 0 ? (
        <div className="card empty-state">
          <Target size={48} />
          <h2>Nenhuma meta cadastrada</h2>
          <p style={{ marginBottom: '1.5rem' }}>Que tal definir sua primeira meta de estudos para se manter motivado?</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {goals.map((goal) => {
            const percentage = Math.min(Math.round((goal.progress / goal.objectiveHours) * 100), 100);
            const isCompleted = goal.progress >= goal.objectiveHours;
            const daysRemaining = calculateDaysRemaining(goal.endDateGoal);
            
            return (
              <div key={goal.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
                <div>
                  <div className="card-title">
                    <span style={{ fontWeight: 700 }}>{goal.title}</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
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
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
                      <span className="badge badge-primary" style={{ backgroundColor: `${goal.subject.color || 'var(--primary)'}22`, color: goal.subject.color || 'var(--primary)' }}>
                        <span className="color-dot" style={{ backgroundColor: goal.subject.color, margin: 0, marginRight: '6px' }} />
                        {goal.subject.subjectName}
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="badge badge-secondary" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                        Meta Geral
                      </span>
                    </div>
                  )}

                  <div className="flex-between" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Progresso: {goal.progress}h de {goal.objectiveHours}h</span>
                    <span style={{ fontWeight: 600, color: isCompleted ? 'var(--success)' : 'var(--text-primary)' }}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: isCompleted ? 'var(--success)' : (goal.subject?.color || 'var(--primary)') 
                      }} 
                    />
                  </div>
                </div>

                <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>
            <h2 className="modal-title">
              {editingGoal ? 'Editar Meta' : 'Criar Meta'}
            </h2>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="goal-title">Título da Meta</label>
                <input
                  id="goal-title"
                  type="text"
                  className="form-input"
                  placeholder="Ex: Estudar Banco de Dados para a Prova"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="goal-subject">Matéria Relacionada (Opcional)</label>
                <select
                  id="goal-subject"
                  className="form-input"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">Nenhuma (Meta Geral)</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="goal-obj-hours">Objetivo (Horas)</label>
                  <input
                    id="goal-obj-hours"
                    type="number"
                    className="form-input"
                    min="1"
                    value={objectiveHours}
                    onChange={(e) => setObjectiveHours(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="goal-progress">Progresso Inicial (Horas)</label>
                  <input
                    id="goal-progress"
                    type="number"
                    className="form-input"
                    min="0"
                    step="0.1"
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="goal-start">Data de Início</label>
                  <input
                    id="goal-start"
                    type="date"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="goal-end">Data de Fim</label>
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

              <div className="modal-actions">
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
