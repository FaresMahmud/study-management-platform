import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import type { StudySession, Subject } from '../types';
import { Plus, Edit2, Trash2, X, Calendar, Clock, FileText, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface StudySessionInput {
  duration: number;
  sessionDate: string;
  observations: string;
  subjectId: number;
}

export default function StudySessions() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Form State
  const [duration, setDuration] = useState<number>(60);
  const [sessionDate, setSessionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [subjectId, setSubjectId] = useState<number | string>('');
  const [observations, setObservations] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch study sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await apiClient.get<StudySession[]>('/api/study-sessions');
      return response.data;
    },
  });

  // Fetch subjects for dropdown selection
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<Subject[]>('/api/subjects');
      return response.data;
    },
  });

  // Create session mutation
  const createMutation = useMutation({
    mutationFn: async (newSession: StudySessionInput) => {
      return apiClient.post('/api/study-sessions', newSession);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      // Invalida metas para recalcular o progresso atualizado!
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
    onError: (err) => {
      let msg = 'Erro ao registrar sessão de estudo.';
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

  // Update session mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: StudySessionInput & { id: number }) => {
      return apiClient.put(`/api/study-sessions/${updated.id}`, {
        duration: updated.duration,
        sessionDate: updated.sessionDate,
        observations: updated.observations,
        subjectId: updated.subjectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      closeModal();
    },
    onError: (err) => {
      let msg = 'Erro ao atualizar sessão.';
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

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/api/study-sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  const openCreateModal = () => {
    setEditingSession(null);
    setDuration(60);
    setSessionDate(new Date().toISOString().split('T')[0]);
    setSubjectId(subjects.length > 0 ? subjects[0].id : '');
    setObservations('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (session: StudySession) => {
    setEditingSession(session);
    setDuration(session.duration);
    setSessionDate(session.sessionDate);
    setSubjectId(session.subject.id);
    setObservations(session.observations || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!subjectId) {
      setFormError('Selecione uma matéria.');
      return;
    }

    if (duration <= 0) {
      setFormError('A duração deve ser maior que 0 minutos.');
      return;
    }

    const payload = {
      duration,
      sessionDate,
      observations,
      subjectId: Number(subjectId),
    };

    if (editingSession) {
      updateMutation.mutate({
        id: editingSession.id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Deseja realmente excluir esta sessão de estudo? Esta ação não pode ser desfeita.')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredSessions = sessions.filter(session => {
    if (subjectFilter === 'all') return true;
    return session.subject.id.toString() === subjectFilter;
  });

  const isLoading = isLoadingSessions || isLoadingSubjects;

  return (
    <div>
      <div className="title-section">
        <div>
          <h1>Sessões de Estudo</h1>
          <p className="subtitle">Registre o tempo gasto focando em cada matéria</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openCreateModal}
          disabled={subjects.length === 0}
        >
          <Plus size={20} />
          <span>Registrar Sessão</span>
        </button>
      </div>

      {subjects.length === 0 && !isLoading && (
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--warning-glow)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Você precisa criar pelo menos uma matéria antes de registrar sessões de estudo.</span>
          <Link to="/subjects" className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--warning)' }}>
            Criar Matéria
          </Link>
        </div>
      )}

      {/* Filter panel */}
      {sessions.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Filter size={16} />
              Filtrar por:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.4rem 2rem 0.4rem 0.75rem', fontSize: '0.875rem' }}
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="all">Todas as matérias</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Carregando dados...</div>
      ) : sessions.length === 0 ? (
        <div className="card empty-state">
          <Calendar size={48} />
          <h2>Nenhuma sessão registrada</h2>
          <p style={{ marginBottom: '1.5rem' }}>Organize seu tempo e comece a registrar seus estudos!</p>
          <button 
            className="btn btn-primary" 
            onClick={openCreateModal}
            disabled={subjects.length === 0}
          >
            Registrar primeira sessão
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="card empty-state">
          <Calendar size={48} />
          <h2>Nenhuma sessão encontrada para este filtro</h2>
          <p>Experimente mudar o filtro de matéria ou registrar uma nova sessão.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Matéria</th>
                <th>Duração</th>
                <th>Observações</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                      <Calendar size={14} className="text-muted" />
                      {formatDate(session.sessionDate)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span 
                        className="color-dot" 
                        style={{ backgroundColor: session.subject.color || 'var(--primary)' }} 
                      />
                      <span style={{ fontWeight: 600 }}>{session.subject.subjectName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                      {formatDuration(session.duration)}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileText size={14} className="text-muted" />
                      <span>{session.observations || 'Nenhuma observação.'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ padding: '0.35rem', borderRadius: '4px' }}
                        onClick={() => openEditModal(session)}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        style={{ padding: '0.35rem', borderRadius: '4px' }}
                        onClick={() => handleDelete(session.id)}
                        title="Deletar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal overlay */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>
            <h2 className="modal-title">
              {editingSession ? 'Editar Sessão' : 'Registrar Sessão'}
            </h2>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="sess-subject">Matéria</label>
                <select
                  id="sess-subject"
                  className="form-input"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                >
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sess-duration">Duração (Minutos)</label>
                <input
                  id="sess-duration"
                  type="number"
                  className="form-input"
                  min="1"
                  max="1440"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Isso equivale a: {formatDuration(duration)}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sess-date">Data da Sessão</label>
                <input
                  id="sess-date"
                  type="date"
                  className="form-input"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="sess-obs">Conteúdo Estudado / Anotações</label>
                <textarea
                  id="sess-obs"
                  className="form-input form-textarea"
                  placeholder="Ex: Exercícios sobre inner e left joins, teoria sobre DDL e DML."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  maxLength={1000}
                />
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
                  {editingSession ? 'Salvar Alterações' : 'Salvar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
