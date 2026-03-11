// ============================================================
// Socket Event Types — Werewolf Game
// ============================================================

import type {
  GamePhase,
  GameState,
  PlayerState,
  Role,
  SeerResult,
  DeathCause,
  WinCondition,
} from './game.types';
import type { RoomState, RoomSettings } from './room.types';

// ---- Event Names ----

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Auth
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',

  // Room
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_KICK: 'room:kick',
  ROOM_UPDATE: 'room:update',
  ROOM_READY: 'room:ready',
  ROOM_START: 'room:start',
  ROOM_LIST: 'room:list',
  ROOM_ERROR: 'room:error',

  // Game Flow
  GAME_START: 'game:start',
  GAME_PHASE: 'game:phase',
  GAME_STATE: 'game:state',
  GAME_OVER: 'game:over',
  GAME_ROLE_ASSIGN: 'game:role:assign',

  // Night Actions
  GAME_NIGHT_ACTION: 'game:night:action',
  GAME_NIGHT_RESULT: 'game:night:result',

  // Day Actions
  GAME_DAY_GUNNER_SHOOT: 'game:day:gunner:shoot',
  GAME_DAY_SHAMAN_CURSE: 'game:day:shaman:curse',

  // Vote
  GAME_VOTE_START: 'game:vote:start',
  GAME_VOTE_CAST: 'game:vote:cast',
  GAME_VOTE_RESULT: 'game:vote:result',

  // Special Events
  GAME_DAWN: 'game:dawn',
  GAME_DEATH: 'game:death',
  GAME_CURSED_CONVERT: 'game:cursed:convert',
  GAME_FOOL_WIN: 'game:fool:win',
  GAME_HEADHUNTER_WIN: 'game:headhunter:win',
  GAME_BOMB_EXPLODE: 'game:bomb:explode',
  GAME_TRAP_TRIGGER: 'game:trap:trigger',
  GAME_MEDIUM_RESURRECT: 'game:medium:resurrect',

  // Chat
  CHAT_MESSAGE: 'chat:message',
  CHAT_SYSTEM: 'chat:system',

  // Error
  ERROR: 'error',
} as const;

// ---- Payload Types ----

// Auth
export interface AuthPayload {
  token: string;
}

export interface AuthSuccessPayload {
  userId: string;
  username: string;
}

// Room
export interface RoomCreatePayload {
  settings: RoomSettings;
}

export interface RoomJoinPayload {
  roomCode: string;
}

export interface RoomKickPayload {
  targetUserId: string;
}

export interface RoomUpdatePayload {
  room: RoomState;
}

export interface RoomReadyPayload {
  isReady: boolean;
}

export interface RoomListPayload {
  rooms: RoomState[];
}

// Game
export interface GameStartPayload {
  gameId: string;
  players: Pick<PlayerState, 'id' | 'username'>[];
}

export interface GameRoleAssignPayload {
  role: Role;
  team: string;
  // Headhunter gets target info
  headhunterTarget?: { id: string; username: string };
  // Werewolves get teammate info
  teammates?: { id: string; username: string; role: Role }[];
}

export interface GamePhasePayload {
  phase: GamePhase;
  round: number;
  duration: number; // seconds
  phaseEndTime: number; // unix timestamp
}

export interface NightActionPayload {
  action: string; // role-specific action type
  targetId?: string;
}

export interface NightResultPayload {
  type: 'seer_check' | 'aura_check' | 'werewolf_seer_check' | 'witch_info' | 'medium_chat';
  targetId?: string;
  targetUsername?: string;
  role?: Role;
  seerResult?: SeerResult;
  attackedPlayerId?: string; // for witch
}

export interface DawnPayload {
  deaths: {
    userId: string;
    username: string;
    cause: DeathCause;
    role?: Role; // revealed on death
  }[];
  events: {
    type: string;
    message: string;
    data?: Record<string, unknown>;
  }[];
}

export interface GunnerShootPayload {
  targetId: string;
}

export interface ShamanCursePayload {
  targetId: string;
}

export interface VoteCastPayload {
  targetId: string | null; // null = skip vote
}

export interface VoteResultPayload {
  votes: Record<string, string | null>; // voterId -> targetId
  eliminated: {
    id: string;
    username: string;
    role: Role;
  } | null;
  isTie: boolean;
}

export interface GameOverPayload {
  winners: WinCondition[];
  soloWinners: { role: Role; id: string; username: string }[];
  players: (PlayerState & { role: Role })[];
  rounds: number;
  duration: number; // seconds
}

// Chat
export enum ChatChannel {
  DAY = 'day',
  WEREWOLF = 'werewolf',
  DEAD = 'dead',
  MEDIUM_DEAD = 'medium_dead',
  SYSTEM = 'system',
}

export interface ChatMessagePayload {
  channel: ChatChannel;
  message: string;
}

export interface ChatMessageBroadcast {
  id: string;
  channel: ChatChannel;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export interface ChatSystemPayload {
  channel: ChatChannel;
  messageKey: string; // i18n key
  params?: Record<string, string>;
  timestamp: number;
}

// Error
export interface ErrorPayload {
  code: string;
  message: string;
}
