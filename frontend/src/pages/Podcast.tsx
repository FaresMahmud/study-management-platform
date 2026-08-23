import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { ExamPrep } from '../types';
import { Play, Pause, Volume2, VolumeX, Download, Sparkles, Radio, ArrowLeft, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { triggerConfetti } from '../utils/confetti';
import { usePodcastStore, globalAudio } from '../store/podcastStore';

export default function Podcast() {
  const [selectedExamPrepId, setSelectedExamPrepId] = useState<number | ''>('');
  const [difficultyLevel, setDifficultyLevel] = useState<'BASIC' | 'MEDIUM' | 'ADVANCED'>('MEDIUM');
  
  // Get global store state
  const {
    currentTrackUrl,
    isPlaying,
    currentTime,
    duration,
    playTrack,
    pauseTrack,
    resumeTrack,
    setProgress
  } = usePodcastStore();

  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Queries
  const { data: examPreps = [] } = useQuery<ExamPrep[]>({
    queryKey: ['examPreps'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<{ content?: ExamPrep[] }>('/api/v1/exam-preps');
        return Array.isArray(response.data) ? response.data : (response.data.content || []);
      } catch {
        return [];
      }
    },
  });

  const activeExam = examPreps.find(e => e.status === 'ACTIVE') || examPreps[0];

  useEffect(() => {
    if (activeExam && selectedExamPrepId === '') {
      setTimeout(() => setSelectedExamPrepId(activeExam.id), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExam]);

  interface PodcastResponse {
  playUrl: string;
  scriptText: string;
}

  // Mutation de Geração de Podcast
  const generatePodcastMutation = useMutation({
    mutationFn: async (params: { examPrepId: number; difficultyLevel: string }) => {
      return (await apiClient.post<PodcastResponse>('/api/v1/ai/podcast/generate', params)).data;
    },
    onSuccess: (data) => {
      triggerConfetti();
      const trackUrl = `${apiClient.defaults.baseURL}${data.playUrl}`;
      const trackTitle = examPreps.find(e => e.id === selectedExamPrepId)?.title || 'Briefing de Estudos';
      playTrack(trackUrl, trackTitle);
    }
  });

  // Query para buscar podcast existente
  const { data: currentPodcast, isLoading: isPodcastLoading } = useQuery<PodcastResponse | null>({
    queryKey: ['podcast', selectedExamPrepId, difficultyLevel],
    queryFn: async () => {
      if (!selectedExamPrepId) return null;
      const res = await apiClient.post<PodcastResponse>('/api/v1/ai/podcast/generate', {
        examPrepId: selectedExamPrepId,
        difficultyLevel
      });
      return res.data;
    },
    enabled: !!selectedExamPrepId,
  });

  const podcastAudioUrl = currentPodcast?.playUrl
    ? `${apiClient.defaults.baseURL}${currentPodcast.playUrl}`
    : '';

  // Handlers do Player
  const togglePlay = () => {
    if (!podcastAudioUrl) return;

    if (currentTrackUrl === podcastAudioUrl) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      const trackTitle = examPreps.find(e => e.id === selectedExamPrepId)?.title || 'Briefing de Estudos';
      playTrack(podcastAudioUrl, trackTitle);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProgress(Number(e.target.value));
  };

  const handleSpeedToggle = () => {
    let nextRate = 1.0;
    if (playbackRate === 1.0) nextRate = 1.25;
    else if (playbackRate === 1.25) nextRate = 1.5;
    else if (playbackRate === 1.5) nextRate = 2.0;
    
    globalAudio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    globalAudio.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    globalAudio.muted = !isMuted;
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

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
      
      {/* Header com Navegação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <Link to="/" className="btn btn-secondary btn-sm" style={{ padding: 'var(--space-xs)' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            🎧 Podcast de Estudo Inteligente
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Gere resumos explicativos em áudio a partir das suas matérias e PDFs usando Inteligência Artificial.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        
        {/* COLUNA ESQUERDA: CONTROLES DE ESCOLHA E CONFIGURAÇÃO */}
        <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '21px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={20} className="text-primary" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Configurar Podcast</h3>
          </div>

          {/* Selecionar Preparação de Exame */}
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
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
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Nível do Roteiro
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-xs)' }}>
              {(['BASIC', 'MEDIUM', 'ADVANCED'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficultyLevel(level)}
                  className={`btn ${difficultyLevel === level ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '8px 4px',
                    fontSize: '0.75rem',
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
              marginTop: 'var(--space-sm)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 'var(--space-xs)',
              padding: 'var(--space-sm)'
            }}
          >
            <Sparkles size={16} />
            <span>
              {generatePodcastMutation.isPending ? 'Sintetizando Roteiro e Áudio...' : 'Regerar Roteiro com IA'}
            </span>
          </button>
        </div>

        {/* COLUNA DIREITA: PLAYER E ROTEIRO */}
        <div className="card" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '21px', border: '1px solid var(--border-color)', minHeight: '380px', position: 'relative' }}>
          

          {isPodcastLoading || generatePodcastMutation.isPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 'var(--space-md)' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 'var(--space-md)', textAlign: 'center' }}>
              <div style={{ padding: 'var(--space-md)', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                <Headphones size={36} />
              </div>
              <div>
                <h4 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>Nenhum Podcast Criado</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', marginTop: '4px' }}>
                  Clique no botão para gerar o roteiro e sintetizar o podcast para este objetivo!
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', flex: 1 }}>
              
              {/* Box do Custom Audio Player */}
              <div style={{ 
                background: 'var(--bg-tertiary)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-md)', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)'
              }}>
                
                {/* Visualizador de Onda Estático/Dinâmico */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center', height: 'var(--space-lg)', justifyContent: 'center' }}>
                  {(() => {
                    // Use a stable seed for pseudo-randomness during render
                    // Compute once per render cycle via IIFE but without Date.now()
                    const seed = 12345; // Fixed seed for deterministic animation
                    return Array.from({ length: 28 }).map((_, i) => {
                      const active = isPlaying;
                      // Use a deterministic pseudo-random based on index
                      const pseudoRandom = Math.sin(i * 12.345 + seed * 0.001) * 0.5 + 0.5;
                      const h = 5 + Math.sin(i * 0.5) * 15 + (active ? pseudoRandom * 8 : 0);
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
                    });
                  })()}
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
                      style={{ padding: 'var(--space-xs)' }}
                    >
                      <Download size={14} />
                    </a>
                  )}
                </div>

                {/* Volume Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', flex: 1 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                  📄 Acompanhar Leitura (Script)
                </h4>
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: 'var(--space-md)',
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
