import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import StudySession from './pages/StudySession';
import FlashcardsPage from './pages/Flashcards';
import ExamMode from './pages/ExamMode';
import { ExamWizard } from './components/wizard/ExamWizard';
import './styles/theme.css';
import './styles/global.css';

type Screen = 'dashboard' | 'study' | 'flashcards' | 'exam';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="app-root">
      {screen === 'dashboard' && <Dashboard onSelectScreen={setScreen} onOpenWizard={() => setShowWizard(true)} />}
      {screen === 'study' && <StudySession onFinish={() => setScreen('dashboard')} />}
      {screen === 'flashcards' && <FlashcardsPage onBack={() => setScreen('dashboard')} />}
      {screen === 'exam' && <ExamMode onFinish={() => setScreen('dashboard')} />}
      
      {showWizard && (
        <ExamWizard onClose={() => setShowWizard(false)} onFinished={() => { setShowWizard(false); window.location.reload(); }} />
      )}
    </div>
  );
}
