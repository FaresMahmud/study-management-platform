import React from 'react';
import { LayoutDashboard, BookOpen, Brain, TrendingUp, Settings, Play, Pause, Square } from 'lucide-react';
import { usePodcastStore } from '../../store/podcastStore';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'subjects', label: 'Matérias', icon: BookOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Brain },
  { id: 'analytics', label: 'Estatísticas', icon: TrendingUp },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { currentTrackUrl, currentTrackTitle, isPlaying, currentTime, duration, pauseTrack, resumeTrack, stopTrack } = usePodcastStore();

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">StudyFlow</div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Mini Podcast Player */}
      {currentTrackUrl && (
        <div className="sidebar-podcast-player">
          <div className="player-track-info">
            <span className="player-track-tag">Ouvindo Briefing 🎧</span>
            <span className="player-track-title" title={currentTrackTitle || ''}>{currentTrackTitle}</span>
          </div>
          
          <div className="player-time-row">
            <span>{formatTime(currentTime)}</span>
            <div className="player-progress-bg">
              <div className="player-progress-fill" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="player-controls-row">
            {isPlaying ? (
              <button className="player-btn" onClick={pauseTrack} title="Pausar"><Pause size={14} fill="currentColor" /></button>
            ) : (
              <button className="player-btn" onClick={resumeTrack} title="Tocar"><Play size={14} fill="currentColor" /></button>
            )}
            <button className="player-btn danger" onClick={stopTrack} title="Parar"><Square size={12} fill="currentColor" /></button>
          </div>
        </div>
      )}
    </aside>
  );
}
