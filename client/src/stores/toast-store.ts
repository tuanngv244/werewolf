import { create } from 'zustand';

export interface GameToastItem {
  id: string;
  icon: string;
  title: string;
  message: string;
  variant: 'info' | 'danger' | 'success' | 'warning' | 'witch';
  /** Auto-dismiss after ms (0 = manual dismiss only) */
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: GameToastItem[];
  addToast: (toast: Omit<GameToastItem, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, createdAt: Date.now() }],
    }));
    // Auto-dismiss
    if (toast.duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAll: () => set({ toasts: [] }),
}));
