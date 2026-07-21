import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import type { Subject, Flashcard } from '../types';
import {
  Brain,
  HelpCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Award,
  ChevronRight,
  BookOpen,
  Plus
} from 'lucide-react';

interface ExamPrep {
  id: number;
  title: string;
  examDate: string;
  targetScore: number;
  status: string;
}

interface Question {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

const PREDEFINED_QUESTIONS: Record<string, Question[]> = {
  default: [
    {
      question: "Qual técnica de estudo propõe blocos de tempo focados (ex: 25 min) intercalados com pequenos descansos?",
      options: {
        A: "Técnica Pomodoro",
        B: "Sistema Leitner",
        C: "Feynman Technique",
        D: "Método de Robinson (EPL2R)"
      },
      correctAnswer: "A",
      explanation: "A Técnica Pomodoro foi criada por Francesco Cirillo e sugere manter foco total por 25 minutos com pequenos intervalos de 5 minutos para oxigenar o cérebro."
    },
    {
      question: "Qual o principal benefício de utilizar o Sistema Leitner para revisão de flashcards?",
      options: {
        A: "Decorar fórmulas de forma passiva",
        B: "Otimizar o tempo de revisão através da Repetição Espaçada",
        C: "Aumentar a velocidade de digitação do estudante",
        D: "Substituir completamente a leitura de livros teóricos"
      },
      correctAnswer: "B",
      explanation: "O Sistema Leitner organiza os flashcards em caixas (boxes). Cartões fáceis vão para caixas mais distantes e são revisados menos vezes, enquanto cartões difíceis voltam para a caixa 1, otimizando o esforço cognitivo."
    },
    {
      question: "No desenvolvimento de produtos digitais SaaS, o que significa a sigla MVP?",
      options: {
        A: "Most Valuable Player",
        B: "Minimum Viable Product",
        C: "Maximum Volumetric Profit",
        D: "Management Vertical Process"
      },
      correctAnswer: "B",
      explanation: "MVP significa Minimum Viable Product (Produto Mínimo Viável). É a versão mais simples de um produto desenvolvida para validar hipóteses de mercado com menor custo possível."
    },
    {
      question: "Quem é considerado o criador do cálculo infinitesimal de forma independente junto com Isaac Newton?",
      options: {
        A: "Gottfried Wilhelm Leibniz",
        B: "René Descartes",
        C: "Blaise Pascal",
        D: "Galileu Galilei"
      },
      correctAnswer: "A",
      explanation: "Gottfried Leibniz e Isaac Newton desenvolveram o Cálculo Diferencial e Integral independentemente no final do século XVII. A notação moderna de derivadas e integrais (dy/dx e ∫) que usamos hoje é a de Leibniz."
    },
    {
      question: "Qual é o pilar central da curva de esquecimento de Hermann Ebbinghaus?",
      options: {
        A: "A memória de longo prazo é mantida intacta sem revisões",
        B: "Nós esquecemos informações rapidamente logo após aprendê-las, a menos que haja reforço espaçado",
        C: "Ler o mesmo texto 10 vezes seguidas elimina o esquecimento",
        D: "O sono não influencia na consolidação das memórias diárias"
      },
      correctAnswer: "B",
      explanation: "Ebbinghaus demonstrou que a retenção cai drasticamente nas primeiras horas após o estudo. Para reverter essa curva, revisões pontuais (repetição espaçada) reativam as conexões neurais."
    }
  ],
  matematica: [
    {
      question: "Qual é a derivada da função f(x) = 3x^2 + 5x?",
      options: {
        A: "6x + 5",
        B: "3x + 5",
        C: "6x^2 + 5",
        D: "6x"
      },
      correctAnswer: "A",
      explanation: "Pela regra do tombo para derivadas, a derivada de x^2 é 2x e a derivada de x é 1. Logo: d/dx (3x^2) = 6x e d/dx (5x) = 5. Somando ambos temos 6x + 5."
    },
    {
      question: "Qual é o valor do limite fundamental trigonométrico lim(x->0) sen(x)/x ?",
      options: {
        A: "0",
        B: "1",
        C: "Infinito",
        D: "Não existe"
      },
      correctAnswer: "B",
      explanation: "Este é o limite fundamental da trigonometria. À medida que x se aproxima de 0, a razão entre o seno do ângulo e o próprio ângulo em radianos tende perfeitamente a 1."
    }
  ],
  fisica: [
    {
      question: "Qual lei da física postula que 'a toda ação há sempre uma reação oposta e de igual intensidade'?",
      options: {
        A: "Primeira Lei de Newton (Inércia)",
        B: "Segunda Lei de Newton (F = m*a)",
        C: "Terceira Lei de Newton (Ação e Reação)",
        D: "Lei da Gravitação Universal"
      },
      correctAnswer: "C",
      explanation: "A Terceira Lei de Newton estabelece que forças sempre ocorrem em pares. Se um corpo A exerce uma força em um corpo B, B exerce uma força igual e oposta em A."
    }
  ]
};

export default function Quiz() {
  const queryClient = useQueryClient();

  // ─── Estados do Fluxo de Quiz ─────────────────────────────────────────
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [shakeOption, setShakeOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Estados de Criação de ExamPrep rápida
  const [isCreatingPrep, setIsCreatingPrep] = useState(false);
  const [newPrepTitle, setNewPrepTitle] = useState('');

  // ─── Queries ──────────────────────────────────────────────────────────
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/api/subjects')).data,
  });

  const { data: flashcards = [] } = useQuery<Flashcard[]>({
    queryKey: ['flashcards-all'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/flashcards?size=1000');
      return res.data.content || [];
    }
  });

  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['exam-preps'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/api/v1/exam-preps');
      return res.data.content || [];
    }
  });

  // ─── Mutations ────────────────────────────────────────────────────────
  const createPrepMutation = useMutation({
    mutationFn: async (newPrep: { title: string; examDate: string; targetScore: number; status: string }) => {
      return (await apiClient.post<ExamPrep>('/api/v1/exam-preps', newPrep)).data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exam-preps'] });
      setSelectedExamPrepId(data.id);
      setIsCreatingPrep(false);
      setNewPrepTitle('');
      alert('Preparação criada com sucesso! Você já pode salvar suas tentativas de quiz.');
    }
  });

  const saveAttemptMutation = useMutation({
    mutationFn: async (attempt: { examPrepId: number; correctAnswers: number; totalQuestions: number; contentJson: string }) => {
      return (await apiClient.post('/api/v1/quiz/attempt', attempt)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      alert('Tentativa de quiz registrada com sucesso! Seu nível de maestria foi atualizado. 🎯');
    },
    onError: () => {
      alert('Erro ao registrar tentativa no servidor.');
    }
  });

  // ─── Inicialização do Quiz ─────────────────────────────────────────────
  const handleStartQuiz = () => {
    // Filtra flashcards da matéria selecionada para ver se gera quiz dinâmico
    const realCards = selectedSubjectId
      ? flashcards.filter(f => f.subject?.id === selectedSubjectId)
      : [];

    let generatedQuestions: Question[] = [];

    if (realCards.length >= 4) {
      // Gera quiz dinâmico a partir dos flashcards do usuário!
      generatedQuestions = realCards.slice(0, 5).map((card, index) => {
        const otherCards = realCards.filter(c => c.id !== card.id);
        const shuffledOthers = [...otherCards].sort(() => 0.5 - Math.random());
        const optionsList = [
          card.back,
          shuffledOthers[0]?.back || 'Alternativa B',
          shuffledOthers[1]?.back || 'Alternativa C',
          shuffledOthers[2]?.back || 'Alternativa D'
        ];

        // Embaralha as alternativas
        const shuffledOptions = [...optionsList].sort(() => 0.5 - Math.random());
        
        // Define as letras
        const optionsObj = {
          A: shuffledOptions[0],
          B: shuffledOptions[1],
          C: shuffledOptions[2],
          D: shuffledOptions[3]
        };

        // Identifica qual letra é a resposta correta
        let correctLetter: 'A' | 'B' | 'C' | 'D' = 'A';
        if (optionsObj.B === card.back) correctLetter = 'B';
        if (optionsObj.C === card.back) correctLetter = 'C';
        if (optionsObj.D === card.back) correctLetter = 'D';

        return {
          question: `[Flashcard] ${card.front}`,
          options: optionsObj,
          correctAnswer: correctLetter,
          explanation: `Explicação gerada pelo StudyFlow: O cartão original associa o termo "${card.front}" diretamente à resposta "${card.back}".`
        };
      });
    } else {
      // Carrega questões pré-definidas com base na matéria
      const subjectObj = subjects.find(s => s.id === selectedSubjectId);
      const name = subjectObj?.subjectName.toLowerCase() || '';

      let questionsPool: Question[] = [];
      if (name.includes('mat')) questionsPool = PREDEFINED_QUESTIONS.matematica;
      else if (name.includes('fís') || name.includes('fis')) questionsPool = PREDEFINED_QUESTIONS.fisica;
      
      // Fallback para a lista padrão se pool for pequeno
      if (questionsPool.length < 3) {
        questionsPool = PREDEFINED_QUESTIONS.default;
      }

      generatedQuestions = [...questionsPool].sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    setQuestions(generatedQuestions);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setCorrectAnswersCount(0);
    setAnswered(false);
    setShakeOption(null);
    setQuizCompleted(false);
    setQuizStarted(true);
  };

  // ─── Validação de Alternativa ──────────────────────────────────────────
  const handleSelectAnswer = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (answered) return;
    
    setSelectedAnswer(optionKey);
    setAnswered(true);

    const question = questions[currentIdx];
    if (optionKey === question.correctAnswer) {
      setCorrectAnswersCount(prev => prev + 1);
    } else {
      // Aciona animação de shake na alternativa errada
      setShakeOption(optionKey);
      setTimeout(() => setShakeOption(null), 400);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(idx => idx + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      setQuizCompleted(true);
      triggerConfetti();
    }
  };

  const handleSaveResult = () => {
    if (!selectedExamPrepId) {
      alert('Por favor, selecione uma Preparação de Prova para vincular este resultado.');
      return;
    }

    saveAttemptMutation.mutate({
      examPrepId: Number(selectedExamPrepId),
      correctAnswers: correctAnswersCount,
      totalQuestions: questions.length,
      contentJson: JSON.stringify(questions)
    });
  };

  const handleCreatePrep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrepTitle.trim()) return;

    // Cria preparação com prazo de 30 dias por padrão
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];

    createPrepMutation.mutate({
      title: newPrepTitle.trim(),
      examDate: dateStr,
      targetScore: 80,
      status: 'ACTIVE'
    });
  };

  // ─── Renderizações ───────────────────────────────────────────────────
  return (
    <div className="dashboard-root" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* CSS embutido local do Quiz */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background-color: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, var(--primary), var(--secondary));
          transition: width 0.4s ease;
        }
        .quiz-option-btn {
          width: 100%;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          text-align: left;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }
        .quiz-option-btn:hover:not(:disabled) {
          background-color: var(--bg-tertiary);
          border-color: var(--primary);
          color: var(--text-primary);
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.12);
          transform: translateX(4px);
        }
        .quiz-option-btn.correct {
          background-color: var(--success-glow);
          border-color: var(--success);
          color: var(--text-primary);
          font-weight: 600;
        }
        .quiz-option-btn.incorrect {
          background-color: var(--danger-glow);
          border-color: var(--danger);
          color: var(--text-primary);
          font-weight: 600;
        }
        .quiz-option-btn.missed {
          border-color: var(--success);
          color: var(--success);
          background-color: transparent;
        }
        .explanation-box {
          margin-top: 24px;
          padding: 20px;
          background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(99, 102, 241, 0.04) 100%);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--primary);
          border-radius: var(--radius-md);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Título de seção */}
      <div className="title-section">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Brain size={28} className="text-primary" />
            Quiz Interativo
          </h1>
          <p className="subtitle">Teste seus conhecimentos científicos com correção imediata</p>
        </div>
      </div>

      {!quizStarted ? (
        /* ================= TELA INICIAL (CONFIGURAÇÃO) ================= */
        <div style={{ maxWidth: '600px', margin: '40px auto 0 auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <HelpCircle size={48} className="text-primary animate-pulse" style={{ marginBottom: '12px' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Iniciar Sessão de Quiz</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Escolha uma matéria para gerarmos perguntas personalizadas baseadas nos seus flashcards.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Selecionar Matéria</label>
            <select 
              className="form-input"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todas as matérias (Aleatório)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.subjectName}</option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontWeight: 'bold' }}
            onClick={handleStartQuiz}
          >
            Iniciar Quiz (5 Questões)
          </button>
        </div>
      ) : quizCompleted ? (
        /* ================= TELA DE RESULTADOS ================= */
        <div style={{ maxWidth: '600px', margin: '40px auto 0 auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--success-glow)', color: 'var(--success)', marginBottom: '12px' }}>
              <Award size={48} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Quiz Concluído! 🎉</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Você acertou <strong>{correctAnswersCount}</strong> de <strong>{questions.length}</strong> questões.
            </p>
          </div>

          {/* Placar de desempenho */}
          <div className="flex-between" style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aproveitamento</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
                {Math.round((correctAnswersCount / questions.length) * 100)}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
              <span style={{ 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                color: (correctAnswersCount / questions.length) >= 0.6 ? 'var(--success)' : 'var(--danger)' 
              }}>
                {(correctAnswersCount / questions.length) >= 0.6 ? 'Aprovado' : 'Abaixo da meta'}
              </span>
            </div>
          </div>

          {/* Vinculação com Preparação de Prova (Gravação de metas) */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Vincular a uma Meta de Estudos?</h3>
              {!isCreatingPrep && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCreatingPrep(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}
                >
                  <Plus size={12} />
                  Nova Meta
                </button>
              )}
            </div>

            {isCreatingPrep ? (
              <form onSubmit={handleCreatePrep} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Nome da prova (ex: P1 de Cálculo)"
                  value={newPrepTitle}
                  onChange={e => setNewPrepTitle(e.target.value)}
                  style={{ margin: 0, flex: 1 }}
                  required
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }} disabled={createPrepMutation.isPending}>
                  Criar
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreatingPrep(false)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <select 
                  className="form-input"
                  value={selectedExamPrepId}
                  onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Não vincular (Salvar apenas como histórico)</option>
                  {examPreps.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.title}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
              onClick={handleSaveResult}
              disabled={saveAttemptMutation.isPending || !selectedExamPrepId}
            >
              {saveAttemptMutation.isPending ? 'Gravando...' : 'Gravar Resultados e Atualizar Maestria'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setQuizStarted(false)}
            >
              <RefreshCw size={14} />
              Refazer Configuração
            </button>
            <button 
              className="btn btn-secondary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={handleStartQuiz}
            >
              <ArrowRight size={14} />
              Novo Quiz Rápido
            </button>
          </div>
        </div>
      ) : (
        /* ================= TELA PRINCIPAL DO QUIZ ================= */
        <div style={{ maxWidth: '680px', margin: '20px auto 0 auto' }}>
          
          {/* Barra de Progresso no topo */}
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} 
            />
          </div>

          <div className="card">
            {/* Header da questão */}
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Questão {currentIdx + 1} de {questions.length}
              </span>
              <span className="badge badge-primary" style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}>
                Nível Padrão
              </span>
            </div>

            {/* Enunciado da questão */}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px', lineHeight: 1.5 }}>
              {questions[currentIdx].question}
            </h3>

            {/* Alternativas de Escolha */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(['A', 'B', 'C', 'D'] as const).map((key) => {
                const isSelected = selectedAnswer === key;
                const question = questions[currentIdx];
                const isCorrect = key === question.correctAnswer;
                
                let optionClass = 'quiz-option-btn';
                if (answered) {
                  if (isSelected) {
                    optionClass += isCorrect ? ' correct' : ' incorrect';
                  } else if (isCorrect) {
                    optionClass += ' missed'; // Destaca a correta se errou
                  }
                }
                
                if (shakeOption === key) {
                  optionClass += ' shake-animation';
                }

                return (
                  <button
                    key={key}
                    className={optionClass}
                    onClick={() => handleSelectAnswer(key)}
                    disabled={answered}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <strong style={{ color: isSelected ? 'inherit' : 'var(--text-muted)' }}>{key})</strong>
                      <span>{question.options[key]}</span>
                    </span>
                    {answered && isSelected && (
                      isCorrect ? (
                        <CheckCircle size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <XCircle size={18} style={{ color: 'var(--danger)' }} />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explicação da IA */}
            {answered && (
              <div className="explanation-box">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '6px' }}>
                  <Sparkles size={15} />
                  Explicação da Inteligência Artificial
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {questions[currentIdx].explanation}
                </p>
              </div>
            )}

            {/* Ações (Próxima) */}
            {answered && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={handleNextQuestion}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>{currentIdx + 1 === questions.length ? 'Finalizar Quiz' : 'Próxima Questão'}</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
