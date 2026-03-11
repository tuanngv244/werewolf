// ============================================================
// Room Types — Werewolf Game
// ============================================================

import type { Role, GameTimers } from './game.types';

export enum RoomStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  IN_GAME = 'in_game',
  ENDED = 'ended',
}

export interface RoomPlayer {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  isConnected: boolean;
  avatarUrl?: string;
}

export interface RoomSettings {
  maxPlayers: number;
  isPrivate: boolean;
  roles: Role[];
  timers: GameTimers;
}

export interface RoomState {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  players: RoomPlayer[];
  settings: RoomSettings;
}
