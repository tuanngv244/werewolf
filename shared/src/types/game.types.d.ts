export declare enum Team {
    VILLAGE = "village",
    WEREWOLF = "werewolf",
    SOLO = "solo"
}
export declare enum Role {
    DOCTOR = "doctor",
    GUNNER = "gunner",
    SEER = "seer",
    AURA_SEER = "aura_seer",
    MEDIUM = "medium",
    WITCH = "witch",
    AVENGER = "avenger",
    BEAST_HUNTER = "beast_hunter",
    CURSED = "cursed",
    WEREWOLF = "werewolf",
    WEREWOLF_SHAMAN = "werewolf_shaman",
    ALPHA_WEREWOLF = "alpha_werewolf",
    WEREWOLF_SEER = "werewolf_seer",
    HEADHUNTER = "headhunter",
    FOOL = "fool",
    BOMBER = "bomber",
    VILLAGER = "villager"
}
export declare enum GamePhase {
    WAITING = "waiting",
    STARTING = "starting",
    NIGHT = "night",
    DAWN = "dawn",
    DAY = "day",
    VOTE = "vote",
    VOTE_RESULT = "vote_result",
    LAST_WORDS = "last_words",
    GAME_OVER = "game_over"
}
export declare enum SeerResult {
    GOOD = "good",
    EVIL = "evil",
    UNKNOWN = "unknown"
}
export declare enum DeathCause {
    WEREWOLF_KILL = "werewolf_kill",
    VOTED = "voted",
    GUNNER_SHOT = "gunner_shot",
    WITCH_KILL = "witch_kill",
    AVENGER_REVENGE = "avenger_revenge",
    BOMBER_EXPLOSION = "bomber_explosion",
    TRAP = "trap"
}
export declare enum WinCondition {
    ALL_WEREWOLVES_DEAD = "all_werewolves_dead",
    WEREWOLVES_MAJORITY = "werewolves_majority",
    FOOL_WINS = "fool_wins",
    HEADHUNTER_WINS = "headhunter_wins",
    BOMBER_WINS = "bomber_wins"
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
    witchState?: WitchState;
    gunnerState?: GunnerState;
    mediumState?: MediumState;
    bomberState?: BomberState;
    headhunterState?: HeadhunterState;
    foolState?: FoolState;
    cursedState?: CursedState;
    avengerState?: AvengerState;
    cursedByShaman?: boolean;
}
export interface GameTimers {
    night: number;
    day: number;
    vote: number;
    lastWords: number;
}
export interface GameState {
    id: string;
    roomCode: string;
    phase: GamePhase;
    round: number;
    players: PlayerState[];
    timers: GameTimers;
    phaseEndTime: number | null;
    winners: WinCondition[];
    soloWinners: {
        role: Role;
        userId: string;
    }[];
    deaths: {
        userId: string;
        cause: DeathCause;
        round: number;
    }[];
}
export interface NightActions {
    seerTarget?: string;
    auraSeerTarget?: string;
    werewolfSeerTarget?: string;
    werewolfVotes: Record<string, string>;
    doctorTarget?: string;
    witchHeal?: boolean;
    witchKillTarget?: string;
    avengerTarget?: string;
    beastHunterTrapTarget?: string;
    bomberTarget?: string;
    mediumResurrectTarget?: string;
}
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
    cursedPlayerId: string | null;
}
