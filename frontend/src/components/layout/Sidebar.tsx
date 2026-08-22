import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BookOpen, FolderOpen, Brain, TrendingUp, Settings, Play, Pause, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePodcastStore } from '../../store/podcastStore';
import './Sidebar.css';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workspace', label: 'Área de Estudo', icon: BookOpen },
  { id: 'subjects', label: 'Matérias', icon: FolderOpen },
  { id: 'flashcards', label: 'Flashcards', icon: Brain },
  { id: 'analytics', label: 'Estatísticas', icon: TrendingUp },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export function Sidebar({ activeTab, setActiveTab, isMobileOpen, onMobileClose }: SidebarProps) {
  const { currentTrackUrl, currentTrackTitle, isPlaying, currentTime, duration, pauseTrack, resumeTrack, stopTrack } = usePodcastStore();
  const [collapsed, setCollapsed] = useState(false);

  // Persistir estado no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setCollapsed(saved === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const m = Math.floor(time / 60).toString().padStart(2, '0');
    const s = Math.floor(time % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} style={{ width: sidebarWidth }}>
      <div className="sidebar-header">
        {!collapsed && <div className="sidebar-brand">StudyFlow</div>}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (onMobileClose) onMobileClose();
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Global Mini Podcast Player */}
      {currentTrackUrl && (
        <div className="sidebar-podcast-player" style={{ padding: collapsed ? '12px 8px' : '16px' }}>
          {!collapsed && (
            <>
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
            </>
          )}

          {!collapsed ? (
            <>
              <div className="player-controls-row">
                {isPlaying ? (
                  <button className="player-btn" onClick={pauseTrack} title="Pausar"><Pause size={14} fill="currentColor" /></button>
                ) : (
                  <button className="player-btn" onClick={resumeTrack} title="Tocar"><Play size={14} fill="currentColor" /></button>
                )}
                <button className="player-btn danger" onClick={stopTrack} title="Parar"><Square size={12} fill="currentColor" /></button>
              </div>
            </>
          ) : (
            <div className="player-controls-row" style={{ justifyContent: 'center' }}>
              {isPlaying ? (
                <button className="player-btn" onClick={pauseTrack} title="Pausar"><Pause size={14} fill="currentColor" /></button>
              ) : (
                <button className="player-btn" onClick={resumeTrack} title="Tocar"><Play size={14} fill="currentColor" /></button>
              )}
              <button className="player-btn danger" onClick={stopTrack} title="Parar"><Square size={12} fill="currentColor" /></button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
