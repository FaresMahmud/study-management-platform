import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  BookOpen, 
  LayoutDashboard, 
  Calendar, 
  Target, 
  LogOut, 
  User 
} from 'lucide-react';

export default function Navbar() {
  const { userName, logout } = useAuthStore();
  const location = useLocation();

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
          <Link to="/subjects" className={`navbar-link ${isActive('/subjects')}`}>
            <BookOpen size={18} />
            <span>Matérias</span>
          </Link>
          <Link to="/sessions" className={`navbar-link ${isActive('/sessions')}`}>
            <Calendar size={18} />
            <span>Sessões</span>
          </Link>
          <Link to="/goals" className={`navbar-link ${isActive('/goals')}`}>
            <Target size={18} />
            <span>Metas</span>
          </Link>
        </div>

        <div className="navbar-user">
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
