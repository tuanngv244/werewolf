// ============================================================
// Game Types — Werewolf Game (Ma Soi)
// 40 Roles: 19 Village + 10 Werewolf + 10 Solo + Villager filler
// ============================================================

export enum Team {
  VILLAGE = 'village',
  WEREWOLF = 'werewolf',
  SOLO = 'solo',
}

export enum Role {
  // Village Team — with abilities (11)
  DOCTOR = 'doctor',
  GUNNER = 'gunner',
  SEER = 'seer',
  AURA_SEER = 'aura_seer',
  MEDIUM = 'medium',
  WITCH = 'witch',
  AVENGER = 'avenger',
  BEAST_HUNTER = 'beast_hunter',
  CURSED = 'cursed',
  BODYGUARD = 'bodyguard',
  PRIEST = 'priest',
  // Village Team — passive/no-ability (8)
  ELDER = 'elder',
  BAKER = 'baker',
  DRUNK = 'drunk',
  MAYOR = 'mayor',
  PACIFIST = 'pacifist',
  SLEEPWALKER = 'sleepwalker',
  HERMIT = 'hermit',
  APPRENTICE_SEER = 'apprentice_seer',
  // Werewolf Team (10)
  WEREWOLF = 'werewolf',
  WEREWOLF_SHAMAN = 'werewolf_shaman',
  ALPHA_WEREWOLF = 'alpha_werewolf',
  WEREWOLF_SEER = 'werewolf_seer',
  NIGHTMARE_WOLF = 'nightmare_wolf',
  SHADOW_WOLF = 'shadow_wolf',
  BLOOD_MOON_WOLF = 'blood_moon_wolf',
  HOWLER_WOLF = 'howler_wolf',
  LONE_WOLF = 'lone_wolf',
  VENOM_WOLF = 'venom_wolf',
  // Solo Team (10)
  HEADHUNTER = 'headhunter',
  FOOL = 'fool',
  BOMBER = 'bomber',
  SERIAL_KILLER = 'serial_killer',
  CUPID = 'cupid',
  ARSONIST = 'arsonist',
  SURVIVOR = 'survivor',
  AMNESIAC = 'amnesiac',
  DOPPELGANGER = 'doppelganger',
  JESTER = 'jester',
  // Filler
  VILLAGER = 'villager',
}

export enum GamePhase {
  WAITING = 'waiting',
  STARTING = 'starting',
  NIGHT = 'night',
  DAWN = 'dawn',
  DAY = 'day',
  VOTE = 'vote',
  VOTE_RESULT = 'vote_result',
  LAST_WORDS = 'last_words',
  GAME_OVER = 'game_over',
}

export enum SeerResult {
  GOOD = 'good',
  EVIL = 'evil',
  UNKNOWN = 'unknown',
}

export enum DeathCause {
  WEREWOLF_KILL = 'werewolf_kill',
  VOTED = 'voted',
  GUNNER_SHOT = 'gunner_shot',
  WITCH_KILL = 'witch_kill',
  AVENGER_REVENGE = 'avenger_revenge',
  BOMBER_EXPLOSION = 'bomber_explosion',
  TRAP = 'trap',
  SERIAL_KILLER = 'serial_killer',
  ARSONIST_FIRE = 'arsonist_fire',
  VENOM = 'venom',
  LOVERS_SUICIDE = 'lovers_suicide',
}

export enum WinCondition {
  ALL_WEREWOLVES_DEAD = 'all_werewolves_dead',
  WEREWOLVES_MAJORITY = 'werewolves_majority',
  FOOL_WINS = 'fool_wins',
  HEADHUNTER_WINS = 'headhunter_wins',
  BOMBER_WINS = 'bomber_wins',
  SERIAL_KILLER_WINS = 'serial_killer_wins',
  ARSONIST_WINS = 'arsonist_wins',
  SURVIVOR_WINS = 'survivor_wins',
  JESTER_WINS = 'jester_wins',
  LOVERS_WIN = 'lovers_win',
  LONE_WOLF_WINS = 'lone_wolf_wins',
}

export interface PlayerState {
  id: string;
  username: string;
  role: Role;
  team: Team;
  isAlive: boolean;
  isConnected: boolean;
  deathCause?: DeathCause | string;
  deathRound?: number;

  // Role-specific state
  witchState?: WitchState;
  gunnerState?: GunnerState;
  mediumState?: MediumState;
  bomberState?: BomberState;
  headhunterState?: HeadhunterState;
  foolState?: FoolState;
  cursedState?: CursedState;
  avengerState?: AvengerState;
  cursedByShaman?: boolean;
  // New role states
  bodyguardState?: BodyguardState;
  priestState?: PriestState;
  elderState?: ElderState;
  mayorState?: MayorState;
  apprenticeSeerState?: ApprenticeSeerState;
  serialKillerState?: SerialKillerState;
  cupidState?: CupidState;
  arsonistState?: ArsonistState;
  survivorState?: SurvivorState;
  amnesiacState?: AmnesiacState;
  doppelgangerState?: DoppelgangerState;
  jesterState?: JesterState;
  loneWolfState?: LoneWolfState;
  venomWolfState?: VenomWolfState;
  loversPartnerId?: string; // set by Cupid
  isDoused?: boolean; // set by Arsonist
  nightmareBlocked?: boolean; // set by Nightmare Wolf
}

export interface GameTimers {
  night: number;   // seconds
  day: number;     // seconds
  vote: number;    // seconds
  lastWords: number; // seconds
}

export interface GameState {
  id: string;
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  timers: GameTimers;
  phaseEndTime: number | null; // unix timestamp
  winners: WinCondition[];
  soloWinners: { role: Role; userId: string }[];
  deaths: { userId: string; cause: DeathCause; round: number }[];
}

// Night action tracking (server-side only, not sent to clients)
export interface NightActions {
  seerTarget?: string;
  auraSeerTarget?: string;
  werewolfSeerTarget?: string;
  werewolfVotes: Record<string, string>; // wolfId -> targetId
  doctorTarget?: string;
  witchHeal?: boolean;
  witchKillTarget?: string;
  avengerTarget?: string;
  beastHunterTrapTarget?: string;
  bomberTarget?: string;
  mediumResurrectTarget?: string;
  // New role actions
  bodyguardTarget?: string;
  priestTarget?: string;
  serialKillerTarget?: string;
  cupidTarget1?: string;
  cupidTarget2?: string;
  arsonistTarget?: string;
  arsonistIgnite?: boolean;
  nightmareWolfTarget?: string;
  venomWolfTarget?: string;
  loneWolfTarget?: string;
}

// Role-specific state
export interface WitchState {
  hasHealPotion: boolean;
  hasKillPotion: boolean;
}

export interface GunnerState {
  bullets: number;
}

export interface MediumState {
  hasRevive: boolean;
}

export interface BomberState {
  hasPlacedBomb: boolean;
  bombTarget?: string;
}

export interface HeadhunterState {
  targetId: string;
  targetDead: boolean;
}

export interface FoolState {
  wasVotedOut: boolean;
}

export interface CursedState {
  isTransformed: boolean;
}

export interface BeastHunterTrap {
  trappedPlayerId: string | null;
}

export interface AvengerState {
  revengeTargetId: string | undefined;
}

export interface ShamanCurse {
  cursedPlayerId: string | null; // appears Evil to seers this night
}

// ─── New Role States ───────────────────────────────

export interface BodyguardState {
  lastProtected?: string; // can't protect same player 2 nights in a row
}

export interface PriestState {
  hasHolyWater: boolean; // one-time use: if werewolf kills priest, attacker dies too
}

export interface ElderState {
  extraLives: number; // survives first werewolf kill (starts at 1)
}

export interface MayorState {
  hasRevealed: boolean; // can reveal during day for 2x vote weight
}

export interface ApprenticeSeerState {
  isActivated: boolean; // becomes Seer when original Seer dies
}

export interface SerialKillerState {
  killCount: number; // kills one player each night independently
}

export interface CupidState {
  hasLinked: boolean; // links two lovers on first night only
}

export interface ArsonistState {
  dousedPlayers: string[]; // players doused with gasoline
}

export interface SurvivorState {
  vestCount: number; // number of night-kill protections remaining (starts at 2)
}

export interface AmnesiacState {
  rememberedRole?: Role; // becomes this role after choosing on night 2+
}

export interface DoppelgangerState {
  targetId?: string; // copies this player's role when they die
  copiedRole?: Role;
}

export interface JesterState {
  wasVotedOut: boolean; // wins if voted out, like Fool but solo
}

export interface LoneWolfState {
  // Wins if they are the last wolf AND all other wolves are dead
  // Must be alive when werewolf team would win
  isLastWolf: boolean;
}

export interface VenomWolfState {
  hasVenom: boolean; // one-time: poison a player who dies next night
}
