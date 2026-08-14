import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import StudySession from './pages/StudySession';
import { ExamWizard } from './components/wizard/ExamWizard';
import './styles/theme.css';
import './styles/global.css';

type Screen = 'dashboard' | 'study';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="app-root">
      {screen === 'dashboard' ? (
        <Dashboard onContinue={() => setScreen('study')} onOpenWizard={() => setShowWizard(true)} />
      ) : (
        <StudySession onFinish={() => setScreen('dashboard')} />
      )}
      {showWizard && (
        <ExamWizard onClose={() => setShowWizard(false)} onFinished={() => { setShowWizard(false); window.location.reload(); }} />
      )}
    </div>
  );
}
