import React, { useState, useEffect } from 'react';
import { useTimer } from '../../hooks/useTimer';
import { QuizOption } from './QuizOption';
import { Button } from '../ui/Button';
import type { Question, QuizResult } from '../../mocks/studyMocks';
import './QuizPanel.css';

interface QuizPanelProps {
  questions: Question[];
  onComplete: (result: QuizResult) => void;
}

export function QuizPanel({ questions, onComplete }: QuizPanelProps) {
  const { seconds, stop, start } = useTimer();
  const [idx, setIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<('correct' | 'wrong')[]>([]);

  useEffect(() => { start(); return () => stop(); }, [start, stop]);
  const current = questions[idx];

  const handleNext = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setSelectedId(null);
    } else {
      stop();
      const correct = results.filter(r => r === 'correct').length;
      onComplete({
        correctCount: correct,
        totalCount: questions.length,
        precision: Math.round((correct / questions.length) * 100),
        timeSpent: seconds,
        strongPoints: correct === questions.length ? ['Domínio perfeito', 'Foco'] : ['Boa base'],
        weakPoints: correct < questions.length ? ['Revisar pontos específicos'] : [],
        suggestions: ['Revise o artigo e refaça o quiz.'],
      });
    }
  };

  return (
    <div className="quiz-panel">
      <div className="quiz-progress">
        {questions.map((_, i) => (
          <span key={i} className={`progress-dot ${i === idx ? 'active' : ''} ${results[i] || ''}`} />
        ))}
      </div>
      <h3 className="quiz-question">{current.text}</h3>
      <div className="quiz-options">
        {current.options.map((opt, i) => {
          const state = !selectedId ? 'neutral' : selectedId === opt.id ? (opt.isCorrect ? 'correct' : 'wrong') : (opt.isCorrect ? 'correct' : 'disabled');
          return <QuizOption key={opt.id} letter={String.fromCharCode(65 + i)} text={opt.text} state={state} onClick={() => !selectedId && (setSelectedId(opt.id), setResults(p => [...p, opt.isCorrect ? 'correct' : 'wrong']))} />;
        })}
      </div>
      {selectedId && (
        <div className="quiz-footer">
          <div className="explanation">{current.explanation}</div>
          <Button variant="primary" onClick={handleNext} className="next-btn">{idx === questions.length - 1 ? 'Ver resultado' : 'Próxima'}</Button>
        </div>
      )}
    </div>
  );
}
