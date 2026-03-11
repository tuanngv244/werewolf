import { Role, type GameTimers } from '../types/game.types';
export declare const GAME_CONFIG: {
    readonly MIN_PLAYERS: 6;
    readonly MAX_PLAYERS: 16;
    readonly RECOMMENDED_MIN: 8;
    readonly RECOMMENDED_MAX: 12;
    readonly ROOM_CODE_LENGTH: 6;
    readonly ROOM_CODE_CHARS: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    readonly MAX_CHAT_LENGTH: 200;
    readonly MAX_ROOM_NAME_LENGTH: 30;
    readonly GUNNER_BULLETS: 2;
    readonly WEREWOLF_RATIO: Record<number, number>;
};
export declare const DEFAULT_TIMERS: GameTimers;
export declare const TIMER_OPTIONS: {
    readonly night: readonly [30, 45, 60];
    readonly day: readonly [120, 180, 300];
    readonly vote: readonly [20, 30, 45];
    readonly lastWords: readonly [10, 15, 20];
};
export declare const DEFAULT_ROLES: Record<number, Role[]>;
export declare const GUEST_NAMES: string[];
