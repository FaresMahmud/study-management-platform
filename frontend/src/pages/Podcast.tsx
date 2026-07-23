import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ExamPrep } from '../types';
import { Play, Pause, Volume2, VolumeX, Download, Sparkles, Clock, Radio, ArrowLeft, Headphones, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';

export default function Podcast() {
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  const [difficultyLevel, setDifficultyLevel] = useState<'BASIC' | 'MEDIUM' | 'ADVANCED'>('MEDIUM');
  
  // Estados do Player de Áudio
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Queries
  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['examPreps'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/api/v1/exam-preps');
        return Array.isArray(response.data) ? response.data : (response.data.content || []);
      } catch (err) {
        return [];
      }
    },
  });

  const activeExam = examPreps.find(e => e.status === 'ACTIVE') || examPreps[0];

  useEffect(() => {
    if (activeExam && selectedExamPrepId === '') {
      setSelectedExamPrepId(activeExam.id);
    }
  }, [activeExam, selectedExamPrepId]);

  // Mutation de Geração de Podcast
  const generatePodcastMutation = useMutation({
    mutationFn: async (params: { examPrepId: number; difficultyLevel: string }) => {
      return (await apiClient.post<any>('/api/v1/ai/podcast/generate', params)).data;
    },
    onSuccess: (data) => {
      triggerConfetti();
      // Reinicia o player caso estivesse tocando
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = `${apiClient.defaults.baseURL || 'http://localhost:8080'}${data.playUrl}`;
        audioRef.current.load();
        setIsPlaying(false);
        setCurrentTime(0);
      }
    }
  });

  // Query para buscar podcast existente
  const { data: currentPodcast, isLoading: isPodcastLoading, refetch: refetchPodcast } = useQuery<any>({
    queryKey: ['podcast', selectedExamPrepId, difficultyLevel],
    queryFn: async () => {
      if (!selectedExamPrepId) return null;
      // Fazemos o POST para verificar se já existe ou obter o script (sem forçar nova regeneração se não necessário)
      const res = await apiClient.post<any>('/api/v1/ai/podcast/generate', {
        examPrepId: selectedExamPrepId,
        difficultyLevel
      });
      return res.data;
    },
    enabled: !!selectedExamPrepId,
  });

  useEffect(() => {
    if (currentPodcast?.playUrl && audioRef.current) {
      audioRef.current.src = `${apiClient.defaults.baseURL || 'http://localhost:8080'}${currentPodcast.playUrl}`;
      audioRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentPodcast]);

  // Configura listeners do áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Handlers do Player
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => console.log('Erro ao tocar áudio:', err));
      setIsPlaying(true);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSpeedToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    let nextRate = 1.0;
    if (playbackRate === 1.0) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2.0;
    
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = Number(e.target.value);
    audio.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (timeInSecs: number) => {
    if (isNaN(timeInSecs)) return '00:00';
    const mins = Math.floor(timeInSecs / 60).toString().padStart(2, '0');
    const secs = Math.floor(timeInSecs % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleGenerateClick = () => {
    if (!selectedExamPrepId) return;
    generatePodcastMutation.mutate({
      examPrepId: Number(selectedExamPrepId),
      difficultyLevel
    });
  };

  const podcastAudioUrl = currentPodcast?.playUrl 
    ? `${apiClient.defaults.baseURL || 'http://localhost:8080'}${currentPodcast.playUrl}`
    : '';

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      
      {/* Header com Navegação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ padding: '8px' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', tracking: '-0.02em', margin: 0 }}>
            🎧 Podcast de Estudo Inteligente
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Gere resumos explicativos em áudio a partir das suas matérias e PDFs usando Inteligência Artificial.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* COLUNA ESQUERDA: CONTROLES DE ESCOLHA E CONFIGURAÇÃO */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '21px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} className="text-primary" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Configurar Podcast</h3>
          </div>

          {/* Selecionar Preparação de Exame */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Objetivo de Estudo
            </label>
            <select 
              className="form-input" 
              style={{ width: '100%', margin: 0 }}
              value={selectedExamPrepId} 
              onChange={e => setSelectedExamPrepId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecione um Objetivo...</option>
              {examPreps.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          {/* Selecionar Nível de Dificuldade */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Nível do Roteiro
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['BASIC', 'MEDIUM', 'ADVANCED'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficultyLevel(level)}
                  className={`btn ${difficultyLevel === level ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'capitalize'
                  }}
                >
                  {level === 'BASIC' ? 'Básico' : level === 'MEDIUM' ? 'Médio' : 'Avançado'}
                </button>
              ))}
            </div>
          </div>

          {/* Botão Principal de Ação */}
          <button 
            className="btn btn-primary" 
            disabled={!selectedExamPrepId || generatePodcastMutation.isPending || isPodcastLoading} 
            onClick={handleGenerateClick}
            style={{ 
              marginTop: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              padding: '12px'
            }}
          >
            <Sparkles size={16} />
            <span>
              {generatePodcastMutation.isPending ? 'Sintetizando Roteiro e Áudio...' : 'Regerar Roteiro com IA'}
            </span>
          </button>
        </div>

        {/* COLUNA DIREITA: PLAYER E ROTEIRO */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '21px', border: '1px solid var(--border-color)', minHeight: '380px', position: 'relative' }}>
          
          <audio ref={audioRef} style={{ display: 'none' }} />

          {isPodcastLoading || generatePodcastMutation.isPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
              <div className="wave-pulse" style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '40px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
                  <div 
                    key={bar} 
                    style={{ 
                      width: '4px', 
                      height: '100%', 
                      backgroundColor: 'var(--primary)', 
                      borderRadius: '2px',
                      animation: 'wave-height 1s ease-in-out infinite alternate',
                      animationDelay: `${bar * 0.1}s`
                    }} 
                  />
                ))}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Sintetizando áudio explicativo e gerando script do podcast...
              </p>
            </div>
          ) : !currentPodcast?.scriptText ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', textAlign: 'center' }}>
              <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                <Headphones size={36} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '16px' }}>Nenhum Podcast Criado</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', marginTop: '4px' }}>
                  Clique no botão para gerar o roteiro e sintetizar o podcast para este objetivo!
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              
              {/* Box do Custom Audio Player */}
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                
                {/* Visualizador de Onda Estático/Dinâmico */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: '24px', justifyContent: 'center' }}>
                  {Array.from({ length: 28 }).map((_, i) => {
                    const active = isPlaying;
                    const h = 5 + Math.sin(i * 0.5) * 15 + (active ? Math.random() * 8 : 0);
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          width: '3px', 
                          height: `${Math.max(4, h)}px`, 
                          backgroundColor: isPlaying ? 'var(--primary)' : 'var(--text-muted)', 
                          borderRadius: '1px',
                          opacity: isPlaying ? 0.9 : 0.4,
                          transition: 'height 0.15s ease'
                        }} 
                      />
                    );
                  })}
                </div>

                {/* Slider de Progresso */}
                <div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleTimeChange}
                    style={{ 
                      width: '100%', 
                      accentColor: 'var(--primary)', 
                      cursor: 'pointer',
                      height: '4px',
                      borderRadius: '2px'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', fontFamily: 'monospace' }}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Controles Principais */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  
                  {/* Botão de Velocidade */}
                  <button 
                    onClick={handleSpeedToggle}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', fontWeight: 800, padding: '6px 10px', fontFamily: 'monospace' }}
                  >
                    {playbackRate.toFixed(2)}x
                  </button>

                  {/* Play/Pause Central */}
                  <button 
                    onClick={togglePlay}
                    style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--primary)', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 12px var(--primary-glow)',
                      transition: 'transform 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {isPlaying ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" style={{ marginLeft: '3px' }} />}
                  </button>

                  {/* Botão Download MP3 */}
                  {podcastAudioUrl && (
                    <a 
                      href={podcastAudioUrl} 
                      download={`podcast_${selectedExamPrepId}_${difficultyLevel}.mp3`}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '8px' }}
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {/* Volume Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <button onClick={toggleMute} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    style={{ width: '80px', accentColor: 'var(--text-secondary)', height: '3px' }}
                  />
                </div>

              </div>

              {/* Roteiro para leitura visual */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  📄 Acompanhar Leitura (Script)
                </h4>
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '16px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {currentPodcast.scriptText}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Estilos adicionais para animação da onda e do player */}
      <style>{`
        @keyframes wave-height {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>

    </div>
  );
}
