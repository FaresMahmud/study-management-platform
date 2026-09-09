import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Upload, Compass, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { track } from '../../utils/analytics';

interface FirstStepsChecklistProps {
  hasGoals: boolean;
  hasPdfs: boolean;
  hasSimulations: boolean;
  onDefineGoal: () => void;
  onUploadPdf: () => void;
  isCompact?: boolean;
}

export function FirstStepsChecklist({
  hasGoals,
  hasPdfs,
  hasSimulations,
  onDefineGoal,
  onUploadPdf,
  isCompact = false
}: FirstStepsChecklistProps) {
  const navigate = useNavigate();

  const completedCount = (hasGoals ? 1 : 0) + (hasPdfs ? 1 : 0) + (hasSimulations ? 1 : 0);
  const progressPercent = Math.round((completedCount / 3) * 100);

  const steps = [
    {
      id: 'goal',
      title: 'Defina sua prova',
      description: 'Contagem regressiva e ritmo de estudos',
      icon: <Target size={20} style={{ color: hasGoals ? 'var(--success, #22c55e)' : 'var(--primary)' }} />,
      done: hasGoals,
      action: () => {
        track('first_steps_checklist_clicked', { step: 1 });
        onDefineGoal();
      },
      cta: 'Configurar'
    },
    {
      id: 'pdf',
      title: 'Envie seu primeiro PDF',
      description: 'A IA gera questões e resumos',
      icon: <Upload size={20} style={{ color: hasPdfs ? 'var(--success, #22c55e)' : 'var(--secondary, #a855f7)' }} />,
      done: hasPdfs,
      action: () => {
        track('first_steps_checklist_clicked', { step: 2 });
        onUploadPdf();
      },
      cta: 'Enviar'
    },
    {
      id: 'sim',
      title: 'Faça seu primeiro simulado',
      description: 'Teste seus conhecimentos sob pressão',
      icon: <Compass size={20} style={{ color: hasSimulations ? 'var(--success, #22c55e)' : 'var(--warning, #f59e0b)' }} />,
      done: hasSimulations,
      action: () => {
        track('first_steps_checklist_clicked', { step: 3 });
        navigate('/simulation');
      },
      cta: 'Iniciar'
    }
  ];

  return (
    <div
      style={{
        backgroundColor: isCompact ? 'var(--bg-secondary)' : 'transparent',
        border: isCompact ? '1px solid var(--border-color)' : 'none',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: isCompact ? '20px' : '0',
        marginBottom: isCompact ? '24px' : '0'
      }}
    >
      {/* Header and Progress */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div>
          <h3
            style={{
              fontSize: isCompact ? '1.05rem' : '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>Comece em 3 passos</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: completedCount === 3 ? 'var(--success, #22c55e)' : 'var(--primary)',
                backgroundColor: completedCount === 3 ? 'rgba(34,197,94,0.12)' : 'var(--primary-glow)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              {completedCount}/3 concluídos
            </span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Complete o ciclo para desbloquear todo o potencial do Copiloto de Estudos.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '140px' }}>
          <div
            style={{
              flex: 1,
              height: '6px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)',
                borderRadius: '3px',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* 3 Clickable Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px'
        }}
      >
        {steps.map((step, idx) => (
          <div
            key={step.id}
            onClick={step.action}
            style={{
              backgroundColor: step.done ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-secondary)',
              border: '1px solid',
              borderColor: step.done ? 'rgba(34, 197, 94, 0.25)' : 'var(--border-color)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = step.done ? 'var(--success, #22c55e)' : 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = step.done ? 'rgba(34, 197, 94, 0.25)' : 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: step.done ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {step.icon}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {step.done ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success, #22c55e)', fontSize: '0.75rem', fontWeight: 700 }}>
                      <CheckCircle2 size={16} />
                      <span>Concluído</span>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <Circle size={15} />
                      <span>Passo {idx + 1}</span>
                    </span>
                  )}
                </div>
              </div>

              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: step.done ? 'var(--text-primary)' : 'var(--text-primary)',
                  margin: '0 0 4px 0',
                  textDecoration: step.done ? 'none' : 'none'
                }}
              >
                {step.title}
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {step.description}
              </p>
            </div>

            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: step.done ? 'var(--text-muted)' : 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {step.done ? 'Revisar' : step.cta}
                <ArrowRight size={13} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
