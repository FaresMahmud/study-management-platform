import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
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

  useEffect(() => {
    const onboarded = localStorage.getItem('study_onboarded');
    if (isAuthenticated && onboarded !== 'true') {
      setOnboardingOpen(true);
    }

    const handleOpenOnboarding = () => setOnboardingOpen(true);
    window.addEventListener('open-onboarding', handleOpenOnboarding);
    return () => window.removeEventListener('open-onboarding', handleOpenOnboarding);
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
