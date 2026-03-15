// ============================================================
// Role Definitions & Metadata — All 50 Roles
// Source of truth: ROLES.md
// ============================================================

import { Role, Team, SeerResult } from '../types/game.types';

export interface RoleDefinition {
  role: Role;
  team: Team;
  seerResult: SeerResult;
  nameKey: string; // i18n key
  descKey: string; // i18n key
  hasNightAction: boolean;
  hasDayAction: boolean;
  isUnique: boolean; // only 1 per game
  priority: number; // night action order (lower = earlier)
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  // ═══════════════════════════════════════════════════
  // Village Team — Active Abilities (15 roles)
  // ═══════════════════════════════════════════════════
  [Role.DOCTOR]: {
    role: Role.DOCTOR,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.doctor.name',
    descKey: 'role.doctor.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 110,
  },
  [Role.GUNNER]: {
    role: Role.GUNNER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.gunner.name',
    descKey: 'role.gunner.desc',
    hasNightAction: false,
    hasDayAction: true,
    isUnique: true,
    priority: 999,
  },
  [Role.SEER]: {
    role: Role.SEER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.seer.name',
    descKey: 'role.seer.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 20,
  },
  [Role.AURA_SEER]: {
    role: Role.AURA_SEER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.auraSeer.name',
    descKey: 'role.auraSeer.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 30,
  },
  [Role.MEDIUM]: {
    role: Role.MEDIUM,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.medium.name',
    descKey: 'role.medium.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 10,
  },
  [Role.WITCH]: {
    role: Role.WITCH,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.witch.name',
    descKey: 'role.witch.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 80,
  },
  [Role.AVENGER]: {
    role: Role.AVENGER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.avenger.name',
    descKey: 'role.avenger.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 60,
  },
  [Role.BEAST_HUNTER]: {
    role: Role.BEAST_HUNTER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.beastHunter.name',
    descKey: 'role.beastHunter.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 50,
  },
  [Role.CURSED]: {
    role: Role.CURSED,
    team: Team.VILLAGE, // starts as village, can convert
    seerResult: SeerResult.GOOD,
    nameKey: 'role.cursed.name',
    descKey: 'role.cursed.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.BODYGUARD]: {
    role: Role.BODYGUARD,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.bodyguard.name',
    descKey: 'role.bodyguard.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 105, // just before doctor
  },
  [Role.PRIEST]: {
    role: Role.PRIEST,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.priest.name',
    descKey: 'role.priest.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.VIGILANTE]: {
    role: Role.VIGILANTE,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.vigilante.name',
    descKey: 'role.vigilante.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 95, // after wolf kill, before doctor
  },
  [Role.SPY]: {
    role: Role.SPY,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.spy.name',
    descKey: 'role.spy.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 18, // early, to observe wolf actions
  },
  [Role.JAILER]: {
    role: Role.JAILER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.jailer.name',
    descKey: 'role.jailer.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 12, // very early, blocks abilities before they execute
  },
  [Role.GRAVE_ROBBER]: {
    role: Role.GRAVE_ROBBER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.graveRobber.name',
    descKey: 'role.graveRobber.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 22, // after seer, reads dead info
  },

  // ═══════════════════════════════════════════════════
  // Village Team — Passive/No-ability (8 roles)
  // ═══════════════════════════════════════════════════
  [Role.ELDER]: {
    role: Role.ELDER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.elder.name',
    descKey: 'role.elder.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.BAKER]: {
    role: Role.BAKER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.baker.name',
    descKey: 'role.baker.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.DRUNK]: {
    role: Role.DRUNK,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.drunk.name',
    descKey: 'role.drunk.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.MAYOR]: {
    role: Role.MAYOR,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.mayor.name',
    descKey: 'role.mayor.desc',
    hasNightAction: false,
    hasDayAction: true, // can reveal during day
    isUnique: true,
    priority: 999,
  },
  [Role.PACIFIST]: {
    role: Role.PACIFIST,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.pacifist.name',
    descKey: 'role.pacifist.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.SLEEPWALKER]: {
    role: Role.SLEEPWALKER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.sleepwalker.name',
    descKey: 'role.sleepwalker.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.HERMIT]: {
    role: Role.HERMIT,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.hermit.name',
    descKey: 'role.hermit.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.APPRENTICE_SEER]: {
    role: Role.APPRENTICE_SEER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.apprenticeSeer.name',
    descKey: 'role.apprenticeSeer.desc',
    hasNightAction: false, // becomes true when Seer dies
    hasDayAction: false,
    isUnique: true,
    priority: 25, // right after Seer
  },
  [Role.MONK]: {
    role: Role.MONK,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.monk.name',
    descKey: 'role.monk.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 108, // just before doctor
  },
  [Role.LYCAN]: {
    role: Role.LYCAN,
    team: Team.VILLAGE,
    seerResult: SeerResult.EVIL, // appears Evil to Seer despite being Village
    nameKey: 'role.lycan.name',
    descKey: 'role.lycan.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.VAMPIRE]: {
    role: Role.VAMPIRE,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.vampire.name',
    descKey: 'role.vampire.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 85, // after wolf kill resolution
  },
  [Role.CULT_LEADER]: {
    role: Role.CULT_LEADER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.cultLeader.name',
    descKey: 'role.cultLeader.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 140, // late: recruits after combat
  },

  // ═══════════════════════════════════════════════════
  // Werewolf Team (13 roles)
  // ═══════════════════════════════════════════════════
  [Role.WEREWOLF]: {
    role: Role.WEREWOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.werewolf.name',
    descKey: 'role.werewolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: false,
    priority: 70,
  },
  [Role.WEREWOLF_SHAMAN]: {
    role: Role.WEREWOLF_SHAMAN,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.werewolfShaman.name',
    descKey: 'role.werewolfShaman.desc',
    hasNightAction: true,
    hasDayAction: true,
    isUnique: true,
    priority: 70,
  },
  [Role.ALPHA_WEREWOLF]: {
    role: Role.ALPHA_WEREWOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.alphaWerewolf.name',
    descKey: 'role.alphaWerewolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.WEREWOLF_SEER]: {
    role: Role.WEREWOLF_SEER,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.werewolfSeer.name',
    descKey: 'role.werewolfSeer.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 40,
  },
  [Role.NIGHTMARE_WOLF]: {
    role: Role.NIGHTMARE_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.nightmareWolf.name',
    descKey: 'role.nightmareWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 15, // blocks target before other actions
  },
  [Role.SHADOW_WOLF]: {
    role: Role.SHADOW_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL, // werewolf team = evil
    nameKey: 'role.shadowWolf.name',
    descKey: 'role.shadowWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.BLOOD_MOON_WOLF]: {
    role: Role.BLOOD_MOON_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.bloodMoonWolf.name',
    descKey: 'role.bloodMoonWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.HOWLER_WOLF]: {
    role: Role.HOWLER_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.howlerWolf.name',
    descKey: 'role.howlerWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.LONE_WOLF]: {
    role: Role.LONE_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.loneWolf.name',
    descKey: 'role.loneWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 72, // slightly after normal wolves
  },
  [Role.VENOM_WOLF]: {
    role: Role.VENOM_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.venomWolf.name',
    descKey: 'role.venomWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 75, // after wolf vote
  },
  [Role.INFECTOR_WOLF]: {
    role: Role.INFECTOR_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.infectorWolf.name',
    descKey: 'role.infectorWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 71, // alongside other wolves
  },
  [Role.STALKER_WOLF]: {
    role: Role.STALKER_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.stalkerWolf.name',
    descKey: 'role.stalkerWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 35, // before wolf vote, gathers intel
  },
  [Role.CURSED_WOLF]: {
    role: Role.CURSED_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL, // werewolf team = evil
    nameKey: 'role.cursedWolf.name',
    descKey: 'role.cursedWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.SNOW_WOLF]: {
    role: Role.SNOW_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.snowWolf.name',
    descKey: 'role.snowWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.VEGETARIAN_WOLF]: {
    role: Role.VEGETARIAN_WOLF,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.vegetarianWolf.name',
    descKey: 'role.vegetarianWolf.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },
  [Role.WOLF_FANG]: {
    role: Role.WOLF_FANG,
    team: Team.WEREWOLF,
    seerResult: SeerResult.EVIL,
    nameKey: 'role.wolfFang.name',
    descKey: 'role.wolfFang.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 70,
  },

  // ═══════════════════════════════════════════════════
  // Solo Team (13 roles)
  // ═══════════════════════════════════════════════════
  [Role.HEADHUNTER]: {
    role: Role.HEADHUNTER,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.headhunter.name',
    descKey: 'role.headhunter.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.FOOL]: {
    role: Role.FOOL,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.fool.name',
    descKey: 'role.fool.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.BOMBER]: {
    role: Role.BOMBER,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.bomber.name',
    descKey: 'role.bomber.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 120,
  },
  [Role.SERIAL_KILLER]: {
    role: Role.SERIAL_KILLER,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.serialKiller.name',
    descKey: 'role.serialKiller.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 90, // after wolf kill, before doctor
  },
  [Role.CUPID]: {
    role: Role.CUPID,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN, // solo team = unknown
    nameKey: 'role.cupid.name',
    descKey: 'role.cupid.desc',
    hasNightAction: true, // only on first night
    hasDayAction: false,
    isUnique: true,
    priority: 5, // very first action
  },
  [Role.ARSONIST]: {
    role: Role.ARSONIST,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.arsonist.name',
    descKey: 'role.arsonist.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 130, // after bomber
  },
  [Role.SURVIVOR]: {
    role: Role.SURVIVOR,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.survivor.name',
    descKey: 'role.survivor.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.AMNESIAC]: {
    role: Role.AMNESIAC,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.amnesiac.name',
    descKey: 'role.amnesiac.desc',
    hasNightAction: true, // choose a dead player to copy role from
    hasDayAction: false,
    isUnique: true,
    priority: 8,
  },
  [Role.DOPPELGANGER]: {
    role: Role.DOPPELGANGER,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.doppelganger.name',
    descKey: 'role.doppelganger.desc',
    hasNightAction: true, // choose target on first night
    hasDayAction: false,
    isUnique: true,
    priority: 3, // very first
  },
  [Role.JESTER]: {
    role: Role.JESTER,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.jester.name',
    descKey: 'role.jester.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: true,
    priority: 999,
  },
  [Role.PIRATE]: {
    role: Role.PIRATE,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.pirate.name',
    descKey: 'role.pirate.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 92, // after wolf kill, alongside serial killer
  },
  [Role.PLAGUE_DOCTOR]: {
    role: Role.PLAGUE_DOCTOR,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.plagueDoctor.name',
    descKey: 'role.plagueDoctor.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 135, // late: spreads plague after combat
  },
  [Role.CORRUPTOR]: {
    role: Role.CORRUPTOR,
    team: Team.SOLO,
    seerResult: SeerResult.UNKNOWN,
    nameKey: 'role.corruptor.name',
    descKey: 'role.corruptor.desc',
    hasNightAction: true,
    hasDayAction: false,
    isUnique: true,
    priority: 16, // early: corrupts before seers check
  },

  // ═══════════════════════════════════════════════════
  // Filler
  // ═══════════════════════════════════════════════════
  [Role.VILLAGER]: {
    role: Role.VILLAGER,
    team: Team.VILLAGE,
    seerResult: SeerResult.GOOD,
    nameKey: 'role.villager.name',
    descKey: 'role.villager.desc',
    hasNightAction: false,
    hasDayAction: false,
    isUnique: false,
    priority: 999,
  },
};

export function getRoleTeam(role: Role): Team {
  return ROLE_DEFINITIONS[role].team;
}

export function getRoleSeerResult(role: Role): SeerResult {
  return ROLE_DEFINITIONS[role].seerResult;
}

export function isWerewolfRole(role: Role): boolean {
  return ROLE_DEFINITIONS[role].team === Team.WEREWOLF;
}

export function isSoloRole(role: Role): boolean {
  return ROLE_DEFINITIONS[role].team === Team.SOLO;
}

export function isVillageRole(role: Role): boolean {
  return ROLE_DEFINITIONS[role].team === Team.VILLAGE;
}
