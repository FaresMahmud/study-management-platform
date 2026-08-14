import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Question } from '../../mocks/studyMocks';
import './ExamResult.css';

interface ResultProps { questions: Question[]; answers: { [key: string]: string }; timeSpent: string; onBack: () => void; }

export function ExamResult({ questions, answers, timeSpent, onBack }: ResultProps) {
  const [show, setShow] = useState(false);
  const correct = questions.filter(q => q.options.find(o => o.id === answers[q.id])?.isCorrect).length;
  const grade = Number(((correct / questions.length) * 10).toFixed(1));
  const emoji = grade >= 9 ? '🏆' : grade >= 7 ? '🎉' : grade >= 5 ? '👍' : '💪';
  return (
    <div className="exam-result-view">
      <div className="result-header">
        <span className="result-emoji">{emoji}</span>
        <h2 className="result-title">{grade >= 9 ? 'Excelente!' : grade >= 7 ? 'Muito bem!' : grade >= 5 ? 'Na média, dá pra melhorar!' : 'Estude mais!'}</h2>
        <p className="result-grade">Nota: <strong>{grade}/10</strong> • {timeSpent}</p>
      </div>
      <div className="result-actions">
        <Button variant="secondary" onClick={() => setShow(!show)}>Ver gabarito</Button>
        <Button variant="primary" onClick={onBack}>Voltar ao dashboard</Button>
      </div>
      {show && <div className="gabarito-list">
        {questions.map((q, idx) => (
          <Card key={q.id} className="gabarito-card">
            <h4>{idx + 1}. {q.text}</h4>
            <p>Sua resposta: <strong className={q.options.find(o => o.id === answers[q.id])?.isCorrect ? 'text-success' : 'text-danger'}>{q.options.find(o => o.id === answers[q.id])?.text || 'Sem resposta'}</strong></p>
            <p>Correta: <strong className="text-success">{q.options.find(o => o.isCorrect)?.text}</strong></p>
          </Card>
        ))}
      </div>}
    </div>
  );
}
