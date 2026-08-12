import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userName: string | null;
  userEmail: string | null;
  premium: boolean;
  isAuthenticated: boolean;
  login: (token: string, userName: string, userEmail: string, premium: boolean) => void;
  setPremium: (premium: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Inicialização a partir do localStorage para manter a sessão persistente
  const savedToken = localStorage.getItem('study_token');
  const savedName = localStorage.getItem('study_name');
  const savedEmail = localStorage.getItem('study_email');
  const savedPremium = localStorage.getItem('study_premium') === 'true';

  const userName = savedName === 'undefined' ? null : savedName;
  const userEmail = savedEmail === 'undefined' ? null : savedEmail;

  return {
    token: savedToken,
    userName: userName,
    userEmail: userEmail,
    premium: savedPremium,
    isAuthenticated: !!savedToken,
    login: (token, userName, userEmail, premium) => {
      localStorage.setItem('study_token', token);
      localStorage.setItem('study_name', userName);
      localStorage.setItem('study_email', userEmail);
      localStorage.setItem('study_premium', String(premium));
      set({ token, userName, userEmail, premium, isAuthenticated: true });
    },
    setPremium: (premium) => {
      localStorage.setItem('study_premium', String(premium));
      set({ premium });
    },
    logout: () => {
      localStorage.removeItem('study_token');
      localStorage.removeItem('study_name');
      localStorage.removeItem('study_email');
      localStorage.removeItem('study_premium');
      set({ token: null, userName: null, userEmail: null, premium: false, isAuthenticated: false });
    },
  };
});
