import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { triggerConfetti } from '../utils/confetti';
import type { Subject, Flashcard } from '../types';
import { Brain, HelpCircle, CheckCircle, XCircle, ArrowRight, RefreshCw, Sparkles, Award, ChevronRight, Plus } from 'lucide-react';

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
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
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
        D: "Método de Robinson (EPL2R)",
        E: "Curva de Ebbinghaus"
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
        D: "Substituir completamente a leitura de livros teóricos",
        E: "Melhorar a caligrafia manual"
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
        D: "Management Vertical Process",
        E: "Mobile Vector Project"
      },
      correctAnswer: "B",
      explanation: "MVP significa Minimum Viable Product (Produto Mínimo Viável). É a versão mais simples de um produto desenvolvida para validar hipóteses de mercado com menor custo possível."
    }
  ]
};

export default function Quiz() {
  const queryClient = useQueryClient();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [shakeOption, setShakeOption] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Queries
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

  // Mutation to add flashcard from error
  const addFlashcardMutation = useMutation({
    mutationFn: async (newCard: { front: string; back: string; subjectId: number }) => {
      return apiClient.post('/api/flashcards', newCard);
    },
    onSuccess: () => {
      alert('Pergunta convertida em flashcard com sucesso! 🧠');
    }
  });

  const saveAttemptMutation = useMutation({
    mutationFn: async (attempt: { examPrepId: number; correctAnswers: number; totalQuestions: number; contentJson: string }) => {
      return (await apiClient.post('/api/v1/quiz/attempt', attempt)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      alert('Tentativa de quiz salva com sucesso! Maestria atualizada.');
    }
  });

  const handleStartQuiz = () => {
    // dynamic questions or predefined
    const questionsPool = PREDEFINED_QUESTIONS.default;
    setQuestions([...questionsPool].sort(() => 0.5 - Math.random()).slice(0, 3));
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setCorrectAnswersCount(0);
    setAnswered(false);
    setQuizCompleted(false);
    setQuizStarted(true);
  };

  const handleSelectAnswer = (optionKey: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (answered) return;
    setSelectedAnswer(optionKey);
    setAnswered(true);

    const question = questions[currentIdx];
    if (optionKey === question.correctAnswer) {
      setCorrectAnswersCount(prev => prev + 1);
    } else {
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
      alert('Selecione uma preparação para salvar.');
      return;
    }
    saveAttemptMutation.mutate({
      examPrepId: Number(selectedExamPrepId),
      correctAnswers: correctAnswersCount,
      totalQuestions: questions.length,
      contentJson: JSON.stringify(questions)
    });
  };

  const convertToFlashcard = () => {
    const q = questions[currentIdx];
    if (!selectedSubjectId) {
      alert('Selecione uma matéria associada na configuração inicial antes de salvar.');
      return;
    }
    addFlashcardMutation.mutate({
      front: q.question,
      back: `Resposta correta: ${q.correctAnswer}) ${q.options[q.correctAnswer]}. Explicação: ${q.explanation}`,
      subjectId: Number(selectedSubjectId)
    });
  };

  return (
    <div className="dashboard-root" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      <style>{`
        .circle-letter {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          margin-right: 12px;
        }
        .option-container {
          width: 100%;
          padding: 16px;
          border-radius: var(--radius-md);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }
        .option-container:hover:not(:disabled) {
          border-color: var(--primary);
          transform: translateX(4px);
        }
        .option-container.correct {
          background-color: var(--success-glow);
          border-color: var(--success);
        }
        .option-container.incorrect {
          background-color: var(--danger-glow);
          border-color: var(--danger);
        }
        .shake {
          animation: shakeAnimation 0.4s ease-in-out;
        }
        @keyframes shakeAnimation {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>

      <div className="title-section">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--space-lg)' }}>
            <Brain size={28} style={{ color: 'var(--success)' }} />
            Quiz Adaptativo
          </h1>
          <p className="subtitle" style={{ fontSize: '13px' }}>Uma questão por tela para eliminação de paralisia de comparação</p>
        </div>
      </div>

      {!quizStarted ? (
        <div style={{ maxWidth: '600px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <HelpCircle size={48} style={{ color: 'var(--success)', marginBottom: '12px' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800 }}>Iniciar Quiz Personalizado</h2>
          </div>
          
          <div className="form-group" style={{ marginBottom: '13px' }}>
            <label className="form-label">Selecione a disciplina</label>
            <select className="form-input" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Escolher matéria...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleStartQuiz}>Iniciar Quiz (3 Questões)</button>
        </div>
      ) : quizCompleted ? (
        <div style={{ maxWidth: '600px', margin: '40px auto' }} className="card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Award size={48} style={{ color: 'var(--success)' }} />
            <h2 style={{ fontSize: '21px', fontWeight: 800, marginTop: '8px' }}>Desempenho no Quiz</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Você acertou {correctAnswersCount} de {questions.length} questões.</p>
          </div>

          <div className="form-group" style={{ marginBottom: '13px' }}>
            <label className="form-label">Salvar na Preparação de Exame</label>
            <select className="form-input" value={selectedExamPrepId} onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Escolher exame...</option>
              {examPreps.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '8px' }} onClick={handleSaveResult} disabled={!selectedExamPrepId}>Salvar e Atualizar Maestria</button>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setQuizStarted(false)}>Voltar</button>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '20px auto' }}>
          
          {/* Header e Progresso */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
            <span>Questão {currentIdx + 1} de {questions.length}</span>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Acertos: {correctAnswersCount}/{questions.length}</span>
          </div>

          <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '21px' }}>
            <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, backgroundColor: 'var(--success)' }} />
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '13px' }}>
              <span className="badge badge-primary">Nível Médio</span>
              <span className="badge badge-success">Material do PDF</span>
            </div>

            <h3 style={{ fontSize: '21px', fontWeight: 800, marginBottom: '21px', lineHeight: 1.5 }}>{questions[currentIdx].question}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              {(['A', 'B', 'C', 'D', 'E'] as const).map((key) => {
                const isSelected = selectedAnswer === key;
                const isCorrect = key === questions[currentIdx].correctAnswer;
                
                let optClass = 'option-container';
                if (answered) {
                  if (isSelected) {
                    optClass += isCorrect ? ' correct' : ' incorrect';
                  } else if (isCorrect) {
                    optClass += ' correct';
                  }
                }
                if (shakeOption === key) optClass += ' shake';

                return (
                  <button key={key} className={optClass} onClick={() => handleSelectAnswer(key)} disabled={answered}>
                    <span className="circle-letter">{key}</span>
                    <span style={{ fontSize: '15px' }}>{questions[currentIdx].options[key]}</span>
                  </button>
                );
              })}
            </div>

            {/* Painel de Explicação detalhada */}
            {answered && (
              <div style={{ marginTop: '21px', padding: '16px', background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--success)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--success)', fontWeight: 700, marginBottom: '8px' }}>
                  <Sparkles size={16} />
                  Explicação Detalhada
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{questions[currentIdx].explanation}</p>
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '13px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={convertToFlashcard}>Converter em Flashcard SRS</button>
                </div>
              </div>
            )}

            {answered && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '21px' }}>
                <button className="btn btn-primary" onClick={handleNextQuestion}>
                  <span>{currentIdx + 1 === questions.length ? 'Ver Resultados' : 'Próxima Questão'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
