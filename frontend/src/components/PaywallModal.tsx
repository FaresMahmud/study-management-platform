import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, X } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { triggerConfetti } from '../utils/confetti';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const setPremium = useAuthStore(state => state.setPremium);

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      return (await apiClient.post('/api/users/upgrade')).data;
    },
    onSuccess: () => {
      triggerConfetti();
      setPremium(true);
      onClose();
      alert('Parabéns! Plano Premium ativado com sucesso! 💎');
    },
    onError: () => {
      alert('Erro ao processar assinatura simulada.');
    }
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px', border: '1px solid var(--primary-glow)', boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)' }} role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', marginBottom: '1rem', boxShadow: '0 0 15px var(--primary-glow)' }}>
            <Sparkles size={36} className="text-primary animate-pulse" />
          </div>
          <h2 className="modal-title" id="pw-modal-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Ative o StudyFlow Premium 💎</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Desbloqueie o Copiloto IA e alcance a alta performance nos seus estudos.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.75rem', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Geração ilimitada de Flashcards por IA (Gemini)</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Armazenamento ilimitado de slides e PDFs das aulas</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ minWidth: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Acesso prioritário a novas ferramentas e widgets</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>R$ 19,90<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mês</span></div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assinatura recorrente. Cancele quando quiser.</span>
        </div>

        <div className="modal-actions" style={{ flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              padding: '12px',
              fontSize: '0.95rem'
            }}
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
          >
            {upgradeMutation.isPending ? 'Processando assinatura...' : 'Simular Assinatura e Desbloquear'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: '100%', border: 'none', background: 'transparent' }}
            onClick={onClose}
          >
            Continuar no plano gratuito
          </button>
        </div>
      </div>
    </div>
  );
}
