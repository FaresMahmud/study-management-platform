import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Target, Clock, Sparkles, BookOpen, AlertCircle, ArrowRight } from 'lucide-react';
import type { ExamPrep } from '../types';
import { pluralize } from '../utils/format';

// URL base para chamadas públicas (sem auth) - deve ser configurada via VITE_API_URL
const PUBLIC_API_URL = import.meta.env.VITE_API_URL;

if (!PUBLIC_API_URL) {
  throw new Error('VITE_API_URL não está configurado. Defina a variável de ambiente VITE_API_URL no .env ou no build.');
}

export default function PublicShareView() {
  const { token } = useParams<{ token: string }>();

  // Busca dados públicos do plano a partir do token UUID (sem autenticação)
  const { data: examPrep, isLoading, isError } = useQuery<ExamPrep>({
    queryKey: ['public-share', token],
    queryFn: async () => {
      const response = await axios.get<ExamPrep>(`${PUBLIC_API_URL}/api/v1/exam-preps/public/share/${token}`);
      return response.data;
    },
    enabled: !!token,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderLeft: '4px solid var(--primary)', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Carregando cronograma de estudos...</h2>
        </div>
      </div>
    );
  }

  if (isError || !examPrep) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', padding: 'var(--space-lg)' }}>
        <div className="card" style={{ maxWidth: '480px', padding: '34px', textAlign: 'center', border: '1px solid hsla(0, 72%, 51%, 0.2)' }}>
          <AlertCircle size={48} className="text-danger" style={{ marginBottom: 'var(--space-md)' }} />
          <h2 style={{ fontSize: '21px', fontWeight: 800, marginBottom: 'var(--space-xs)' }}>Link Expirado ou Inválido</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Este plano de estudos não é público ou o link de compartilhamento foi revogado pelo criador.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            Acessar o StudyFlow
          </Link>
        </div>
      </div>
    );
  }

  // Lógica de dias restantes / passados
  const diasRestantes = examPrep.daysRemaining ?? 0;
  const isPast = diasRestantes < 0;
  const absDias = Math.abs(diasRestantes);

  const formatarData = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER DA PÁGINA PÚBLICA */}
      <header style={{ padding: '16px 24px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <BookOpen size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em' }}>StudyFlow</span>
          <span className="badge" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--space-sm)' }}>Compartilhado</span>
        </div>
        <Link to="/register" className="btn btn-secondary btn-sm" style={{ margin: 0 }}>
          Criar Conta Grátis
        </Link>
      </header>

      {/* CONTEÚDO DO PLANO DE ESTUDOS */}
      <main style={{ flex: 1, maxWidth: '800px', width: '100%', margin: '0 auto', padding: '34px 24px' }}>
        
        {/* HERO CARD DE PREPARAÇÃO */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, hsla(258, 90%, 66%, 0.15), hsla(162, 72%, 45%, 0.08))',
          border: '1px solid hsla(258, 90%, 66%, 0.25)',
          padding: '34px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: '34px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', fontWeight: 800 }}>Plano de Preparação Ativo</span>
          <h1 style={{ fontSize: '34px', fontWeight: 900, margin: '8px 0 13px', color: 'var(--text-primary)' }}>{examPrep.title}</h1>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '30px', marginBottom: '21px' }}>
            <Calendar size={16} className="text-primary" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Data do Exame: {formatarData(examPrep.examDate)}</span>
          </div>

          {/* TIMER DE CONTAGEM REGRESSIVA */}
          <div style={{ fontSize: '56px', fontWeight: 900, fontFamily: 'monospace', color: 'var(--text-primary)', margin: '13px 0' }}>
            {isPast ? `${pluralize(absDias, 'dia')} atrás` : pluralize(diasRestantes, 'dia')}
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            {isPast ? 'Este exame já ocorreu.' : 'Restantes para a data da prova. Mantenha o foco!'}
          </p>
        </div>

        {/* DETALHES DO PLANO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '34px' }}>
          
          {/* META DE NOTA CARD */}
          <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Target size={32} className="text-primary" style={{ marginBottom: '13px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Meta de Nota Alvo</h3>
            <p style={{ fontSize: '34px', fontWeight: 900, margin: '8px 0', color: 'var(--text-primary)' }}>{examPrep.targetScore}%</p>
            <span className="badge" style={{ backgroundColor: examPrep.targetScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: examPrep.targetScore >= 80 ? 'var(--success)' : 'var(--warning)', fontSize: '11px', padding: '4px 12px' }}>
              {examPrep.targetScore >= 80 ? 'Objetivo: Excelente' : 'Objetivo: Aprovado'}
            </span>
          </div>

          {/* CRONOGRAMA CARD */}
          <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Clock size={32} className="text-primary" style={{ marginBottom: '13px' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Status da Preparação</h3>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, margin: '13px 0 8px', color: 'var(--text-primary)' }}>Ativo & Focado</p>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Metodologia baseada em repetição espaçada</span>
          </div>

        </div>

        {/* CTA CONVERSÃO PREMIUM */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, hsla(330, 85%, 57%, 0.15), hsla(258, 90%, 66%, 0.08))',
          border: '1px solid hsla(330, 85%, 57%, 0.25)',
          padding: '34px',
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '13px' }}>
            <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(236, 72, 153, 0.15)', color: 'var(--ai)' }}>
              <Sparkles size={28} />
            </div>
          </div>
          <h2 style={{ fontSize: '21px', fontWeight: 800, marginBottom: 'var(--space-xs)' }}>Gostaria de estudar assim com Inteligência Artificial?</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            No StudyFlow você faz upload de seus PDFs, gera resumos inteligentes, quizzes personalizados, treina com simulados cronometrados e revisa tudo via flashcards.
          </p>
          <Link to="/register" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-xs)', padding: '12px 24px', fontWeight: 700 }}>
            <span>Começar Agora Gratuitamente</span>
            <ArrowRight size={18} />
          </Link>
        </div>

      </main>

      {/* FOOTER */}
      <footer style={{ padding: 'var(--space-lg)', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>
        © {new Date().getFullYear()} StudyFlow. Desenvolvido para máxima performance acadêmica.
      </footer>

    </div>
  );
}
