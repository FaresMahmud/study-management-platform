import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/layout/Sidebar';
import OnboardingModal from './components/OnboardingModal';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import StudySessions from './pages/StudySessions';
import Goals from './pages/Goals';
import Summaries from './pages/Summaries';
import Analytics from './pages/Analytics';
import Flashcards from './pages/Flashcards';
import StudyWorkspace from './pages/StudyWorkspace';
import Quiz from './pages/Quiz';
import Simulation from './pages/Simulation';
import PublicShareView from './pages/PublicShareView';
import Podcast from './pages/Podcast';
import FocusMode from './pages/FocusMode';
import StudySession from './pages/StudySession';
import ExamMode from './pages/ExamMode';
import './styles/theme.css';
import './styles/global.css';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const hasCheckedOnboarding = useRef(false);

  useEffect(() => {
    if (hasCheckedOnboarding.current) return;
    hasCheckedOnboarding.current = true;

    const onboarded = localStorage.getItem('study_onboarded');
    if (isAuthenticated && onboarded !== 'true') {
      // Defer setState to avoid synchronous setState in effect
      setTimeout(() => setOnboardingOpen(true), 0);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/') return 'dashboard';
    if (path.startsWith('/workspace')) return 'workspace';
    if (path.startsWith('/subjects')) return 'subjects';
    if (path.startsWith('/flashcards')) return 'flashcards';
    if (path.startsWith('/analytics')) return 'analytics';
    return 'settings';
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'dashboard') navigate('/');
    if (tab === 'workspace') navigate('/workspace');
    if (tab === 'subjects') navigate('/subjects');
    if (tab === 'flashcards') navigate('/flashcards');
    if (tab === 'analytics') navigate('/analytics');
    if (tab === 'settings') navigate('/focus');
    // Close mobile sidebar on navigation
    setSidebarMobileOpen(false);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${sidebarMobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setSidebarMobileOpen(false)}
        aria-hidden="true"
      />
      <Sidebar
        activeTab={getActiveTab()}
        setActiveTab={handleTabChange}
        isMobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />
      <main className="dashboard-main">
        <Outlet />
      </main>
      <OnboardingModal isOpen={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}

function PublicLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/public/share/:token" element={<PublicShareView />} />
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/sessions" element={<StudySessions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/summaries" element={<Summaries />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/workspace" element={<StudyWorkspace />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/podcast" element={<Podcast />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="/study" element={<StudySession onFinish={() => window.location.href = '/'} />} />
            <Route path="/exam" element={<ExamMode onFinish={() => window.location.href = '/'} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
