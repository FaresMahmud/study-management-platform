import React, { useState, useEffect } from 'react';
import { WizardStepIndicator } from './WizardStepIndicator';
import { SubjectSelector } from './SubjectSelector';
import { DatePicker } from './DatePicker';
import { ScoreSlider } from './ScoreSlider';
import { MaterialUpload } from './MaterialUpload';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { apiClient } from '../../api/client';
import './ExamWizard.css';

interface Subject { id: number; subjectName: string; }
interface ExamWizardProps {
  onClose: () => void;
  onFinished: () => void;
}

export function ExamWizard({ onClose, onFinished }: ExamWizardProps) {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [score, setScore] = useState(70);
  const [matType, setMatType] = useState<'pdf' | 'text' | 'scratch'>('scratch');
  const [text, setText] = useState('');

  const loadSubjects = () => apiClient.get<Subject[]>('/api/subjects').then(r => setSubjects(r.data));
  useEffect(() => { loadSubjects(); }, []);

  const createSubject = (name: string) => apiClient.post('/api/subjects', { subjectName: name, color: '#6366f1' }).then(loadSubjects);

  const handleSubmit = async () => {
    if (!subjectId) return;
    await apiClient.post('/api/goals', { subjectId, targetMastery: score, endDateGoal: date, title: `Meta de Estudo - ${score}%` });
    await apiClient.post('/api/study-sessions', { subjectId, duration: 30, observations: 'Sessão de estudo inicial gerada pelo Planejamento de Provas.' });
    onFinished();
  };

  return (
    <div className="wizard-overlay">
      <Card className="wizard-modal">
        <header className="wizard-header">
          <h2>Planeje seu Objetivo</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </header>
        <WizardStepIndicator currentStep={step} totalSteps={4} />

        <div className="wizard-step-content">
          {step === 1 && <SubjectSelector subjects={subjects} selectedId={subjectId} onSelect={id => setSubjectId(Number(id))} onCreateSubject={createSubject} />}
          {step === 2 && <DatePicker selectedDate={date} onSelectDate={setDate} />}
          {step === 3 && <ScoreSlider score={score} onChangeScore={setScore} />}
          {step === 4 && <MaterialUpload materialType={matType} onSelectType={setMatType} textData={text} onChangeText={setText} />}
        </div>

        <footer className="wizard-footer-actions">
          {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 4 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 ? !subjectId : step === 2 ? !date : false} className="next-btn-wizard">Continuar</Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} className="next-btn-wizard">Criar plano de estudos</Button>
          )}
        </footer>
      </Card>
    </div>
  );
}
