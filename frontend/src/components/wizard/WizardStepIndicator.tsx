import React from 'react';
import './WizardStepIndicator.css';

interface IndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardStepIndicator({ currentStep, totalSteps }: IndicatorProps) {
  return (
    <div className="wizard-indicators">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <span key={idx} className={`indicator-dot ${idx + 1 === currentStep ? 'active' : ''} ${idx + 1 < currentStep ? 'completed' : ''}`} />
      ))}
    </div>
  );
}
