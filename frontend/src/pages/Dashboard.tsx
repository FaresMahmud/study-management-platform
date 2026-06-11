import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { StudySession, Subject, Goal } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Clock, 
  BookOpen, 
  Target, 
  CheckCircle, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  // Fetch sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await apiClient.get<StudySession[]>('/api/study-sessions');
      return response.data;
    },
  });

  // Fetch subjects
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await apiClient.get<Subject[]>('/api/subjects');
      return response.data;
    },
  });

  // Fetch goals
  const { data: goals = [], isLoading: loadingGoals } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: async () => {
      const response = await apiClient.get<Goal[]>('/api/goals');
      return response.data;
    },
  });

  const isLoading = loadingSessions || loadingSubjects || loadingGoals;

  // Calculos de Estatisticas
  const totalMinutes = sessions.reduce((acc, curr) => acc + curr.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const completedGoals = goals.filter(g => g.progress >= g.objectiveHours).length;
  const activeGoals = goals.length - completedGoals;

  // Formata dados para o grafico: Horas estudadas por materia
  const chartData = subjects.map(subj => {
    const subjSessions = sessions.filter(s => s.subject.id === subj.id);
    const mins = subjSessions.reduce((acc, curr) => acc + curr.duration, 0);
    return {
      name: subj.subjectName,
      hours: Number((mins / 60).toFixed(2)),
      color: subj.color || '#6366f1'
    };
  }).filter(data => data.hours > 0); // Só mostra se tiver tempo estudado

  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
    .slice(0, 5);

  const activeGoalsList = goals
    .filter(g => g.progress < g.objectiveHours)
    .slice(0, 3);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return <div className="flex-center" style={{ minHeight: '400px' }}>Carregando dados do painel...</div>;
  }

  return (
    <div>
      <div className="title-section" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1>Meu Painel de Estudos</h1>
          <p className="subtitle">Visão geral do seu foco, metas e evolução</p>
        </div>
      </div>

      {/* Grid de Estatísticas Rápidas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Estudado</h3>
            <p>{totalHours}h</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>Matérias Ativas</h3>
            <p>{subjects.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-glow)', color: 'var(--warning)' }}>
            <Target size={24} />
          </div>
          <div className="stat-info">
            <h3>Metas em Andamento</h3>
            <p>{activeGoals}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-glow)', color: 'var(--success)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>Metas Concluídas</h3>
            <p>{completedGoals}</p>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="card empty-state" style={{ padding: '4rem 2rem' }}>
          <Calendar size={64} style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }} />
          <h2>Bem-vindo ao seu painel!</h2>
          <p style={{ maxWidth: '600px', margin: '0 auto 2rem', color: 'var(--text-secondary)' }}>
            Para ver estatísticas detalhadas e gráficos de barra de distribuição, comece cadastrando suas matérias e registrando suas primeiras sessões de estudo.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/subjects" className="btn btn-primary">
              Cadastrar Matéria
            </Link>
            <Link to="/sessions" className="btn btn-secondary">
              Registrar Sessões
            </Link>
          </div>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Coluna Esquerda: Gráfico e Histórico Recente */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Gráfico de Distribuição */}
            <div className="card">
              <h2 className="card-title" style={{ marginBottom: '1.5rem' }}>Tempo Estudado por Matéria (Horas)</h2>
              {chartData.length === 0 ? (
                <div className="flex-center" style={{ height: '250px', color: 'var(--text-muted)' }}>
                  Ainda não há dados suficientes para renderizar o gráfico. Registre durações de estudos nas sessões.
                </div>
              ) : (
                <div style={{ width: '100%', height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis 
                        dataKey="name" 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false} 
                      />
                      <YAxis 
                        stroke="var(--text-muted)" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-tertiary)', 
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Ultimas Sessões */}
            <div className="card">
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>Sessões Recentes</h2>
                <Link to="/sessions" className="navbar-link" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Ver todas <ChevronRight size={16} />
                </Link>
              </div>

              {recentSessions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>Nenhuma sessão registrada recentemente.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentSessions.map(session => (
                    <div 
                      key={session.id} 
                      className="flex-between" 
                      style={{ 
                        padding: '0.875rem 1.25rem', 
                        backgroundColor: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-md)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span 
                          className="color-dot" 
                          style={{ backgroundColor: session.subject.color, margin: 0 }} 
                        />
                        <div>
                          <p style={{ fontWeight: 600 }}>{session.subject.subjectName}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(session.sessionDate)}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                        <Clock size={14} style={{ color: 'var(--primary)' }} />
                        {formatDuration(session.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Metas Recentes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ height: '100%' }}>
              <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title" style={{ margin: 0 }}>Metas Ativas</h2>
                <Link to="/goals" className="navbar-link" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  Ver todas <ChevronRight size={16} />
                </Link>
              </div>

              {activeGoalsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                  <Target size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                  <p>Nenhuma meta em andamento.</p>
                  <Link to="/goals" className="btn btn-secondary btn-sm" style={{ marginTop: '1rem' }}>
                    Criar Meta
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {activeGoalsList.map(goal => {
                    const percentage = Math.min(Math.round((goal.progress / goal.objectiveHours) * 100), 100);
                    return (
                      <div key={goal.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{goal.title}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{percentage}%</span>
                        </div>
                        
                        <div className="progress-bar-container" style={{ margin: '0.25rem 0' }}>
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: goal.subject?.color || 'var(--primary)' 
                            }} 
                          />
                        </div>

                        <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>{goal.progress}h / {goal.objectiveHours}h estudadas</span>
                          {goal.subject && (
                            <span style={{ color: goal.subject.color }}>
                              {goal.subject.subjectName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
