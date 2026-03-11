"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUEST_NAMES = exports.DEFAULT_ROLES = exports.TIMER_OPTIONS = exports.DEFAULT_TIMERS = exports.GAME_CONFIG = void 0;
const game_types_1 = require("../types/game.types");
exports.GAME_CONFIG = {
    MIN_PLAYERS: 6,
    MAX_PLAYERS: 16,
    RECOMMENDED_MIN: 8,
    RECOMMENDED_MAX: 12,
    ROOM_CODE_LENGTH: 6,
    ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    MAX_CHAT_LENGTH: 200,
    MAX_ROOM_NAME_LENGTH: 30,
    GUNNER_BULLETS: 2,
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
    },
};
exports.DEFAULT_TIMERS = {
    night: 45,
    day: 180,
    vote: 30,
    lastWords: 15,
};
exports.TIMER_OPTIONS = {
    night: [30, 45, 60],
    day: [120, 180, 300],
    vote: [20, 30, 45],
    lastWords: [10, 15, 20],
};
exports.DEFAULT_ROLES = {
    6: [game_types_1.Role.WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    7: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    8: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.GUNNER, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    9: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.GUNNER, game_types_1.Role.MEDIUM, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    10: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.GUNNER, game_types_1.Role.MEDIUM, game_types_1.Role.AVENGER, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    11: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.ALPHA_WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.GUNNER, game_types_1.Role.MEDIUM, game_types_1.Role.AVENGER, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
    12: [game_types_1.Role.WEREWOLF, game_types_1.Role.WEREWOLF, game_types_1.Role.ALPHA_WEREWOLF, game_types_1.Role.SEER, game_types_1.Role.AURA_SEER, game_types_1.Role.DOCTOR, game_types_1.Role.WITCH, game_types_1.Role.GUNNER, game_types_1.Role.MEDIUM, game_types_1.Role.BEAST_HUNTER, game_types_1.Role.VILLAGER, game_types_1.Role.VILLAGER],
};
exports.GUEST_NAMES = [
    'BravePup', 'SilentMoon', 'StarGazer', 'MysticFox', 'IronClaw',
    'WhisperWind', 'DarkPaw', 'GoldenEye', 'ShadowTail', 'MoonHowl',
    'SwiftFang', 'CrystalSeer', 'ThunderPack', 'SilverFur', 'NightWatcher',
    'BraveHeart', 'StormRunner', 'WildSpirit', 'DawnBreaker', 'FrostBite',
    'EmberGlow', 'SkyHunter', 'VelvetPaw', 'RavenClaw', 'OakShield',
    'FlameKeeper', 'IceFang', 'DustTrail', 'CoralReef', 'JadeLotus',
    'RubyHeart', 'SapphireStar', 'TopazSun', 'OpalMist', 'PearlDew',
    'SoiNho', 'TrangTron', 'SaoSang', 'GioNhe', 'MayTrang',
    'LaCay', 'HoaDai', 'CaVang', 'BuomXinh', 'ChimNon',
];
//# sourceMappingURL=game-config.js.map