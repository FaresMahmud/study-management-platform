import { create } from 'zustand';

export const globalAudio = new Audio();

interface PodcastState {
  currentTrackUrl: string | null;
  currentTrackTitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playTrack: (url: string, title: string) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  stopTrack: () => void;
  setProgress: (time: number) => void;
}

export const usePodcastStore = create<PodcastState>((set) => {
  // Sync listeners to update Zustand state reactively
  globalAudio.addEventListener('play', () => set({ isPlaying: true }));
  globalAudio.addEventListener('pause', () => set({ isPlaying: false }));
  globalAudio.addEventListener('ended', () => set({ isPlaying: false }));
  globalAudio.addEventListener('timeupdate', () => set({ currentTime: globalAudio.currentTime }));
  globalAudio.addEventListener('durationchange', () => set({ duration: globalAudio.duration || 0 }));

  return {
    currentTrackUrl: null,
    currentTrackTitle: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playTrack: (url, title) => {
      if (globalAudio.src !== url) {
        globalAudio.src = url;
        globalAudio.load();
      }
      globalAudio.play().catch(err => console.log('Audio playback error:', err));
      set({ currentTrackUrl: url, currentTrackTitle: title, isPlaying: true, currentTime: 0 });
    },
    pauseTrack: () => {
      globalAudio.pause();
      set({ isPlaying: false });
    },
    resumeTrack: () => {
      globalAudio.play().catch(err => console.log('Audio playback error:', err));
      set({ isPlaying: true });
    },
    stopTrack: () => {
      globalAudio.pause();
      globalAudio.src = '';
      set({ currentTrackUrl: null, currentTrackTitle: null, isPlaying: false, currentTime: 0, duration: 0 });
    },
    setProgress: (time) => {
      globalAudio.currentTime = time;
      set({ currentTime: time });
    }
  };
});
