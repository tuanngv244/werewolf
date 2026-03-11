// ============================================================
// Phase Definitions & Durations
// ============================================================

import { GamePhase } from '../types/game.types';

export interface PhaseConfig {
  phase: GamePhase;
  nameKey: string; // i18n key
  defaultDuration: number; // seconds, 0 = no timer
}

export const PHASE_CONFIGS: Record<GamePhase, PhaseConfig> = {
  [GamePhase.WAITING]: {
    phase: GamePhase.WAITING,
    nameKey: 'game.phase.waiting',
    defaultDuration: 0,
  },
  [GamePhase.STARTING]: {
    phase: GamePhase.STARTING,
    nameKey: 'game.phase.starting',
    defaultDuration: 5,
  },
  [GamePhase.NIGHT]: {
    phase: GamePhase.NIGHT,
    nameKey: 'game.phase.night',
    defaultDuration: 60,
  },
  [GamePhase.DAWN]: {
    phase: GamePhase.DAWN,
    nameKey: 'game.phase.dawn',
    defaultDuration: 5,
  },
  [GamePhase.DAY]: {
    phase: GamePhase.DAY,
    nameKey: 'game.phase.day',
    defaultDuration: 60,
  },
  [GamePhase.VOTE]: {
    phase: GamePhase.VOTE,
    nameKey: 'game.phase.vote',
    defaultDuration: 30,
  },
  [GamePhase.VOTE_RESULT]: {
    phase: GamePhase.VOTE_RESULT,
    nameKey: 'game.phase.voteResult',
    defaultDuration: 5,
  },
  [GamePhase.LAST_WORDS]: {
    phase: GamePhase.LAST_WORDS,
    nameKey: 'game.phase.lastWords',
    defaultDuration: 15,
  },
  [GamePhase.GAME_OVER]: {
    phase: GamePhase.GAME_OVER,
    nameKey: 'game.phase.gameOver',
    defaultDuration: 0,
  },
};

export const PHASE_ORDER: GamePhase[] = [
  GamePhase.NIGHT,
  GamePhase.DAWN,
  GamePhase.DAY,
  GamePhase.VOTE,
  GamePhase.VOTE_RESULT,
  GamePhase.LAST_WORDS,
];

export const NIGHT_RESOLUTION_ORDER = [
  'medium',       // 1. Talk to dead, optional resurrect
  'seer',         // 2. Check target role
  'aura_seer',    // 3. Check target alignment
  'werewolf_seer',// 4. Check target role (shared with wolves)
  'beast_hunter', // 5. Place/move trap
  'avenger',      // 6. Set revenge target
  'werewolf',     // 7. Vote on kill target
  'witch_see',    // 8. Sees who wolves targeted
  'witch_heal',   // 9. Can heal potion
  'witch_kill',   // 10. Can kill potion
  'doctor',       // 11. Protect one player
  'bomber',       // 12. Place bomb
  'resolve',      // 13. Resolve all actions
] as const;
