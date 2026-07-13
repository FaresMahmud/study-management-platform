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
      title: "Bem-vindo ao StudyFlow! 🚀",
      description: "O copiloto definitivo para sua aprovação. Unimos cronômetros científicos, resumos inteligentes e revisões ativas em uma única plataforma integrada.",
      icon: <Sparkles size={48} className="text-primary animate-pulse" />,
      color: "var(--primary-glow)",
      badge: "Estudo Inteligente"
    },
    {
      title: "Split Workspace Lado a Lado 📖",
      description: "Chega de alternar entre 10 abas. Abra os slides PDF das aulas à esquerda e faça resumos Notion-style à direita, gerando citações com referências de página com 1 clique.",
      icon: <BookOpen size={48} className="text-primary" />,
      color: "rgba(59, 130, 246, 0.15)",
      badge: "Foco Unificado"
    },
    {
      title: "Copiloto IA & Flashcards Leitner 🧠",
      description: "Selecione trechos importantes e crie Flashcards manuais ou clique em 'Gerar com IA' (Gemini) para alimentar sua pilha de revisões programadas de forma automática.",
      icon: <Brain size={48} className="text-primary" />,
      color: "rgba(139, 92, 246, 0.15)",
      badge: "Retenção Ativa"
    },
    {
      title: "Streaks 🔥 & Meta Semanal",
      description: "Crie hábitos de estudo indestrutíveis! Acompanhe seu Streak de dias consecutivos de foco e comemore com explosões de confete ao atingir seu objetivo semanal.",
      icon: <Flame size={48} className="text-primary animate-bounce" />,
      color: "rgba(249, 115, 22, 0.15)",
      badge: "Consistência"
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
