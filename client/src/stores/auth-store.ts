import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface User {
  id: string;
  username: string;
  email?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  guestLogin: (username?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setError: (error: string | null) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      guestLogin: async (username?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.guestLogin(username);
          localStorage.setItem('token', res.token);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isLoading: false });
          connectSocket(res.token);
        } catch (e) {
          set({ error: (e as Error).message, isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.login(email, password);
          localStorage.setItem('token', res.token);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isLoading: false });
          connectSocket(res.token);
        } catch (e) {
          set({ error: (e as Error).message, isLoading: false });
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.register(username, email, password);
          localStorage.setItem('token', res.token);
          set({ user: res.user, token: res.token, refreshToken: res.refreshToken, isLoading: false });
          connectSocket(res.token);
        } catch (e) {
          set({ error: (e as Error).message, isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        disconnectSocket();
        set({ user: null, token: null, refreshToken: null, error: null });
      },

      setError: (error) => set({ error }),

      hydrate: () => {
        const { token } = get();
        if (token) {
          localStorage.setItem('token', token);
          connectSocket(token);
        }
      },
    }),
    {
      name: 'werewolf-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
