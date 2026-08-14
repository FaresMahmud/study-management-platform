import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { QuizResult as QuizResultType } from '../../mocks/studyMocks';
import './QuizResult.css';

interface QuizResultProps {
  result: QuizResultType;
  onRetry: () => void;
  onContinue: () => void;
}

export function QuizResult({ result, onRetry, onContinue }: QuizResultProps) {
  const isPerfect = result.correctCount === result.totalCount;
  const isGood = result.correctCount >= result.totalCount * 0.7;

  const emoji = isPerfect ? '🎉' : isGood ? '👍' : '💪';
  const title = isPerfect ? 'Excelente trabalho!' : isGood ? 'Bom trabalho!' : 'Continue praticando!';
  const timeFormatted = `${Math.floor(result.timeSpent / 60)}m ${result.timeSpent % 60}s`;

  return (
    <div className="quiz-result">
      <div className="result-header">
        <span className="result-emoji">{emoji}</span>
        <h2 className="result-title">{title}</h2>
        <p className="result-motivational">Você está na zona de Aprendizado</p>
      </div>

      <div className="result-stats">
        <Card className="result-stat-card"><h3>{result.correctCount}/{result.totalCount}</h3><p>Acertos</p></Card>
        <Card className="result-stat-card"><h3>{result.precision}%</h3><p>Precisão</p></Card>
        <Card className="result-stat-card"><h3>{timeFormatted}</h3><p>Tempo</p></Card>
      </div>

      <div className="result-feedback">
        <div className="feedback-box strength">
          <h4>💪 Pontos fortes</h4>
          <ul>{result.strongPoints.map((pt, i) => <li key={i}>{pt}</li>)}</ul>
        </div>
        <div className="feedback-box focus">
          <h4>⚡ Foco para a próxima vez</h4>
          <ul>{result.weakPoints.length > 0 ? result.weakPoints.map((pt, i) => <li key={i}>{pt}</li>) : <li>Mantenha a consistência de leitura!</li>}</ul>
        </div>
      </div>

      <div className="result-actions">
        <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>
        <Button variant="primary" onClick={onContinue}>Continuar estudando</Button>
      </div>
    </div>
  );
}
