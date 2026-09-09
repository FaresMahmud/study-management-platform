import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Compass, FileText, X, Brain } from 'lucide-react';
import { triggerConfetti } from '../utils/confetti';
import { track } from '../utils/analytics';

interface PostUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  subjectId?: number | null;
  fileId?: number | null;
}

export default function PostUploadModal({
  isOpen,
  onClose,
  fileName,
  subjectId,
  fileId
}: PostUploadModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      triggerConfetti();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateQuestions = () => {
    track('post_upload_cta_clicked', { cta: 'generate_questions' });
    onClose();
    const query = new URLSearchParams();
    if (subjectId) query.set('subjectId', String(subjectId));
    if (fileId) query.set('fileId', String(fileId));
    query.set('autoStart', 'true');
    navigate(`/simulation?${query.toString()}`);
  };

  const handleStartSimulation = () => {
    track('post_upload_cta_clicked', { cta: 'start_simulation' });
    onClose();
    const query = new URLSearchParams();
    if (subjectId) query.set('subjectId', String(subjectId));
    if (fileId) query.set('fileId', String(fileId));
    navigate(`/simulation?${query.toString()}`);
  };

  const handleViewMaterial = () => {
    track('post_upload_cta_clicked', { cta: 'view_material' });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '540px',
          padding: '28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-secondary)',
          position: 'relative',
          animation: 'fadeIn 0.25s ease-out'
        }}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          <X size={20} />
        </button>

        {/* Top visual badge */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <Sparkles size={28} className="text-primary" />
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--success, #22c55e)',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              padding: '4px 12px',
              borderRadius: '20px'
            }}
          >
            Upload Concluído
          </span>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginTop: '12px',
              marginBottom: '6px'
            }}
          >
            ✨ Material processado!
          </h2>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              maxWidth: '420px',
              margin: '0 auto'
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>{fileName}</strong> está pronto. Nossa IA pode transformar seu conteúdo em prática imediata:
          </p>
        </div>

        {/* Two Large Side-by-Side CTAs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            marginTop: '22px',
            marginBottom: '16px'
          }}
        >
          {/* CTA 1: Gerar Questões com IA */}
          <button
            onClick={handleGenerateQuestions}
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px 14px',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Brain size={26} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Gerar Questões</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
                Praticar com questões via IA
              </div>
            </div>
          </button>

          {/* CTA 2: Fazer Simulado */}
          <button
            onClick={handleStartSimulation}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '16px 14px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }}
          >
            <Compass size={26} style={{ color: 'var(--warning, #f59e0b)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Fazer Simulado</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Treino sob pressão de tempo
              </div>
            </div>
          </button>
        </div>

        {/* Tertiary CTA */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button
            onClick={handleViewMaterial}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <FileText size={15} />
            <span>Ver meu material no leitor de PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
