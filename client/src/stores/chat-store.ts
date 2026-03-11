import { create } from 'zustand';

export type ChatChannel = 'DAY' | 'WEREWOLF' | 'DEAD' | 'MEDIUM_DEAD';

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  activeChannel: ChatChannel;

  addMessage: (message: ChatMessage) => void;
  setActiveChannel: (channel: ChatChannel) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  activeChannel: 'DAY',

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setActiveChannel: (activeChannel) => set({ activeChannel }),

  clearMessages: () => set({ messages: [] }),
}));
