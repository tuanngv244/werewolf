import { create } from 'zustand';
import type { RoomState, RoomPlayer, RoomSettings } from '@shared/types/room.types';

interface RoomListItem {
  id: string;
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

interface RoomStoreState {
  // Room list
  rooms: RoomListItem[];
  isLoadingRooms: boolean;

  // Current room
  currentRoom: RoomState | null;
  isInRoom: boolean;

  // Actions
  setRooms: (rooms: RoomListItem[]) => void;
  setLoadingRooms: (loading: boolean) => void;
  setCurrentRoom: (room: RoomState | null) => void;
  updateRoomPlayer: (player: RoomPlayer) => void;
  removeRoomPlayer: (playerId: string) => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;
  removeRoom: (code: string) => void;
  leaveRoom: () => void;
}

export const useRoomStore = create<RoomStoreState>()((set) => ({
  rooms: [],
  isLoadingRooms: false,
  currentRoom: null,
  isInRoom: false,

  setRooms: (rooms) => set({ rooms }),
  setLoadingRooms: (isLoadingRooms) => set({ isLoadingRooms }),

  setCurrentRoom: (room) =>
    set({ currentRoom: room, isInRoom: room !== null }),

  updateRoomPlayer: (player) =>
    set((state) => {
      if (!state.currentRoom) return state;
      const exists = state.currentRoom.players.some((p) => p.id === player.id);
      const players = exists
        ? state.currentRoom.players.map((p) => (p.id === player.id ? player : p))
        : [...state.currentRoom.players, player];
      return { currentRoom: { ...state.currentRoom, players } };
    }),

  removeRoomPlayer: (playerId) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          players: state.currentRoom.players.filter((p) => p.id !== playerId),
        },
      };
    }),

  updateRoomSettings: (settings) =>
    set((state) => {
      if (!state.currentRoom) return state;
      return {
        currentRoom: {
          ...state.currentRoom,
          settings: { ...state.currentRoom.settings, ...settings },
        },
      };
    }),

  removeRoom: (code) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.code !== code),
    })),

  leaveRoom: () => set({ currentRoom: null, isInRoom: false }),
}));
