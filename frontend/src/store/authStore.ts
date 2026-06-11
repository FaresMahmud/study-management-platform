import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  login: (token: string, userName: string, userEmail: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Inicialização a partir do localStorage para manter a sessão persistente
  const savedToken = localStorage.getItem('study_token');
  const savedName = localStorage.getItem('study_name');
  const savedEmail = localStorage.getItem('study_email');

  return {
    token: savedToken,
    userName: savedName,
    userEmail: savedEmail,
    isAuthenticated: !!savedToken,
    login: (token, userName, userEmail) => {
      localStorage.setItem('study_token', token);
      localStorage.setItem('study_name', userName);
      localStorage.setItem('study_email', userEmail);
      set({ token, userName, userEmail, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('study_token');
      localStorage.removeItem('study_name');
      localStorage.removeItem('study_email');
      set({ token: null, userName: null, userEmail: null, isAuthenticated: false });
    },
  };
});
