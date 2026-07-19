import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '../api/client';
import { Play, Pause, Square, Timer, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';
import type { Subject } from '../types';

const TIMER_STORAGE_KEY = 'study_platform_timer';

interface TimerCardProps {
  subjects: Subject[];
  onSessionSaved: () => void;
}

interface EstadoTimerSalvo {
  subjectId: number;
  startTimestamp: number;
  elapsedAtPause: number;
  isPaused: boolean;
  modo: 'livre' | 'pomodoro' | 'rule5217' | 'ultradiano';
  tipoSessao: 'foco' | 'descanso';
  segundosRestantes: number;
}

export default function TimerCard({ subjects, onSessionSaved }: TimerCardProps) {
  const queryClient = useQueryClient();

  // ─── Estado do Timer ─────────────────────────────────────────────────
  const [timerSubjectId, setTimerSubjectId] = useState<number | ''>('');
  const [timerRodando, setTimerRodando] = useState(false);
  const [timerPausado, setTimerPausado] = useState(false);
  const [timerSegundos, setTimerSegundos] = useState(0);
  const [timerModo, setTimerModo] = useState<'livre' | 'pomodoro' | 'rule5217' | 'ultradiano'>('livre');
  const [timerTipoSessao, setTimerTipoSessao] = useState<'foco' | 'descanso'>('foco');
  const [timerSegundosRestantes, setTimerSegundosRestantes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs para manter os valores de segundos sem causar re-renders do componente pai
  const segundosRef = useRef(0);
  const segundosRestantesRef = useRef(0);

  // ─── Estado do modal de confirmação de sessão (via timer) ─────────────
  const [modalTimerAberto, setModalTimerAberto] = useState(false);
  const [modalSubjectId, setModalSubjectId] = useState<number | ''>('');
  const [modalDuracao, setModalDuracao] = useState(60);
  const [modalData, setModalData] = useState('');
  const [modalObs, setModalObs] = useState('');
  const [modalErro, setModalErro] = useState('');

  const getSegundosIniciais = (modo: string, tipoSessao: 'foco' | 'descanso'): number => {
    if (modo === 'pomodoro') return tipoSessao === 'foco' ? 25 * 60 : 5 * 60;
    if (modo === 'rule5217') return tipoSessao === 'foco' ? 52 * 60 : 17 * 60;
    if (modo === 'ultradiano') return tipoSessao === 'foco' ? 90 * 60 : 20 * 60;
    return 0;
  };

  // ─── Inicializa o timer a partir do localStorage ao montar ───────────
  useEffect(() => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!salvo) return;
    try {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      setTimerSubjectId(estado.subjectId);
      setTimerRodando(true);
      setTimerPausado(estado.isPaused);
      setTimerModo(estado.modo || 'livre');
      setTimerTipoSessao(estado.tipoSessao || 'foco');
      
      let finalSegundos = 0;
      let finalSegundosRestantes = 0;
      
      if (estado.isPaused) {
        finalSegundos = estado.elapsedAtPause;
        finalSegundosRestantes = estado.segundosRestantes;
      } else {
        const decorrido = Math.floor((Date.now() - estado.startTimestamp) / 1000);
        finalSegundos = Math.max(0, estado.elapsedAtPause + decorrido);
        
        if (estado.modo !== 'livre') {
          finalSegundosRestantes = Math.max(0, estado.segundosRestantes - decorrido);
        }
      }
      
      setTimerSegundos(finalSegundos);
      setTimerSegundosRestantes(finalSegundosRestantes);
      segundosRef.current = finalSegundos;
      segundosRestantesRef.current = finalSegundosRestantes;
    } catch (e) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    }
  }, []);

  const enviarNotificacao = (titulo: string, corpo: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(titulo, { body: corpo });
      } catch (e) {}
    }
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 523.25; // C5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  };

  const handleTimerTerminado = () => {
    playBeep();
    triggerConfetti();

    localStorage.removeItem(TIMER_STORAGE_KEY);

    if (timerTipoSessao === 'foco') {
      const finalSegundos = segundosRef.current;
      enviarNotificacao('Hora da Pausa! ☕', 'Sua sessão de foco terminou. Hora de descansar um pouco!');
      
      // Abre o modal de finalização diretamente com os minutos acumulados
      setModalSubjectId(timerSubjectId);
      setModalDuracao(Math.max(1, Math.round(finalSegundos / 60)));
      setModalData(hojeISO());
      setModalObs('');
      setModalErro('');
      setModalTimerAberto(true);

      // Alterna para descanso
      setTimerTipoSessao('descanso');
      segundosRef.current = 0;
      segundosRestantesRef.current = 0;
      setTimerSegundos(0);
      setTimerRodando(false);
      setTimerPausado(false);
    } else {
      enviarNotificacao('Hora de Voltar ao Foco! 📚', 'Seu tempo de descanso terminou. Vamos recomeçar?');
      alert('Seu tempo de descanso terminou! Pronto para começar outra sessão de foco?');
      setTimerTipoSessao('foco');
      segundosRef.current = 0;
      segundosRestantesRef.current = 0;
      setTimerSegundos(0);
      setTimerRodando(false);
      setTimerPausado(false);
    }
  };

  // Sincroniza o cronômetro restante ao alterar o modo/sessão antes de rodar
  useEffect(() => {
    if (!timerRodando) {
      setTimerSegundosRestantes(getSegundosIniciais(timerModo, timerTipoSessao));
    }
  }, [timerModo, timerTipoSessao, timerRodando]);

  // ─── Helpers de formatação ────────────────────────────────────────────
  const formatarTimer = (segundos: number): string => {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const hojeISO = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // ─── Ações do timer ──────────────────────────────────────────────────
  const iniciarTimer = () => {
    requestNotificationPermission();
    const segRest = getSegundosIniciais(timerModo, timerTipoSessao);
    const estado: EstadoTimerSalvo = {
      subjectId: timerSubjectId as number,
      startTimestamp: Date.now(),
      elapsedAtPause: 0,
      isPaused: false,
      modo: timerModo,
      tipoSessao: timerTipoSessao,
      segundosRestantes: segRest
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(estado));
    
    segundosRef.current = 0;
    segundosRestantesRef.current = segRest;
    
    setTimerSegundos(0);
    if (timerModo !== 'livre') {
      setTimerSegundosRestantes(segRest);
    }
    setTimerRodando(true);
    setTimerPausado(false);
  };

  const pausarTimer = () => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (salvo) {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      const decorrido = Math.floor((Date.now() - estado.startTimestamp) / 1000);
      const acumulado = estado.elapsedAtPause + decorrido;
      const rest = timerModo !== 'livre' ? Math.max(0, estado.segundosRestantes - decorrido) : 0;

      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ 
          ...estado, 
          elapsedAtPause: acumulado, 
          isPaused: true,
          segundosRestantes: rest
        })
      );
    }
    setTimerPausado(true);
  };

  const retomarTimer = () => {
    const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
    if (salvo) {
      const estado: EstadoTimerSalvo = JSON.parse(salvo);
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({ ...estado, startTimestamp: Date.now(), isPaused: false })
      );
    }
    setTimerPausado(false);
  };

  const limparTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerRodando(false);
    setTimerPausado(false);
    
    segundosRef.current = 0;
    const initSegRest = getSegundosIniciais(timerModo, 'foco');
    segundosRestantesRef.current = initSegRest;
    
    setTimerSegundos(0);
    setTimerSubjectId('');
    setTimerTipoSessao('foco');
    setTimerSegundosRestantes(initSegRest);
  };

  const abrirFinalizacao = () => {
    if (!timerPausado) pausarTimer();
    setModalSubjectId(timerSubjectId);
    setModalDuracao(Math.max(1, Math.round(segundosRef.current / 60)));
    setModalData(hojeISO());
    setModalObs('');
    setModalErro('');
    setModalTimerAberto(true);
  };

  // ─── Mutation: salvar sessão criada via timer ────────────────────────
  const criarSessaoTimerMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/api/study-sessions', {
        duration: modalDuracao,
        sessionDate: modalData,
        observations: modalObs,
        subjectId: Number(modalSubjectId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setModalTimerAberto(false);
      limparTimer();
      triggerConfetti(); // Recompensa visual!
      onSessionSaved();
    },
    onError: (err) => {
      let msg = 'Erro ao registrar sessão.';
      if (
        axios.isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data
      ) {
        msg = String((err.response.data as { message: string }).message);
      }
      setModalErro(msg);
    },
  });

  const confirmarSessaoTimer = (e: React.FormEvent) => {
    e.preventDefault();
    setModalErro('');
    if (!modalSubjectId) { setModalErro('Selecione uma matéria.'); return; }
    if (modalDuracao <= 0) { setModalErro('A duração deve ser maior que 0.'); return; }
    criarSessaoTimerMutation.mutate();
  };

  return (
    <>
      <div className="card active-timer-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <Timer size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <h2 className="card-title" style={{ margin: 0 }}>Sessão Ativa</h2>
          {timerRodando && (
            <span className={`badge ${timerPausado ? 'badge-warning' : 'badge-success'}`}>
              {timerPausado ? 'Pausado' : 'Rodando'}
            </span>
          )}
          {timerRodando && timerModo !== 'livre' && (
            <span className={`badge ${timerTipoSessao === 'foco' ? 'badge-primary' : 'badge-success'}`}>
              {timerTipoSessao === 'foco' ? 'Foco' : 'Descanso'}
            </span>
          )}
        </div>

        {/* Seletores de Matéria e Método de Estudo */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <select
              className="form-input"
              style={{ width: '100%' }}
              value={timerSubjectId}
              onChange={e => setTimerSubjectId(e.target.value ? Number(e.target.value) : '')}
              disabled={timerRodando}
            >
              <option value="">Selecione a matéria...</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <select
              className="form-input"
              style={{ width: '100%' }}
              value={timerModo}
              onChange={e => setTimerModo(e.target.value as any)}
              disabled={timerRodando}
            >
              <option value="livre">Modo Livre (Cronômetro)</option>
              <option value="pomodoro">Método Pomodoro (25m / 5m)</option>
              <option value="rule5217">Regra 52/17 (52m / 17m)</option>
              <option value="ultradiano">Ritmo Ultradiano (90m / 20m)</option>
            </select>
          </div>
        </div>

        {/* Exibição do Timer e Controles de Ação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <TimerVisor
            isRunning={timerRodando}
            isPaused={timerPausado}
            modo={timerModo}
            tipoSessao={timerTipoSessao}
            initialSeconds={timerSegundos}
            initialSecondsRemaining={timerSegundosRestantes}
            onTick={(s, sRem) => {
              segundosRef.current = s;
              segundosRestantesRef.current = sRem;
              
              // Sincroniza periodicamente com localStorage
              const salvo = localStorage.getItem(TIMER_STORAGE_KEY);
              if (salvo) {
                try {
                  const estado = JSON.parse(salvo);
                  localStorage.setItem(
                    TIMER_STORAGE_KEY,
                    JSON.stringify({ 
                      ...estado, 
                      elapsedAtPause: estado.isPaused ? estado.elapsedAtPause : s,
                      segundosRestantes: sRem
                    })
                  );
                } catch (e) {}
              }
            }}
            onFinished={handleTimerTerminado}
          />

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!timerRodando ? (
              <button
                className="btn btn-primary"
                onClick={iniciarTimer}
                disabled={!timerSubjectId || subjects.length === 0}
              >
                <Play size={15} />
                Iniciar Sessão
              </button>
            ) : (
              <>
                {timerPausado ? (
                  <button className="btn btn-secondary" onClick={retomarTimer}>
                    <Play size={15} />
                    Retomar
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={pausarTimer}>
                    <Pause size={15} />
                    Pausar
                  </button>
                )}
                
                {timerTipoSessao === 'foco' && (
                  <button
                    className="btn btn-primary"
                    onClick={abrirFinalizacao}
                    disabled={timerSegundos < 60}
                    title={timerSegundos < 60 ? 'Estude ao menos 1 minuto antes de finalizar' : ''}
                  >
                    <Square size={15} />
                    Finalizar
                  </button>
                )}

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => { if (confirm('Cancelar o timer? O tempo não será salvo.')) limparTimer(); }}
                  title="Cancelar timer (sem salvar)"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {subjects.length === 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Crie ao menos uma matéria para iniciar um timer.{' '}
            <Link to="/subjects" style={{ color: 'var(--primary)' }}>Criar matéria</Link>
          </p>
        )}
      </div>

      {/* ── Modal: confirmar sessão via timer ── */}
      {modalTimerAberto && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-timer-title">
            <button className="modal-close" onClick={() => setModalTimerAberto(false)} aria-label="Fechar">
              <X size={18} />
            </button>
            <h2 className="modal-title" id="modal-timer-title">Salvar Sessão de Estudo</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Revise os dados antes de confirmar. Você pode ajustar a duração e adicionar observações.
            </p>

            {modalErro && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {modalErro}
              </div>
            )}

            <form onSubmit={confirmarSessaoTimer}>
              <div className="form-group">
                <label className="form-label" htmlFor="timer-subject">Matéria</label>
                <select id="timer-subject" className="form-input" value={modalSubjectId} onChange={e => setModalSubjectId(e.target.value ? Number(e.target.value) : '')} required>
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.subjectName}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-duracao">Duração (Minutos)</label>
                <input id="timer-duracao" type="number" className="form-input" min="1" max="1440" value={modalDuracao} onChange={e => setModalDuracao(Number(e.target.value))} required />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                  Cronometrado: {formatarTimer(segundosRef.current)} → {Math.round(segundosRef.current / 60)} min
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-data">Data da Sessão</label>
                <input id="timer-data" type="date" className="form-input" value={modalData} onChange={e => setModalData(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="timer-obs">Conteúdo / Anotações</label>
                <textarea id="timer-obs" className="form-input form-textarea" placeholder="Ex: Capítulos 3 e 4, exercícios de fixação..." value={modalObs} onChange={e => setModalObs(e.target.value)} maxLength={1000} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModalTimerAberto(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={criarSessaoTimerMutation.isPending}>
                  {criarSessaoTimerMutation.isPending ? 'Salvando...' : 'Salvar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-componente Isolado para Renderizar o Relógio (Ticking) ───
interface TimerVisorProps {
  isRunning: boolean;
  isPaused: boolean;
  modo: 'livre' | 'pomodoro' | 'rule5217' | 'ultradiano';
  tipoSessao: 'foco' | 'descanso';
  initialSeconds: number;
  initialSecondsRemaining: number;
  onTick: (seconds: number, secondsRemaining: number) => void;
  onFinished: () => void;
}

function TimerVisor({
  isRunning,
  isPaused,
  modo,
  tipoSessao,
  initialSeconds,
  initialSecondsRemaining,
  onTick,
  onFinished,
}: TimerVisorProps) {
  const [segundos, setSegundos] = useState(initialSeconds);
  const [segundosRestantes, setSegundosRestantes] = useState(initialSecondsRemaining);

  // Sincroniza os estados quando o timer inicia/reinicia ou restaura do storage
  useEffect(() => {
    setSegundos(initialSeconds);
    setSegundosRestantes(initialSecondsRemaining);
  }, [initialSeconds, initialSecondsRemaining]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        let nextSegundos = 0;
        let nextSegundosRestantes = 0;

        setSegundos(s => {
          nextSegundos = s + 1;
          return nextSegundos;
        });

        if (modo !== 'livre') {
          setSegundosRestantes(rem => {
            if (rem <= 1) {
              clearInterval(interval);
              onFinished();
              return 0;
            }
            nextSegundosRestantes = rem - 1;
            onTick(nextSegundos, nextSegundosRestantes);
            return nextSegundosRestantes;
          });
        } else {
          onTick(nextSegundos, 0);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, modo, tipoSessao]);

  const formatarTimer = (s: number): string => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '2rem',
        fontWeight: 700,
        letterSpacing: '3px',
        color: isRunning && !isPaused ? 'var(--primary)' : 'var(--text-secondary)',
        minWidth: '130px',
        textAlign: 'left',
      }}
    >
      {modo === 'livre' ? formatarTimer(segundos) : formatarTimer(segundosRestantes)}
    </div>
  );
}
