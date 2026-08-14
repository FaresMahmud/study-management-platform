import React, { useState } from 'react';
import { ExamTimer } from '../components/study/ExamTimer';
import { ExamProgressBar } from '../components/study/ExamProgressBar';
import { ExamQuestion } from '../components/study/ExamQuestion';
import { ExamResult } from '../components/study/ExamResult';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { mockStudySession } from '../mocks/studyMocks';
import './ExamMode.css';

interface ExamModeProps {
  subjectId?: string | number;
  questionCount?: number;
  timeLimit?: number;
  onFinish: () => void;
}

export default function ExamMode({ onFinish, timeLimit = 60 }: ExamModeProps) {
  const questions = mockStudySession.questions;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [ended, setEnded] = useState(false);

  const handleSelect = (optionId: string) => {
    setAnswers(prev => ({ ...prev, [questions[idx].id]: optionId }));
  };

  if (ended) return (
    <div className="exam-mode-page"><Card className="exam-card"><ExamResult questions={questions} answers={answers} timeSpent="1m 30s" onBack={onFinish} /></Card></div>
  );

  return (
    <div className="exam-mode-page">
      <ExamProgressBar current={idx + 1} total={questions.length} />
      <header className="exam-header-row">
        <span>Questão {idx + 1} de {questions.length}</span>
        <ExamTimer timeLimitMinutes={timeLimit} onTimeUp={() => setEnded(true)} />
      </header>
      <Card className="exam-card">
        <ExamQuestion question={questions[idx]} selectedOptionId={answers[questions[idx].id] || null} onSelectOption={handleSelect} />
      </Card>
      <footer className="exam-footer">
        <Button variant="secondary" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>Anterior</Button>
        {idx < questions.length - 1 ? (
          <Button variant="primary" onClick={() => setIdx(i => i + 1)}>Próxima</Button>
        ) : (
          <Button variant="primary" onClick={() => setEnded(true)}>Finalizar Prova</Button>
        )}
      </footer>
    </div>
  );
}
