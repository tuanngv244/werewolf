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
// Cap the dedup set to prevent unbounded growth in long sessions
const MAX_PENDING_IDS = 500;

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  activeChannel: 'DAY',

  addMessage: (message) => {
    // If message has no id, generate a fingerprint from content to dedup
    const dedupeId = message.id || `${message.senderId}:${message.timestamp}:${message.content}`;

    // Synchronous guard: if this message ID is already pending or stored, skip
    if (_pendingMessageIds.has(dedupeId)) return;
    _pendingMessageIds.add(dedupeId);

    // Prevent unbounded growth — prune oldest entries when limit exceeded
    if (_pendingMessageIds.size > MAX_PENDING_IDS) {
      const iter = _pendingMessageIds.values();
      for (let i = 0; i < 100; i++) {
        const val = iter.next().value;
        if (val !== undefined) _pendingMessageIds.delete(val);
      }
    }

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
