import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  BookOpen, 
  Brain, 
  Flame, 
  ChevronRight, 
  ChevronLeft,
  Check
} from 'lucide-react';
import { triggerConfetti } from '../utils/confetti';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const slides = [
    {
      title: "1. Sua Preparação (Exam Prep) 🎯",
      description: "Defina seu objetivo! Configure o nome do seu exame (ex: Vestibular, Concurso, Certificação), a data da prova e a nota alvo. O StudyFlow calcula automaticamente a contagem regressiva e o ritmo de estudos ideal.",
      icon: <Sparkles size={48} className="text-primary animate-pulse" />,
      color: "var(--primary-glow)",
      badge: "Passo 1: O Foco"
    },
    {
      title: "2. Mapeamento de Assuntos 📚",
      description: "Divida o edital! Adicione matérias e defina metas baseadas em Maestria (%). Nosso algoritmo avalia seu domínio de 0 a 100% de forma ponderada através de Quizzes (40%), Simulados (40%) e Flashcards (20%).",
      icon: <BookOpen size={48} className="text-primary" />,
      color: "rgba(20, 184, 166, 0.15)",
      badge: "Passo 2: Domínio"
    },
    {
      title: "3. Upload de Materiais e IA 🧠",
      description: "Envie seus PDFs e apostilas! Nossa IA segmenta seus materiais e gera automaticamente Flashcards Leitner de revisão, Resumos estruturados e até Roteiros de Podcast em áudio para fixar o aprendizado.",
      icon: <Brain size={48} className="text-primary" />,
      color: "rgba(139, 92, 246, 0.15)",
      badge: "Passo 3: IA Multi-modal"
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      triggerConfetti();
      localStorage.setItem('study_onboarded', 'true');
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const currentSlide = slides[step];

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '520px', 
          padding: '24px var(--space-md)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)', 
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="ob-modal-title"
      >
        {/* Close Button */}
        <button 
          className="modal-close" 
          onClick={onClose} 
          aria-label="Pular Tutorial"
        >
          <X size={18} />
        </button>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <span 
            style={{ 
              fontSize: '0.72rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              color: 'var(--primary)', 
              backgroundColor: 'var(--primary-glow)',
              padding: '4px 10px',
              borderRadius: '20px',
              letterSpacing: '0.05em'
            }}
          >
            {currentSlide.badge}
          </span>
        </div>

        {/* Visual Illustration Header */}
        <div 
          style={{ 
            height: '140px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: currentSlide.color, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: '20px',
            border: '1px dashed var(--border-color)',
            transition: 'background-color 0.3s ease'
          }}
        >
          {currentSlide.icon}
        </div>

        {/* Text Content */}
        <div style={{ textAlign: 'center', minHeight: '120px' }}>
          <h2 
            id="ob-modal-title" 
            style={{ 
              fontSize: '1.4rem', 
              fontWeight: 800, 
              color: 'var(--text-primary)',
              marginBottom: '10px'
            }}
          >
            {currentSlide.title}
          </h2>
          <p 
            style={{ 
              fontSize: '0.88rem', 
              lineHeight: 1.6, 
              color: 'var(--text-secondary)',
              padding: '0 12px'
            }}
          >
            {currentSlide.description}
          </p>
        </div>

        {/* Slide Indicators / Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setStep(idx)}
              style={{
                width: idx === step ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: idx === step ? 'var(--primary)' : 'var(--border-color)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleBack}
            style={{ opacity: step === 0 ? 0.3 : 1, cursor: step === 0 ? 'default' : 'pointer' }}
            disabled={step === 0}
          >
            <ChevronLeft size={16} />
            Anterior
          </button>

          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handleNext}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {step === slides.length - 1 ? (
              <>
                <span>Começar!</span>
                <Check size={16} />
              </>
            ) : (
              <>
                <span>Avançar</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
