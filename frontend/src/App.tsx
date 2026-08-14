import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudySession from './pages/StudySession';
import FlashcardsPage from './pages/Flashcards';
import ExamMode from './pages/ExamMode';
import { Sidebar } from './components/layout/Sidebar';
import { ExamWizard } from './components/wizard/ExamWizard';
import './styles/theme.css';
import './styles/global.css';

type Screen = 'dashboard' | 'study' | 'flashcards' | 'exam';

function AppContent() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [showWizard, setShowWizard] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'dashboard') setScreen('dashboard');
    if (tab === 'flashcards') setScreen('flashcards');
    if (tab === 'subjects') setScreen('study');
    if (tab === 'analytics') setScreen('exam');
  };

  const getActiveTab = () => {
    if (screen === 'dashboard') return 'dashboard';
    if (screen === 'flashcards') return 'flashcards';
    if (screen === 'study') return 'subjects';
    if (screen === 'exam') return 'analytics';
    return 'dashboard';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar activeTab={getActiveTab()} setActiveTab={handleTabChange} />
      <main className="dashboard-main">
        {screen === 'dashboard' && <Dashboard onSelectScreen={setScreen} onOpenWizard={() => setShowWizard(true)} />}
        {screen === 'study' && <StudySession onFinish={() => setScreen('dashboard')} />}
        {screen === 'flashcards' && <FlashcardsPage />}
        {screen === 'exam' && <ExamMode onFinish={() => setScreen('dashboard')} />}
      </main>
      
      {showWizard && (
        <ExamWizard onClose={() => setShowWizard(false)} onFinished={() => { setShowWizard(false); window.location.reload(); }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}
