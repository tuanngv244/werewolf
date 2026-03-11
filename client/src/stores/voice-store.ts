import { create } from 'zustand';

interface VoiceState {
  isMicOn: boolean;
  isListening: boolean;
  isMicAllowed: boolean;

  toggleMic: () => void;
  toggleListening: () => void;
  setMicOn: (on: boolean) => void;
  setListening: (on: boolean) => void;
  setMicAllowed: (allowed: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>()((set) => ({
  isMicOn: false,
  isListening: true,
  isMicAllowed: true,

  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),
  toggleListening: () => set((s) => ({ isListening: !s.isListening })),
  setMicOn: (isMicOn) => set({ isMicOn }),
  setListening: (isListening) => set({ isListening }),
  setMicAllowed: (isMicAllowed) => set({ isMicAllowed }),
  reset: () => set({ isMicOn: false, isListening: true, isMicAllowed: true }),
}));
