import React from 'react';
import type { Question } from '../../mocks/studyMocks';
import './ExamQuestion.css';

interface QuestionProps {
  question: Question;
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
}

export function ExamQuestion({ question, selectedOptionId, onSelectOption }: QuestionProps) {
  return (
    <div className="exam-question-card">
      <h3 className="exam-question-text">{question.text}</h3>
      <div className="exam-options-list">
        {question.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = selectedOptionId === opt.id;
          return (
            <div key={opt.id} className={`exam-option ${isSelected ? 'selected' : ''}`} onClick={() => onSelectOption(opt.id)}>
              <span className="radio-circle"><span className="radio-inner" /></span>
              <span className="exam-opt-letter">{letter}.</span>
              <span className="exam-opt-text">{opt.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
