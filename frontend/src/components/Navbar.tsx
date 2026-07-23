import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { calcularStreak } from '../utils/streak';
import type { StudySession } from '../types';
import { 
  BookOpen, 
  LayoutDashboard, 
  Calendar, 
  Target, 
  LogOut, 
  User,
  FileText,
  Flame,
  TrendingUp,
  Brain,
  HelpCircle,
  Compass,
  Headphones
} from 'lucide-react';

export default function Navbar() {
  const { userName, logout, isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Busca as sessões de estudo para calcular o Streak diário
  const { data: sessions = [] } = useQuery<StudySession[]>({
    queryKey: ['sessions'],
    queryFn: async () => (await apiClient.get<StudySession[]>('/api/study-sessions')).data,
    enabled: !!isAuthenticated, // Só busca se estiver autenticado
  });

  const streak = calcularStreak(sessions);

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <BookOpen size={24} />
          <span>StudyFlow</span>
        </Link>

        <div className="navbar-menu">
          <Link to="/" className={`navbar-link ${isActive('/')}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/workspace" className={`navbar-link ${isActive('/workspace')}`}>
            <BookOpen size={18} />
            <span>Matérias & PDFs</span>
          </Link>
          <Link to="/summaries" className={`navbar-link ${isActive('/summaries')}`}>
            <FileText size={18} />
            <span>Resumos</span>
          </Link>
          <Link to="/flashcards" className={`navbar-link ${isActive('/flashcards')}`}>
            <Brain size={18} />
            <span>Flashcards</span>
          </Link>
          <Link to="/quiz" className={`navbar-link ${isActive('/quiz')}`}>
            <HelpCircle size={18} />
            <span>Quizzes</span>
          </Link>
          <Link to="/simulation" className={`navbar-link ${isActive('/simulation')}`}>
            <Compass size={18} />
            <span>Simulados</span>
          </Link>
          <Link to="/podcast" className={`navbar-link ${isActive('/podcast')}`}>
            <Headphones size={18} />
            <span>Podcasts</span>
          </Link>
          <Link to="/analytics" className={`navbar-link ${isActive('/analytics')}`}>
            <TrendingUp size={18} />
            <span>Evolução</span>
          </Link>
          <Link to="/sessions" className={`navbar-link ${isActive('/sessions')}`}>
            <Calendar size={18} />
            <span>Histórico</span>
          </Link>
          <Link to="/goals" className={`navbar-link ${isActive('/goals')}`}>
            <Target size={18} />
            <span>Metas de Maestria</span>
          </Link>
          <Link to="/subjects" className={`navbar-link ${isActive('/subjects')}`}>
            <BookOpen size={18} />
            <span>Matérias</span>
          </Link>
        </div>

        <div className="navbar-user">
          {streak > 0 && (
            <div className="streak-badge" title={`${streak} dias seguidos de estudo!`}>
              <Flame size={18} className="flame-icon animate-pulse" />
              <span>{streak} {streak === 1 ? 'Dia' : 'Dias'}</span>
            </div>
          )}

          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('open-onboarding'))}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '6px', 
              border: 'none', 
              background: 'transparent', 
              cursor: 'pointer', 
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Ver Tutorial de Onboarding"
          >
            <HelpCircle size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <User size={18} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{userName}</span>
          </div>
          <button 
            onClick={logout} 
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
