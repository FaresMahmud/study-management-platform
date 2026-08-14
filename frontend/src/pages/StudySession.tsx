import React, { useState } from 'react';
import { QuizPanel } from '../components/study/QuizPanel';
import { QuizResult } from '../components/study/QuizResult';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockStudySession } from '../mocks/studyMocks';
import type { QuizResult as QuizResultType } from '../mocks/studyMocks';
import './StudySession.css';

interface StudySessionProps {
  onFinish: () => void;
}

export default function StudySession({ onFinish }: StudySessionProps) {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<QuizResultType | null>(null);

  const startQuiz = () => { setStarted(true); setResult(null); };

  return (
    <div className="study-session-page">
      <div className="reading-column">
        <header className="reading-header">
          <span className="subject-tag">{mockStudySession.subject}</span>
          <h1 className="session-title">{mockStudySession.title}</h1>
        </header>

        {mockStudySession.sections.map((sec) => (
          <section key={sec.id} className="reading-section">
            <h3>{sec.title}</h3>
            {sec.content.map((p, i) => <p key={i}>{p}</p>)}
            <Card className="highlight-card">Destaque: Compreender a regra geral e as exceções é chave para provas!</Card>
            <Button variant="secondary" onClick={startQuiz} className="test-btn">Testar conhecimento</Button>
          </section>
        ))}
      </div>

      <div className="quiz-column">
        <Card className="quiz-column-card">
          {result ? (
            <QuizResult result={result} onRetry={startQuiz} onContinue={onFinish} />
          ) : started ? (
            <QuizPanel questions={mockStudySession.questions} onComplete={setResult} />
          ) : (
            <div className="quiz-start-prompt">
              <h2>Painel de Quiz</h2>
              <p>Após ler as seções, inicie o quiz rápido para consolidar seu aprendizado.</p>
              <Button variant="primary" onClick={startQuiz} className="quiz-start-btn">Iniciar quiz desta seção</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
