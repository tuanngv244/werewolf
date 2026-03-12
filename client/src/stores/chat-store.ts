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

// Synchronous dedup set to prevent TOCTOU race in Zustand's batched updates
const _pendingMessageIds = new Set<string>();

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  activeChannel: 'DAY',

  addMessage: (message) => {
    // Synchronous guard: if this message ID is already pending or stored, skip
    if (_pendingMessageIds.has(message.id)) return;
    _pendingMessageIds.add(message.id);

    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    });
  },

  setActiveChannel: (activeChannel) => set({ activeChannel }),

  clearMessages: () => {
    _pendingMessageIds.clear();
    set({ messages: [] });
  },
}));
