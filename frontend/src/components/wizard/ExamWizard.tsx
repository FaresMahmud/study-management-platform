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

export default function ExamWizard({ onClose, onFinished }: ExamWizardProps) {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [score, setScore] = useState(70);
  const [matType, setMatType] = useState<'pdf' | 'text' | 'scratch'>('scratch');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadSubjects = () => apiClient.get<Subject[]>('/api/subjects').then(r => setSubjects(r.data));
  useEffect(() => { loadSubjects(); }, []);

  const createSubject = (name: string) => apiClient.post('/api/subjects', { subjectName: name, color: '#6366f1' }).then(loadSubjects);

  const handleSubmit = async () => {
    if (!subjectId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      await apiClient.post('/api/goals', { 
        subjectId, 
        targetMastery: score, 
        startDateGoal: todayStr, 
        endDateGoal: date, 
        title: `Meta de Estudo - ${score}%` 
      });
      await apiClient.post('/api/study-sessions', { 
        subjectId, 
        duration: 30, 
        sessionDate: todayStr, 
        observations: 'Sessão de estudo inicial gerada pelo Planejamento de Provas.' 
      });
      
      if (matType === 'pdf' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subjectId', String(subjectId));
        await apiClient.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else if (matType === 'text' && text.trim()) {
        await apiClient.post('/api/summaries', {
          title: 'Material Teórico - Onboarding',
          content: text,
          subjectId
        });
      }
      
      onFinished();
    } catch (err: unknown) {
      console.error('Erro no onboarding:', err);
      let message = 'Erro ao criar plano de estudos. Verifique se os dados estão corretos.';
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (axiosErr.response?.data?.message) {
        message = axiosErr.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      // Msg mais específica para erro de upload de PDF
      if (matType === 'pdf' && file) {
        if (message.includes('50 MB') || message.includes('limit')) {
          message = `O arquivo "${file.name}" excede o limite de 50 MB. Tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)} MB.`;
        } else if (message.includes('400') || message.includes('Bad Request')) {
          message = `O arquivo "${file.name}" não é um PDF válido. Selecione um arquivo com extensão .pdf.`;
        } else {
          message = `Erro ao enviar o PDF "${file.name}": ${message}`;
        }
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wizard-overlay">
      <Card className="wizard-modal">
        <header className="wizard-header">
          <h2>Planeje seu Objetivo</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>×</button>
        </header>
        <WizardStepIndicator currentStep={step} totalSteps={4} />

        {errorMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', margin: '0 24px 12px 24px', borderRadius: '8px', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}

        <div className="wizard-step-content">
          {step === 1 && <SubjectSelector subjects={subjects} selectedId={subjectId} onSelect={id => setSubjectId(Number(id))} onCreateSubject={createSubject} />}
          {step === 2 && <DatePicker selectedDate={date} onSelectDate={setDate} />}
          {step === 3 && <ScoreSlider score={score} onChangeScore={setScore} />}
          {step === 4 && <MaterialUpload materialType={matType} onSelectType={setMatType} textData={text} onChangeText={setText} selectedFile={file} onChangeFile={setFile} />}
        </div>

        <footer className="wizard-footer-actions">
          {step > 1 && <Button variant="secondary" onClick={() => setStep(step - 1)} disabled={loading}>Voltar</Button>}
          {step < 4 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)} disabled={step === 1 ? !subjectId : step === 2 ? !date : false} className="next-btn-wizard">Continuar</Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} className="next-btn-wizard" disabled={loading}>
              {loading ? 'Salvando...' : 'Criar plano de estudos'}
            </Button>
          )}
        </footer>
      </Card>
    </div>
  );
}
