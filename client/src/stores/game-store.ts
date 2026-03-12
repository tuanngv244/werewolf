import { create } from 'zustand';
import { GamePhase } from '@shared/types/game.types';
import type { Role, Team, GameTimers } from '@shared/types/game.types';

interface GamePlayer {
  id: string;
  username: string;
  role?: Role;
  team?: Team;
  isAlive: boolean;
  isConnected: boolean;
}

interface NightResult {
  killed: string[];
  saved: string[];
  messages: string[];
}

interface VoteState {
  votes: Record<string, string>;
  result?: { eliminatedId: string | null; voteCount: Record<string, number> };
}

interface SeerResultData {
  targetId: string;
  alignment: string; // 'good' | 'evil' | 'unknown'
}

interface WerewolfSeerResultData {
  targetId: string;
  role: Role;
}

interface AuraSeerResultData {
  targetId: string;
  result: string; // 'GOOD' | 'EVIL' | 'UNKNOWN'
}

interface WolfPlayer {
  id: string;
  username: string;
  role: Role;
}

export interface DeathLogEntry {
  playerId: string;
  playerName: string;
  cause: string;
  round: number;
  phase: string;
}

interface GameState {
  gameId: string | null;
  phase: GamePhase | null;
  round: number;
  players: GamePlayer[];
  myRole: Role | null;
  myTeam: Team | null;
  isAlive: boolean;
  timers: GameTimers | null;
  phaseEndAt: number | null;
  nightResult: NightResult | null;
  voteState: VoteState | null;
  winners: { team: Team; playerIds: string[] } | null;

  // Night action state
  nightActionDone: boolean;
  nightActionTarget: string | null;

  // Seer results
  seerResult: SeerResultData | null;
  auraSeerResult: AuraSeerResultData | null;
  werewolfSeerResult: WerewolfSeerResultData | null;

  // Witch target (who was attacked by werewolves)
  witchAttackedTarget: string | null;

  // Werewolf team info
  werewolfTeam: WolfPlayer[];

  // Headhunter target
  headhunterTarget: string | null;

  // Role list for the game
  roleList: Role[];

  // Death log
  deathLog: DeathLogEntry[];

  // Intro overlay — tracked client-side since server INTRO phase may elapse before client navigates
  shouldShowIntro: boolean;

  // Room code for post-game navigation
  lastRoomCode: string | null;

  // Actions
  setGame: (
    gameId: string,
    players: GamePlayer[],
    timers: GameTimers,
    phase?: GamePhase | null,
    phaseEndAt?: number | null,
    roleList?: Role[],
  ) => void;
  setPhase: (phase: GamePhase, endAt: number, round?: number) => void;
  setMyRole: (role: Role, team: Team, headhunterTarget?: string) => void;
  updatePlayer: (playerId: string, updates: Partial<GamePlayer>) => void;
  setNightResult: (result: NightResult) => void;
  setVoteState: (state: VoteState) => void;
  setNightAction: (target: string | null) => void;
  setWinners: (team: Team, playerIds: string[]) => void;
  setSeerResult: (result: SeerResultData) => void;
  setAuraSeerResult: (result: AuraSeerResultData) => void;
  setWerewolfSeerResult: (result: WerewolfSeerResultData) => void;
  setWitchAttackedTarget: (targetId: string | null) => void;
  setWerewolfTeam: (wolves: WolfPlayer[]) => void;
  setIsAlive: (alive: boolean) => void;
  addDeathLogEntry: (entry: DeathLogEntry) => void;
  setShouldShowIntro: (show: boolean) => void;
  resetGame: () => void;
}

const initialState = {
  gameId: null,
  phase: null,
  round: 0,
  players: [],
  myRole: null,
  myTeam: null,
  isAlive: true,
  timers: null,
  phaseEndAt: null,
  nightResult: null,
  voteState: null,
  winners: null,
  nightActionDone: false,
  nightActionTarget: null,
  seerResult: null,
  auraSeerResult: null,
  werewolfSeerResult: null,
  witchAttackedTarget: null,
  werewolfTeam: [],
  headhunterTarget: null,
  roleList: [],
  deathLog: [],
  shouldShowIntro: false,
  lastRoomCode: null,
};

export const useGameStore = create<GameState>()((set) => ({
  ...initialState,

  setGame: (gameId, players, timers, phase, phaseEndAt, roleList) => {
    // Deduplicate players by ID to prevent React key warnings
    const seen = new Set<string>();
    const uniquePlayers = players.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    // Reset all game state when starting a new game (prevents stale state on replay)
    set({
      ...initialState,
      gameId,
      players: uniquePlayers,
      timers,
      phase: phase || null,
      phaseEndAt: phaseEndAt || null,
      round: 0,
      roleList: roleList || [],
      shouldShowIntro: true,
    });
  },

  setPhase: (phase, endAt, round) =>
    set((state) => ({
      phase,
      phaseEndAt: endAt,
      round: round ?? state.round,
      nightActionDone: phase === GamePhase.NIGHT ? false : state.nightActionDone,
      nightActionTarget: phase === GamePhase.NIGHT ? null : state.nightActionTarget,
      // Only clear seer results when entering a new NIGHT phase, not on DAWN/DAY transitions
      seerResult: phase === GamePhase.NIGHT ? null : state.seerResult,
      auraSeerResult: phase === GamePhase.NIGHT ? null : state.auraSeerResult,
      werewolfSeerResult: phase === GamePhase.NIGHT ? null : state.werewolfSeerResult,
      witchAttackedTarget: phase === GamePhase.NIGHT ? null : state.witchAttackedTarget,
    })),

  setMyRole: (role, team, headhunterTarget) =>
    set({ myRole: role, myTeam: team, headhunterTarget: headhunterTarget || null }),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    })),

  setNightResult: (result) => set({ nightResult: result }),

  setVoteState: (voteState) => set({ voteState }),

  setNightAction: (target) => set({ nightActionDone: true, nightActionTarget: target }),

  setWinners: (team, playerIds) => set({ winners: { team, playerIds } }),

  setSeerResult: (seerResult) => set({ seerResult }),

  setAuraSeerResult: (auraSeerResult) => set({ auraSeerResult }),

  setWerewolfSeerResult: (werewolfSeerResult) => set({ werewolfSeerResult }),

  setWitchAttackedTarget: (witchAttackedTarget) => set({ witchAttackedTarget }),

  setWerewolfTeam: (werewolfTeam) => set({ werewolfTeam }),

  setIsAlive: (isAlive) => set({ isAlive }),

  addDeathLogEntry: (entry) =>
    set((state) => ({ deathLog: [...state.deathLog, entry] })),

  setShouldShowIntro: (shouldShowIntro) => set({ shouldShowIntro }),

  resetGame: () => set(initialState),
}));
