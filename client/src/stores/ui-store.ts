import { create } from 'zustand';

interface ModalState {
  type: string;
  props?: Record<string, unknown>;
}

interface UiState {
  isNightMode: boolean;
  isSoundEnabled: boolean;
  modal: ModalState | null;

  setNightMode: (isNight: boolean) => void;
  toggleSound: () => void;
  openModal: (type: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isNightMode: false,
  isSoundEnabled: true,
  modal: null,

  setNightMode: (isNightMode) => set({ isNightMode }),
  toggleSound: () => set((s) => ({ isSoundEnabled: !s.isSoundEnabled })),
  openModal: (type, props) => set({ modal: { type, props } }),
  closeModal: () => set({ modal: null }),
}));
