import { create } from 'zustand';
import type { GamePhase, Role, Team, GameTimers } from '@shared/types/game.types';

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
  werewolfSeerResult: SeerResultData | null;

  // Werewolf team info
  werewolfTeam: WolfPlayer[];

  // Headhunter target
  headhunterTarget: string | null;

  // Actions
  setGame: (
    gameId: string,
    players: GamePlayer[],
    timers: GameTimers,
    phase?: GamePhase | null,
    phaseEndAt?: number | null,
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
  setWerewolfSeerResult: (result: SeerResultData) => void;
  setWerewolfTeam: (wolves: WolfPlayer[]) => void;
  setIsAlive: (alive: boolean) => void;
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
  werewolfTeam: [],
  headhunterTarget: null,
};

export const useGameStore = create<GameState>()((set) => ({
  ...initialState,

  setGame: (gameId, players, timers, phase, phaseEndAt) => {
    // Deduplicate players by ID to prevent React key warnings
    const seen = new Set<string>();
    const uniquePlayers = players.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
    set({
      gameId,
      players: uniquePlayers,
      timers,
      phase: phase || null,
      phaseEndAt: phaseEndAt || null,
      round: 0,
    });
  },

  setPhase: (phase, endAt, round) =>
    set((state) => ({
      phase,
      phaseEndAt: endAt,
      round: round ?? state.round,
      nightActionDone: false,
      nightActionTarget: null,
      seerResult: null,
      auraSeerResult: null,
      werewolfSeerResult: null,
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

  setWerewolfTeam: (werewolfTeam) => set({ werewolfTeam }),

  setIsAlive: (isAlive) => set({ isAlive }),

  resetGame: () => set(initialState),
}));
