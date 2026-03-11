"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_DEFINITIONS = void 0;
exports.getRoleTeam = getRoleTeam;
exports.getRoleSeerResult = getRoleSeerResult;
exports.isWerewolfRole = isWerewolfRole;
exports.isSoloRole = isSoloRole;
exports.isVillageRole = isVillageRole;
const game_types_1 = require("../types/game.types");
exports.ROLE_DEFINITIONS = {
    [game_types_1.Role.DOCTOR]: {
        role: game_types_1.Role.DOCTOR,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.doctor.name',
        descKey: 'role.doctor.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 110,
    },
    [game_types_1.Role.GUNNER]: {
        role: game_types_1.Role.GUNNER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.gunner.name',
        descKey: 'role.gunner.desc',
        hasNightAction: false,
        hasDayAction: true,
        isUnique: true,
        priority: 999,
    },
    [game_types_1.Role.SEER]: {
        role: game_types_1.Role.SEER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.seer.name',
        descKey: 'role.seer.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 20,
    },
    [game_types_1.Role.AURA_SEER]: {
        role: game_types_1.Role.AURA_SEER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.auraSeer.name',
        descKey: 'role.auraSeer.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 30,
    },
    [game_types_1.Role.MEDIUM]: {
        role: game_types_1.Role.MEDIUM,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.medium.name',
        descKey: 'role.medium.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 10,
    },
    [game_types_1.Role.WITCH]: {
        role: game_types_1.Role.WITCH,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.witch.name',
        descKey: 'role.witch.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 80,
    },
    [game_types_1.Role.AVENGER]: {
        role: game_types_1.Role.AVENGER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.avenger.name',
        descKey: 'role.avenger.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 60,
    },
    [game_types_1.Role.BEAST_HUNTER]: {
        role: game_types_1.Role.BEAST_HUNTER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.beastHunter.name',
        descKey: 'role.beastHunter.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 50,
    },
    [game_types_1.Role.CURSED]: {
        role: game_types_1.Role.CURSED,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.cursed.name',
        descKey: 'role.cursed.desc',
        hasNightAction: false,
        hasDayAction: false,
        isUnique: true,
        priority: 999,
    },
    [game_types_1.Role.WEREWOLF]: {
        role: game_types_1.Role.WEREWOLF,
        team: game_types_1.Team.WEREWOLF,
        seerResult: game_types_1.SeerResult.EVIL,
        nameKey: 'role.werewolf.name',
        descKey: 'role.werewolf.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: false,
        priority: 70,
    },
    [game_types_1.Role.WEREWOLF_SHAMAN]: {
        role: game_types_1.Role.WEREWOLF_SHAMAN,
        team: game_types_1.Team.WEREWOLF,
        seerResult: game_types_1.SeerResult.EVIL,
        nameKey: 'role.werewolfShaman.name',
        descKey: 'role.werewolfShaman.desc',
        hasNightAction: true,
        hasDayAction: true,
        isUnique: true,
        priority: 70,
    },
    [game_types_1.Role.ALPHA_WEREWOLF]: {
        role: game_types_1.Role.ALPHA_WEREWOLF,
        team: game_types_1.Team.WEREWOLF,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.alphaWerewolf.name',
        descKey: 'role.alphaWerewolf.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 70,
    },
    [game_types_1.Role.WEREWOLF_SEER]: {
        role: game_types_1.Role.WEREWOLF_SEER,
        team: game_types_1.Team.WEREWOLF,
        seerResult: game_types_1.SeerResult.EVIL,
        nameKey: 'role.werewolfSeer.name',
        descKey: 'role.werewolfSeer.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 40,
    },
    [game_types_1.Role.HEADHUNTER]: {
        role: game_types_1.Role.HEADHUNTER,
        team: game_types_1.Team.SOLO,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.headhunter.name',
        descKey: 'role.headhunter.desc',
        hasNightAction: false,
        hasDayAction: false,
        isUnique: true,
        priority: 999,
    },
    [game_types_1.Role.FOOL]: {
        role: game_types_1.Role.FOOL,
        team: game_types_1.Team.SOLO,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.fool.name',
        descKey: 'role.fool.desc',
        hasNightAction: false,
        hasDayAction: false,
        isUnique: true,
        priority: 999,
    },
    [game_types_1.Role.BOMBER]: {
        role: game_types_1.Role.BOMBER,
        team: game_types_1.Team.SOLO,
        seerResult: game_types_1.SeerResult.UNKNOWN,
        nameKey: 'role.bomber.name',
        descKey: 'role.bomber.desc',
        hasNightAction: true,
        hasDayAction: false,
        isUnique: true,
        priority: 120,
    },
    [game_types_1.Role.VILLAGER]: {
        role: game_types_1.Role.VILLAGER,
        team: game_types_1.Team.VILLAGE,
        seerResult: game_types_1.SeerResult.GOOD,
        nameKey: 'role.villager.name',
        descKey: 'role.villager.desc',
        hasNightAction: false,
        hasDayAction: false,
        isUnique: false,
        priority: 999,
    },
};
function getRoleTeam(role) {
    return exports.ROLE_DEFINITIONS[role].team;
}
function getRoleSeerResult(role) {
    return exports.ROLE_DEFINITIONS[role].seerResult;
}
function isWerewolfRole(role) {
    return exports.ROLE_DEFINITIONS[role].team === game_types_1.Team.WEREWOLF;
}
function isSoloRole(role) {
    return exports.ROLE_DEFINITIONS[role].team === game_types_1.Team.SOLO;
}
function isVillageRole(role) {
    return exports.ROLE_DEFINITIONS[role].team === game_types_1.Team.VILLAGE;
}
//# sourceMappingURL=roles.js.map