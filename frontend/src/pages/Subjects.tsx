import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import type { Subject } from '../types';
import { Plus, Edit2, Trash2, X, FolderOpen } from 'lucide-react';

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
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [formError, setFormError] = useState('');

  // Fetch subjects
  const { data: subjects = [], isLoading, error } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<Subject[]>('/api/subjects');
      return response.data;
    },
  });

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
      // Invalida sessões e metas também pois podem ter sido excluídas em cascata
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
    if (confirm(`Tem certeza que deseja deletar a matéria "${name}"? Todas as sessões de estudo e metas vinculadas a ela serão excluídas definitivamente.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="title-section">
        <div>
          <h1>Minhas Matérias</h1>
          <p className="subtitle">Gerencie as disciplinas e áreas de foco dos seus estudos</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={20} />
          <span>Nova Matéria</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex-center" style={{ minHeight: '200px' }}>Carregando matérias...</div>
      ) : error ? (
        <div style={{ color: 'var(--danger)', padding: '1rem', backgroundColor: 'var(--danger-glow)', borderRadius: 'var(--radius-md)' }}>
          Erro ao carregar matérias do servidor.
        </div>
      ) : subjects.length === 0 ? (
        <div className="card empty-state">
          <FolderOpen size={48} />
          <h2>Nenhuma matéria cadastrada</h2>
          <p style={{ marginBottom: '1.5rem' }}>Comece criando uma matéria como "Matemática", "Programação" ou "História".</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Criar primeira matéria
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {subjects.map((subj) => (
            <div key={subj.id} className="card" style={{ borderLeft: `5px solid ${subj.color || 'var(--primary)'}` }}>
              <div className="card-title">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {subj.subjectName}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    onClick={() => openEditModal(subj)} 
                    style={{ color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                    title="Editar matéria"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(subj.id, subj.subjectName)} 
                    style={{ color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                    title="Excluir matéria"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                {subj.subjectDescription || 'Sem descrição cadastrada.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal ModalOverlay para criar/editar */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>
            <h2 className="modal-title">
              {editingSubject ? 'Editar Matéria' : 'Nova Matéria'}
            </h2>

            {formError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
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
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
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
