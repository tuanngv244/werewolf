import { Injectable } from '@nestjs/common';
import { GameState, NightActions, GameLogEntry } from './game.service';
import {
  Role,
  Team,
  SeerResult,
  DeathCause,
  PlayerState,
  WinCondition,
} from '@shared/types/game.types';
import { RoomPlayer } from '@shared/types/room.types';
import {
  ROLE_DEFINITIONS,
  getRoleTeam,
  getRoleSeerResult,
  isWerewolfRole,
  isSoloRole,
} from '@shared/constants/roles';

interface NightResolution {
  deaths: { playerId: string; cause: DeathCause }[];
  saved: string[];
  messages: string[];
  logEntries: GameLogEntry[];
  seerResult?: { targetId: string; alignment: SeerResult };
  auraSeerResult?: { targetId: string; result: SeerResult };
  werewolfSeerResult?: { targetId: string; role: Role };
  witchTarget?: string; // The player the werewolves targeted (for Witch notification)
  cursedTransformed?: string; // Player ID of Cursed who transformed into Werewolf
}

@Injectable()
export class GameEngine {
  assignRoles(players: RoomPlayer[], roleConfig: Role[]): PlayerState[] {
    const roles = [...roleConfig];

    // Fill remaining slots with Villager
    while (roles.length < players.length) {
      roles.push(Role.VILLAGER);
    }

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Assign headhunter target if present
    const headhunterIdx = roles.indexOf(Role.HEADHUNTER);
    let headhunterTarget: string | undefined;
    if (headhunterIdx >= 0) {
      // Target must be a non-solo, non-werewolf player
      const possibleTargets = players.filter((_, i) => {
        const r = roles[i];
        return !isWerewolfRole(r) && !isSoloRole(r) && r !== Role.VILLAGER;
      });
      // Fallback to any village player
      const targets = possibleTargets.length > 0
        ? possibleTargets
        : players.filter((_, i) => !isWerewolfRole(roles[i]) && !isSoloRole(roles[i]));
      if (targets.length > 0) {
        headhunterTarget = targets[Math.floor(Math.random() * targets.length)].id;
      }
    }

    return players.map((player, idx) => {
      const role = roles[idx];
      const team = getRoleTeam(role);
      const ps: PlayerState = {
        id: player.id,
        username: player.username,
        role,
        team,
        isAlive: true,
        isConnected: true,
      };

      // ─── Role-specific initial state ───
      if (role === Role.WITCH) {
        ps.witchState = { hasHealPotion: true, hasKillPotion: true };
      }
      if (role === Role.GUNNER) {
        ps.gunnerState = { bullets: 2 };
      }
      if (role === Role.MEDIUM) {
        ps.mediumState = { hasRevive: true };
      }
      if (role === Role.BOMBER) {
        ps.bomberState = { hasPlacedBomb: false };
      }
      if (role === Role.HEADHUNTER && headhunterTarget) {
        ps.headhunterState = { targetId: headhunterTarget, targetDead: false };
      }
      if (role === Role.FOOL) {
        ps.foolState = { wasVotedOut: false };
      }
      if (role === Role.CURSED) {
        ps.cursedState = { isTransformed: false };
      }
      if (role === Role.AVENGER) {
        ps.avengerState = { revengeTargetId: undefined };
      }
      // ─── New role states ───
      if (role === Role.BODYGUARD) {
        ps.bodyguardState = { lastProtected: undefined };
      }
      if (role === Role.PRIEST) {
        ps.priestState = { hasHolyWater: true };
      }
      if (role === Role.ELDER) {
        ps.elderState = { extraLives: 1 };
      }
      if (role === Role.MAYOR) {
        ps.mayorState = { hasRevealed: false };
      }
      if (role === Role.APPRENTICE_SEER) {
        ps.apprenticeSeerState = { isActivated: false };
      }
      if (role === Role.SERIAL_KILLER) {
        ps.serialKillerState = { killCount: 0 };
      }
      if (role === Role.CUPID) {
        ps.cupidState = { hasLinked: false };
      }
      if (role === Role.ARSONIST) {
        ps.arsonistState = { dousedPlayers: [] };
      }
      if (role === Role.SURVIVOR) {
        ps.survivorState = { vestCount: 2 };
      }
      if (role === Role.AMNESIAC) {
        ps.amnesiacState = {};
      }
      if (role === Role.DOPPELGANGER) {
        ps.doppelgangerState = {};
      }
      if (role === Role.JESTER) {
        ps.jesterState = { wasVotedOut: false };
      }
      if (role === Role.LONE_WOLF) {
        ps.loneWolfState = { isLastWolf: false };
      }
      if (role === Role.VENOM_WOLF) {
        ps.venomWolfState = { hasVenom: true };
      }
      // ─── ROLES.md new role states ───
      if (role === Role.SNOW_WOLF) {
        ps.snowWolfState = {};
      }
      if (role === Role.VAMPIRE) {
        ps.vampireState = { markedPlayers: [] };
      }
      if (role === Role.CULT_LEADER) {
        ps.cultLeaderState = { cultMembers: [] };
      }

      return ps;
    });
  }

  resolveNight(game: GameState): NightResolution {
    const result: NightResolution = {
      deaths: [],
      saved: [],
      messages: [],
      logEntries: [],
    };

    const actions = game.nightActions;
    const alive = game.players.filter((p) => p.isAlive);

    // ─── 0. Nightmare Wolf blocks target's night action ───
    if (actions.nightmareWolfTarget) {
      const blocked = alive.find((p) => p.id === actions.nightmareWolfTarget);
      if (blocked) {
        blocked.nightmareBlocked = true;
        result.messages.push('nightmare_blocked');
      }
    }

    // ─── 0.5 Cupid links lovers (first night only) ───
    if (actions.cupidTarget1 && actions.cupidTarget2 && game.round === 1) {
      const cupid = alive.find((p) => p.role === Role.CUPID);
      if (cupid && cupid.cupidState && !cupid.cupidState.hasLinked) {
        const lover1 = game.players.find((p) => p.id === actions.cupidTarget1);
        const lover2 = game.players.find((p) => p.id === actions.cupidTarget2);
        if (lover1 && lover2 && lover1.id !== lover2.id) {
          lover1.loversPartnerId = lover2.id;
          lover2.loversPartnerId = lover1.id;
          cupid.cupidState.hasLinked = true;
          result.messages.push('lovers_linked');
        }
      }
    }

    // ─── 1. Seer checks (check if blocked by Nightmare) ───
    if (actions.seerTarget) {
      const seer = alive.find((p) => p.role === Role.SEER || (p.role === Role.APPRENTICE_SEER && p.apprenticeSeerState?.isActivated));
      if (seer && !seer.nightmareBlocked) {
        const target = game.players.find((p) => p.id === actions.seerTarget);
        if (target) {
          const alignment = target.cursedByShaman
            ? SeerResult.EVIL
            : getRoleSeerResult(target.role);
          result.seerResult = { targetId: target.id, alignment };
          result.logEntries.push({ round: game.round, phase: 'night', action: 'seer_check', actorId: seer.id, targetId: target.id, result: alignment });
        }
      }
    }

    // ─── 2. Aura Seer checks ───
    if (actions.auraSeerTarget) {
      const auraSeer = alive.find((p) => p.role === Role.AURA_SEER);
      if (auraSeer && !auraSeer.nightmareBlocked) {
        const target = game.players.find((p) => p.id === actions.auraSeerTarget);
        if (target) {
          let seerResult = getRoleSeerResult(target.role);
          if (target.cursedByShaman) {
            seerResult = SeerResult.EVIL;
          }
          result.auraSeerResult = { targetId: target.id, result: seerResult };
          result.logEntries.push({ round: game.round, phase: 'night', action: 'aura_seer_check', actorId: auraSeer.id, targetId: target.id, result: seerResult });
        }
      }
    }

    // ─── 3. Werewolf Seer checks ───
    if (actions.werewolfSeerTarget) {
      const wSeer = alive.find((p) => p.role === Role.WEREWOLF_SEER);
      if (wSeer && !wSeer.nightmareBlocked) {
        const target = game.players.find((p) => p.id === actions.werewolfSeerTarget);
        if (target) {
          result.werewolfSeerResult = { targetId: target.id, role: target.role };
          result.logEntries.push({ round: game.round, phase: 'night', action: 'werewolf_seer_check', actorId: wSeer.id, targetId: target.id, result: target.role });
        }
      }
    }

    // ─── 4. Werewolf kill vote ───
    let werewolfTarget: string | null = null;
    if (Object.keys(actions.werewolfVotes).length > 0) {
      const voteCounts: Record<string, number> = {};
      for (const [wolfId, targetId] of Object.entries(actions.werewolfVotes)) {
        const wolf = game.players.find((p) => p.id === wolfId);
        // Wolf Fang can only vote when it's the last wolf alive
        if (wolf?.role === Role.WOLF_FANG) {
          const otherWolves = alive.filter((p) => isWerewolfRole(p.role) && p.id !== wolf.id);
          if (otherWolves.length > 0) continue; // skip vote, not last wolf
        }
        const weight = wolf?.role === Role.ALPHA_WEREWOLF ? 2 : 1;
        voteCounts[targetId] = (voteCounts[targetId] || 0) + weight;
      }

      let maxVotes = 0;
      for (const [targetId, count] of Object.entries(voteCounts)) {
        if (count > maxVotes) {
          maxVotes = count;
          werewolfTarget = targetId;
        }
      }
    }

    // ─── 4.2 Vegetarian Wolf check — if only vegetarian wolves are alive, no kill ───
    if (werewolfTarget) {
      const nonVeggieWolves = alive.filter((p) => isWerewolfRole(p.role) && p.role !== Role.VEGETARIAN_WOLF);
      if (nonVeggieWolves.length === 0) {
        // Only vegetarian wolves remain — they cannot kill
        werewolfTarget = null;
        result.messages.push('vegetarian_wolf_no_kill');
      }
    }

    // ─── 4.3 Snow Wolf drag target (first night only) ───
    if (actions.snowWolfDragTarget && game.round === 1) {
      const snowWolf = alive.find((p) => p.role === Role.SNOW_WOLF);
      if (snowWolf && snowWolf.snowWolfState) {
        snowWolf.snowWolfState.dragTargetId = actions.snowWolfDragTarget;
        result.messages.push('snow_wolf_target_set');
      }
    }

    // ─── 4.5 Blood Moon Wolf — every 3rd night, kill can't be saved ───
    const bloodMoonWolf = alive.find((p) => p.role === Role.BLOOD_MOON_WOLF);
    const isBloodMoonNight = bloodMoonWolf && game.round % 3 === 0;

    // ─── 5. Beast Hunter trap check ───
    if (actions.beastHunterTrap && werewolfTarget === actions.beastHunterTrap) {
      const bh = alive.find((p) => p.role === Role.BEAST_HUNTER);
      if (bh && !bh.nightmareBlocked) {
        const wolves = alive
          .filter((p) => isWerewolfRole(p.role))
          .sort((a, b) => {
            const priority: Record<string, number> = {
              [Role.WEREWOLF]: 1,
              [Role.WEREWOLF_SHAMAN]: 2,
              [Role.WEREWOLF_SEER]: 3,
              [Role.HOWLER_WOLF]: 4,
              [Role.SHADOW_WOLF]: 5,
              [Role.NIGHTMARE_WOLF]: 6,
              [Role.VENOM_WOLF]: 7,
              [Role.BLOOD_MOON_WOLF]: 8,
              [Role.LONE_WOLF]: 9,
              [Role.VEGETARIAN_WOLF]: 10,
              [Role.WOLF_FANG]: 11,
              [Role.SNOW_WOLF]: 12,
              [Role.ALPHA_WEREWOLF]: 13,
            };
            return (priority[a.role] || 0) - (priority[b.role] || 0);
          });

        if (wolves.length > 0) {
          result.deaths.push({ playerId: wolves[0].id, cause: DeathCause.TRAP });
          result.messages.push('beast_hunter_trap_triggered');
          result.logEntries.push({ round: game.round, phase: 'night', action: 'beast_hunter_trap', actorId: bh.id, targetId: wolves[0].id, result: 'killed' });
        }
        werewolfTarget = null;
      }
    }

    // ─── 6. Avenger target ───
    if (actions.avengerTarget) {
      const avenger = alive.find((p) => p.role === Role.AVENGER);
      if (avenger && !avenger.nightmareBlocked) {
        avenger.avengerState = { revengeTargetId: actions.avengerTarget };
      }
    }

    // ─── 6.5 Bodyguard protection ───
    let bodyguardSaved = false;
    if (actions.bodyguardTarget) {
      const bodyguard = alive.find((p) => p.role === Role.BODYGUARD);
      if (bodyguard && !bodyguard.nightmareBlocked && bodyguard.bodyguardState) {
        // Can't protect same player two nights in a row
        if (actions.bodyguardTarget !== bodyguard.bodyguardState.lastProtected) {
          bodyguard.bodyguardState.lastProtected = actions.bodyguardTarget;
          if (werewolfTarget === actions.bodyguardTarget && !isBloodMoonNight) {
            bodyguardSaved = true;
            result.saved.push(werewolfTarget);
            // Bodyguard dies instead
            result.deaths.push({ playerId: bodyguard.id, cause: DeathCause.WEREWOLF_KILL });
            result.messages.push('bodyguard_sacrifice');
            result.logEntries.push({ round: game.round, phase: 'night', action: 'bodyguard_protect', actorId: bodyguard.id, targetId: actions.bodyguardTarget, result: 'sacrifice' });
            werewolfTarget = null;
          }
        }
      }
    }

    // ─── 7. Doctor save (not on Blood Moon night) ───
    let doctorSaved = false;
    if (actions.doctorTarget && werewolfTarget === actions.doctorTarget) {
      const doctor = alive.find((p) => p.role === Role.DOCTOR);
      if (doctor && !doctor.nightmareBlocked && !isBloodMoonNight) {
        doctorSaved = true;
        result.saved.push(werewolfTarget);
        result.logEntries.push({ round: game.round, phase: 'night', action: 'doctor_save', actorId: doctor.id, targetId: werewolfTarget, result: 'saved' });
        werewolfTarget = null;
      }
    } else if (actions.doctorTarget) {
      // Doctor protected someone who was NOT the wolf target — no log needed
    }

    // ─── 7.2 Monk protection (bless/protect from wolf kill) ───
    let monkSaved = false;
    if (actions.monkTarget && werewolfTarget && werewolfTarget === actions.monkTarget) {
      const monk = alive.find((p) => p.role === Role.MONK);
      if (monk && !monk.nightmareBlocked && !isBloodMoonNight) {
        monkSaved = true;
        result.saved.push(werewolfTarget!);
        result.logEntries.push({ round: game.round, phase: 'night', action: 'monk_protect', actorId: monk.id, targetId: werewolfTarget!, result: 'saved' });
        werewolfTarget = null;
      }
    }

    // ─── 7.5 Record witch target BEFORE witch acts (so she can see who was attacked) ───
    // This is the werewolf target after beast hunter trap and bodyguard/doctor resolution
    // but before witch heal/kill — the witch sees the current target to decide
    result.witchTarget = werewolfTarget || undefined;

    // ─── 8. Witch actions (not on Blood Moon night for heal) ───
    const witch = alive.find((p) => p.role === Role.WITCH);
    if (witch?.witchState && !witch.nightmareBlocked) {
      // Heal
      if (actions.witchHeal && werewolfTarget && witch.witchState.hasHealPotion && !isBloodMoonNight) {
        result.saved.push(werewolfTarget);
        result.logEntries.push({ round: game.round, phase: 'night', action: 'witch_heal', actorId: witch.id, targetId: werewolfTarget, result: 'saved' });
        witch.witchState.hasHealPotion = false;
        werewolfTarget = null;
      }
      // Kill
      if (actions.witchKillTarget && witch.witchState.hasKillPotion) {
        const witchTarget = alive.find((p) => p.id === actions.witchKillTarget);
        if (witchTarget) {
          result.deaths.push({ playerId: witchTarget.id, cause: DeathCause.WITCH_KILL });
          result.logEntries.push({ round: game.round, phase: 'night', action: 'witch_kill', actorId: witch.id, targetId: witchTarget.id, result: 'killed' });
        }
        witch.witchState.hasKillPotion = false;
      }
    }

    // ─── 9. Werewolf kill (if not saved) ───
    if (werewolfTarget) {
      const target = game.players.find((p) => p.id === werewolfTarget);
      if (target) {
        // Check Cursed — bitten by werewolf, transforms
        if (target.role === Role.CURSED && target.cursedState && !target.cursedState.isTransformed) {
          target.cursedState.isTransformed = true;
          target.team = Team.WEREWOLF;
          target.role = Role.WEREWOLF;
          result.cursedTransformed = target.id;
          result.messages.push('cursed_transformed');
          result.logEntries.push({ round: game.round, phase: 'night', action: 'cursed_transform', targetId: target.id });
        } else if (target.role === Role.BOMBER) {
          // Bomber can't be killed by werewolves
          result.messages.push('bomber_immune');
        } else if (target.role === Role.VAMPIRE) {
          // Vampire is immune to wolf bite
          result.messages.push('vampire_immune');
        } else if (target.role === Role.CULT_LEADER) {
          // Cult Leader is immune to wolf bite
          result.messages.push('cult_leader_immune');
        } else if (target.role === Role.ELDER && target.elderState && target.elderState.extraLives > 0) {
          // Elder survives first wolf attack
          target.elderState.extraLives--;
          result.saved.push(target.id);
          result.messages.push('elder_survived');
        } else if (target.role === Role.SURVIVOR && target.survivorState && target.survivorState.vestCount > 0) {
          // Survivor uses bulletproof vest
          target.survivorState.vestCount--;
          result.saved.push(target.id);
          result.messages.push('survivor_vest');
        } else {
          result.deaths.push({ playerId: target.id, cause: DeathCause.WEREWOLF_KILL });
          result.logEntries.push({ round: game.round, phase: 'night', action: 'werewolf_kill', targetId: target.id, result: 'killed' });

          // Priest holy water — if priest is killed by wolves, the attacking wolf dies too
          if (target.role === Role.PRIEST && target.priestState?.hasHolyWater) {
            // Find a random wolf who voted for this target
            const wolfWhoKilled = Object.entries(actions.werewolfVotes)
              .filter(([_, tid]) => tid === werewolfTarget)
              .map(([wid]) => alive.find((p) => p.id === wid))
              .filter(Boolean)[0];
            if (wolfWhoKilled) {
              result.deaths.push({ playerId: wolfWhoKilled.id, cause: DeathCause.TRAP });
              result.messages.push('priest_holy_water');
            }
          }

          // Check Avenger revenge
          if (target.role === Role.AVENGER && target.avengerState?.revengeTargetId) {
            const revengeTarget = alive.find((p) => p.id === target.avengerState!.revengeTargetId);
            if (revengeTarget) {
              result.deaths.push({ playerId: revengeTarget.id, cause: DeathCause.AVENGER_REVENGE });
              result.messages.push('avenger_revenge');
              result.logEntries.push({ round: game.round, phase: 'night', action: 'avenger_revenge', actorId: target.id, targetId: revengeTarget.id, result: 'killed' });
            }
          }
        }
      }
    }

    // ─── 10. Serial Killer kill (independent of wolves) ───
    if (actions.serialKillerTarget) {
      const sk = alive.find((p) => p.role === Role.SERIAL_KILLER);
      if (sk && !sk.nightmareBlocked) {
        const skTarget = alive.find((p) => p.id === actions.serialKillerTarget);
        if (skTarget && !result.deaths.some((d) => d.playerId === skTarget.id)) {
          // Check if target is protected
          if (actions.doctorTarget === skTarget.id || actions.bodyguardTarget === skTarget.id) {
            result.saved.push(skTarget.id);
          } else {
            result.deaths.push({ playerId: skTarget.id, cause: DeathCause.SERIAL_KILLER });
            result.logEntries.push({ round: game.round, phase: 'night', action: 'serial_killer_kill', actorId: sk.id, targetId: skTarget.id, result: 'killed' });
            if (sk.serialKillerState) sk.serialKillerState.killCount++;
          }
        }
      }
    }

    // ─── 10.5 Lone Wolf solo kill ───
    if (actions.loneWolfTarget) {
      const lw = alive.find((p) => p.role === Role.LONE_WOLF);
      if (lw && !lw.nightmareBlocked) {
        const lwTarget = alive.find((p) => p.id === actions.loneWolfTarget);
        if (lwTarget && !result.deaths.some((d) => d.playerId === lwTarget.id)) {
          result.deaths.push({ playerId: lwTarget.id, cause: DeathCause.WEREWOLF_KILL });
        }
      }
    }

    // ─── 11. Venom Wolf poison (delayed death) ───
    // First: resolve previous venom (player who was poisoned last night dies now)
    const venomWolf = game.players.find((p) => p.role === Role.VENOM_WOLF && p.isAlive);
    for (const p of alive) {
      if ((p as any)._venomDying) {
        result.deaths.push({ playerId: p.id, cause: DeathCause.VENOM });
        result.messages.push('venom_kill');
        delete (p as any)._venomDying;
      }
    }
    // Set new venom target (will die next night)
    if (actions.venomWolfTarget && venomWolf?.venomWolfState?.hasVenom) {
      const venomTarget = alive.find((p) => p.id === actions.venomWolfTarget);
      if (venomTarget) {
        (venomTarget as any)._venomDying = true;
        venomWolf.venomWolfState.hasVenom = false;
        result.messages.push('venom_applied');
      }
    }

    // ─── 12. Bomber explosion (if placed on previous night) ───
    const bomber = game.players.find((p) => p.role === Role.BOMBER && p.isAlive);
    if (bomber?.bomberState?.bombTarget && bomber.bomberState.hasPlacedBomb) {
      const bombTarget = alive.find((p) => p.id === bomber.bomberState!.bombTarget);
      if (bombTarget && !result.deaths.some((d) => d.playerId === bombTarget.id)) {
        result.deaths.push({ playerId: bombTarget.id, cause: DeathCause.BOMBER_EXPLOSION });
        result.messages.push('bomb_exploded');
        result.logEntries.push({ round: game.round, phase: 'night', action: 'bomber_explode', actorId: bomber.id, targetId: bombTarget.id, result: 'killed' });
      }
      bomber.bomberState.bombTarget = undefined;
    }

    // Set new bomb if placed this night
    if (actions.bomberTarget && bomber?.bomberState) {
      bomber.bomberState.bombTarget = actions.bomberTarget;
      bomber.bomberState.hasPlacedBomb = true;
    }

    // ─── 13. Arsonist douse/ignite ───
    const arsonist = alive.find((p) => p.role === Role.ARSONIST);
    if (arsonist && !arsonist.nightmareBlocked && arsonist.arsonistState) {
      if (actions.arsonistIgnite) {
        // Kill all doused players
        for (const dousedId of arsonist.arsonistState.dousedPlayers) {
          const dousedPlayer = alive.find((p) => p.id === dousedId);
          if (dousedPlayer && !result.deaths.some((d) => d.playerId === dousedPlayer.id)) {
            result.deaths.push({ playerId: dousedPlayer.id, cause: DeathCause.ARSONIST_FIRE });
          }
        }
        arsonist.arsonistState.dousedPlayers = [];
        result.messages.push('arsonist_ignited');
      } else if (actions.arsonistTarget) {
        // Douse a player
        if (!arsonist.arsonistState.dousedPlayers.includes(actions.arsonistTarget)) {
          arsonist.arsonistState.dousedPlayers.push(actions.arsonistTarget);
          const doused = game.players.find((p) => p.id === actions.arsonistTarget);
          if (doused) doused.isDoused = true;
        }
      }
    }

    // ─── 14. Vampire mark/kill ───
    const vampire = alive.find((p) => p.role === Role.VAMPIRE);
    if (vampire && !vampire.nightmareBlocked && vampire.vampireState) {
      if (actions.vampireKill) {
        // Kill all marked players
        for (const markedId of vampire.vampireState.markedPlayers) {
          const markedPlayer = alive.find((p) => p.id === markedId);
          if (markedPlayer && !result.deaths.some((d) => d.playerId === markedPlayer.id)) {
            result.deaths.push({ playerId: markedPlayer.id, cause: DeathCause.VAMPIRE_KILL });
            result.logEntries.push({ round: game.round, phase: 'night', action: 'vampire_kill', actorId: vampire.id, targetId: markedPlayer.id, result: 'killed' });
          }
        }
        vampire.vampireState.markedPlayers = [];
        result.messages.push('vampire_killed');
      } else if (actions.vampireTarget) {
        // Mark a player
        if (!vampire.vampireState.markedPlayers.includes(actions.vampireTarget)) {
          vampire.vampireState.markedPlayers.push(actions.vampireTarget);
          result.logEntries.push({ round: game.round, phase: 'night', action: 'vampire_mark', actorId: vampire.id, targetId: actions.vampireTarget, result: 'marked' });
        }
      }
    }

    // ─── 15. Cult Leader recruitment ───
    if (actions.cultLeaderTarget) {
      const cultLeader = alive.find((p) => p.role === Role.CULT_LEADER);
      if (cultLeader && !cultLeader.nightmareBlocked && cultLeader.cultLeaderState) {
        const recruitTarget = alive.find((p) => p.id === actions.cultLeaderTarget);
        if (recruitTarget && !cultLeader.cultLeaderState.cultMembers.includes(recruitTarget.id)) {
          cultLeader.cultLeaderState.cultMembers.push(recruitTarget.id);
          result.logEntries.push({ round: game.round, phase: 'night', action: 'cult_recruit', actorId: cultLeader.id, targetId: recruitTarget.id, result: 'recruited' });
          result.messages.push('cult_recruited');
        }
      }
    }

    // ─── 16. Lovers death check ───
    // If one lover dies, the other dies too
    for (const death of [...result.deaths]) {
      const deadPlayer = game.players.find((p) => p.id === death.playerId);
      if (deadPlayer?.loversPartnerId) {
        const partner = alive.find((p) => p.id === deadPlayer.loversPartnerId);
        if (partner && !result.deaths.some((d) => d.playerId === partner.id)) {
          result.deaths.push({ playerId: partner.id, cause: DeathCause.LOVERS_SUICIDE });
          result.messages.push('lovers_died');
        }
      }
    }

    // ─── 16.5 Snow Wolf drag — if snow wolf dies, drag target dies too ───
    for (const death of [...result.deaths]) {
      const deadPlayer = game.players.find((p) => p.id === death.playerId);
      if (deadPlayer?.role === Role.SNOW_WOLF && deadPlayer.snowWolfState?.dragTargetId) {
        const dragTarget = alive.find((p) => p.id === deadPlayer.snowWolfState!.dragTargetId);
        if (dragTarget && !result.deaths.some((d) => d.playerId === dragTarget.id)) {
          result.deaths.push({ playerId: dragTarget.id, cause: DeathCause.SNOW_WOLF_DRAG });
          result.logEntries.push({ round: game.round, phase: 'night', action: 'snow_wolf_drag', actorId: deadPlayer.id, targetId: dragTarget.id, result: 'killed' });
          result.messages.push('snow_wolf_dragged');
        }
      }
    }

    // ─── 17. Apprentice Seer activation ───
    // If original Seer died this round, activate Apprentice Seer
    const seerDied = result.deaths.some((d) => {
      const p = game.players.find((pl) => pl.id === d.playerId);
      return p?.role === Role.SEER;
    });
    if (seerDied) {
      const apprentice = alive.find((p) => p.role === Role.APPRENTICE_SEER);
      if (apprentice && apprentice.apprenticeSeerState) {
        apprentice.apprenticeSeerState.isActivated = true;
        result.messages.push('apprentice_seer_activated');
      }
    }

    // ─── 16. Howler Wolf reveal ───
    // If a wolf died, Howler reveals a random village role
    const howler = alive.find((p) => p.role === Role.HOWLER_WOLF);
    if (howler) {
      const wolfDied = result.deaths.some((d) => {
        const p = game.players.find((pl) => pl.id === d.playerId);
        return p && isWerewolfRole(p.role);
      });
      if (wolfDied) {
        const villageAlive = alive.filter((p) => p.team === Team.VILLAGE && !result.deaths.some((d) => d.playerId === p.id));
        if (villageAlive.length > 0) {
          const revealed = villageAlive[Math.floor(Math.random() * villageAlive.length)];
          result.messages.push(`howler_revealed:${revealed.id}:${revealed.role}`);
        }
      }
    }

    // ─── Cleanup: clear nightmare block ───
    for (const p of game.players) {
      p.nightmareBlocked = false;
    }

    return result;
  }

  resolveVote(game: GameState): { eliminatedId: string | null; voteCount: Record<string, number> } {
    return { eliminatedId: null, voteCount: {} };
  }

  resolveVoteWithData(
    game: GameState,
    votes: Record<string, string>,
  ): { eliminatedId: string | null; voteCount: Record<string, number> } {
    const voteCount: Record<string, number> = {};
    const alivePlayers = game.players.filter((p) => p.isAlive);

    for (const [voterId, targetId] of Object.entries(votes)) {
      // Mayor has 2x vote weight when revealed
      const voter = alivePlayers.find((p) => p.id === voterId);
      const weight = (voter?.role === Role.MAYOR && voter?.mayorState?.hasRevealed) ? 2 : 1;
      voteCount[targetId] = (voteCount[targetId] || 0) + weight;
    }

    // Find majority
    const majority = Math.floor(alivePlayers.length / 2) + 1;
    let eliminatedId: string | null = null;
    let maxVotes = 0;
    let tied = false;

    for (const [targetId, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = targetId;
        tied = false;
      } else if (count === maxVotes) {
        tied = true;
      }
    }

    // Tie = no elimination
    if (tied || maxVotes < majority) {
      eliminatedId = null;
    }

    return { eliminatedId, voteCount };
  }

  checkSoloWinOnVote(game: GameState, eliminatedId: string): { winCondition: WinCondition; team: Team; playerIds: string[] } | null {
    const eliminated = game.players.find((p) => p.id === eliminatedId);
    if (!eliminated) return null;

    // Fool wins if voted out
    if (eliminated.role === Role.FOOL) {
      return {
        winCondition: WinCondition.FOOL_WINS,
        team: Team.SOLO,
        playerIds: [eliminated.id],
      };
    }

    // Jester wins if voted out (and kills one random voter)
    if (eliminated.role === Role.JESTER) {
      return {
        winCondition: WinCondition.JESTER_WINS,
        team: Team.SOLO,
        playerIds: [eliminated.id],
      };
    }

    // Headhunter wins if their target was voted out
    const headhunter = game.players.find(
      (p) => p.role === Role.HEADHUNTER && p.isAlive && p.headhunterState?.targetId === eliminatedId,
    );
    if (headhunter) {
      return {
        winCondition: WinCondition.HEADHUNTER_WINS,
        team: Team.SOLO,
        playerIds: [headhunter.id],
      };
    }

    return null;
  }

  checkWinCondition(game: GameState): { winCondition: WinCondition; team: Team; playerIds: string[] } | null {
    const alive = game.players.filter((p) => p.isAlive);
    const wolves = alive.filter((p) => isWerewolfRole(p.role));
    const nonWolves = alive.filter((p) => !isWerewolfRole(p.role));

    // Check Survivor win condition — survivor wins alongside the winning team
    // (handled at game end, not here)

    // Check Lovers win — if only 2 players left and they are lovers
    if (alive.length === 2) {
      const [p1, p2] = alive;
      if (p1.loversPartnerId === p2.id && p2.loversPartnerId === p1.id) {
        return {
          winCondition: WinCondition.LOVERS_WIN,
          team: Team.SOLO,
          playerIds: [p1.id, p2.id],
        };
      }
    }

    // All wolves dead → Village wins
    if (wolves.length === 0) {
      // Check Serial Killer — if SK is alive and all wolves are dead,
      // game continues unless SK is the only non-village player
      const sk = alive.find((p) => p.role === Role.SERIAL_KILLER);
      if (sk && alive.length > 1) {
        // Game continues — SK is still hunting
        return null;
      }

      return {
        winCondition: WinCondition.ALL_WEREWOLVES_DEAD,
        team: Team.VILLAGE,
        playerIds: game.players.filter((p) => p.team === Team.VILLAGE).map((p) => p.id),
      };
    }

    // Wolves >= non-wolf alive count → Werewolves win
    if (wolves.length >= nonWolves.length) {
      // Check Lone Wolf special win
      const loneWolf = wolves.find((p) => p.role === Role.LONE_WOLF);
      if (loneWolf && wolves.length === 1) {
        return {
          winCondition: WinCondition.LONE_WOLF_WINS,
          team: Team.SOLO,
          playerIds: [loneWolf.id],
        };
      }

      return {
        winCondition: WinCondition.WEREWOLVES_MAJORITY,
        team: Team.WEREWOLF,
        playerIds: game.players.filter((p) => p.team === Team.WEREWOLF).map((p) => p.id),
      };
    }

    // Check Serial Killer solo win — only SK alive
    const sk = alive.find((p) => p.role === Role.SERIAL_KILLER);
    if (sk && alive.length === 1) {
      return {
        winCondition: WinCondition.SERIAL_KILLER_WINS,
        team: Team.SOLO,
        playerIds: [sk.id],
      };
    }

    // Check Arsonist solo win — only arsonist alive
    const arsonist2 = alive.find((p) => p.role === Role.ARSONIST);
    if (arsonist2 && alive.length === 1) {
      return {
        winCondition: WinCondition.ARSONIST_WINS,
        team: Team.SOLO,
        playerIds: [arsonist2.id],
      };
    }

    // Check Vampire solo win — only vampire alive
    const vampire = alive.find((p) => p.role === Role.VAMPIRE);
    if (vampire && alive.length === 1) {
      return {
        winCondition: WinCondition.VAMPIRE_WINS,
        team: Team.SOLO,
        playerIds: [vampire.id],
      };
    }

    // Check Cult Leader win — cult members are majority of alive players
    const cultLeader = alive.find((p) => p.role === Role.CULT_LEADER);
    if (cultLeader && cultLeader.cultLeaderState) {
      const aliveCultMembers = cultLeader.cultLeaderState.cultMembers.filter(
        (id) => alive.some((p) => p.id === id),
      );
      // Cult leader + alive cult members >= majority of alive players
      const cultSize = aliveCultMembers.length + 1; // +1 for the cult leader
      if (cultSize > alive.length / 2) {
        return {
          winCondition: WinCondition.CULT_LEADER_WINS,
          team: Team.VILLAGE,
          playerIds: [cultLeader.id, ...aliveCultMembers],
        };
      }
    }

    return null;
  }

  getWerewolfIds(players: PlayerState[]): string[] {
    return players
      .filter((p) => isWerewolfRole(p.role) && p.isAlive)
      .map((p) => p.id);
  }
}
