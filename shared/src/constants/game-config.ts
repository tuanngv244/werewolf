// ============================================================
// Game Configuration Constants
// ============================================================

import { Role, type GameTimers } from '../types/game.types';

export const GAME_CONFIG = {
  MIN_PLAYERS: 6,
  MAX_PLAYERS: 16,
  RECOMMENDED_MIN: 8,
  RECOMMENDED_MAX: 12,

  ROOM_CODE_LENGTH: 6,
  ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // no confusing chars

  MAX_CHAT_LENGTH: 200,
  MAX_ROOM_NAME_LENGTH: 30,

  GUNNER_BULLETS: 2,

  // Werewolf team should be ~25-30% of players
  WEREWOLF_RATIO: {
    6: 1,
    7: 2,
    8: 2,
    9: 2,
    10: 2,
    11: 3,
    12: 3,
    13: 3,
    14: 3,
    15: 4,
    16: 4,
  } as Record<number, number>,
} as const;

export const DEFAULT_TIMERS: GameTimers = {
  night: 60,
  day: 60,
  vote: 30,
  lastWords: 15,
};

export const TIMER_OPTIONS = {
  night: [30, 60, 90],
  day: [60, 120, 180],
  vote: [20, 30, 45],
  lastWords: [10, 15, 20],
} as const;

// Default role selection for quick start
export const DEFAULT_ROLES: Record<number, Role[]> = {
  6: [Role.WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.VILLAGER, Role.VILLAGER],
  7: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.VILLAGER, Role.VILLAGER],
  8: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.VILLAGER, Role.VILLAGER],
  9: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.VILLAGER, Role.VILLAGER],
  10: [Role.WEREWOLF, Role.WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.AVENGER, Role.VILLAGER, Role.VILLAGER],
  11: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.AVENGER, Role.VILLAGER, Role.VILLAGER],
  12: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.SEER, Role.AURA_SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.BEAST_HUNTER, Role.VILLAGER, Role.VILLAGER],
  13: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.SEER, Role.AURA_SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.BEAST_HUNTER, Role.AVENGER, Role.VILLAGER, Role.VILLAGER],
  14: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.WEREWOLF_SEER, Role.SEER, Role.AURA_SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.BEAST_HUNTER, Role.AVENGER, Role.VILLAGER, Role.VILLAGER],
  15: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.WEREWOLF_SHAMAN, Role.SEER, Role.AURA_SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.BEAST_HUNTER, Role.AVENGER, Role.HEADHUNTER, Role.VILLAGER, Role.VILLAGER],
  16: [Role.WEREWOLF, Role.WEREWOLF, Role.ALPHA_WEREWOLF, Role.WEREWOLF_SHAMAN, Role.SEER, Role.AURA_SEER, Role.DOCTOR, Role.WITCH, Role.GUNNER, Role.MEDIUM, Role.BEAST_HUNTER, Role.AVENGER, Role.HEADHUNTER, Role.FOOL, Role.VILLAGER, Role.VILLAGER],
};

// Cute random names for guest players
export const GUEST_NAMES = [
  'BravePup', 'SilentMoon', 'StarGazer', 'MysticFox', 'IronClaw',
  'WhisperWind', 'DarkPaw', 'GoldenEye', 'ShadowTail', 'MoonHowl',
  'SwiftFang', 'CrystalSeer', 'ThunderPack', 'SilverFur', 'NightWatcher',
  'BraveHeart', 'StormRunner', 'WildSpirit', 'DawnBreaker', 'FrostBite',
  'EmberGlow', 'SkyHunter', 'VelvetPaw', 'RavenClaw', 'OakShield',
  'FlameKeeper', 'IceFang', 'DustTrail', 'CoralReef', 'JadeLotus',
  'RubyHeart', 'SapphireStar', 'TopazSun', 'OpalMist', 'PearlDew',
  // Vietnamese-friendly names
  'SoiNho', 'TrangTron', 'SaoSang', 'GioNhe', 'MayTrang',
  'LaCay', 'HoaDai', 'CaVang', 'BuomXinh', 'ChimNon',
];
