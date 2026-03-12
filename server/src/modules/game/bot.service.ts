import { Injectable } from '@nestjs/common';
import { GameService, GameState } from './game.service';
import { GamePhase, Role } from '@shared/types/game.types';
import { isWerewolfRole } from '@shared/constants/roles';
import { randomUUID } from 'crypto';

const BOT_NAMES = [
  'Luna 🌙',
  'Shadow 🐾',
  'Fang 🐺',
  'Mystic ✨',
  'Storm ⚡',
  'Raven 🪶',
  'Ember 🔥',
  'Frost ❄️',
  'Sage 🌿',
  'Blaze 💥',
  'Dusk 🌅',
  'Echo 🔮',
  'Ivy 🍀',
  'Hawk 🦅',
  'Coral 🌊',
];

@Injectable()
export class BotService {
  private activeGames = new Map<string, NodeJS.Timeout[]>();
  // Callback to broadcast vote updates — set by the gateway
  private voteUpdateCallback: ((gameId: string, roomCode: string, votes: Record<string, string>) => void) | null = null;

  constructor(private readonly gameService: GameService) {}

  /**
   * Set the callback for broadcasting vote updates. Called by GameGateway on init.
   */
  setVoteUpdateCallback(
    callback: (gameId: string, roomCode: string, votes: Record<string, string>) => void,
  ): void {
    this.voteUpdateCallback = callback;
  }

  /**
   * Generate bot players to fill a room. Returns array of bot RoomPlayer objects.
   */
  generateBotPlayers(
    count: number,
  ): { id: string; username: string; isReady: boolean; isHost: boolean; isConnected: boolean }[] {
    const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    return Array.from({ length: count }, (_, i) => ({
      id: `bot-${randomUUID()}`,
      username: shuffled[i % shuffled.length],
      isReady: true,
      isHost: false,
      isConnected: true,
    }));
  }

  /**
   * Check if a player ID is a bot
   */
  isBot(playerId: string): boolean {
    return playerId.startsWith('bot-');
  }

  /**
   * Schedule bot actions for a given game phase.
   * Called by the gateway after a phase change is broadcast.
   */
  async onPhaseChanged(gameId: string, phase: GamePhase): Promise<void> {
    // Clear previous timers for this game
    this.clearTimers(gameId);

    const game = await this.gameService.getGame(gameId);
    if (!game) return;

    const botPlayers = game.players.filter((p) => this.isBot(p.id) && p.isAlive);
    if (botPlayers.length === 0) return;

    if (phase === GamePhase.NIGHT) {
      this.scheduleNightActions(gameId, game, botPlayers);
    } else if (phase === GamePhase.VOTE) {
      this.scheduleVotes(gameId, game, botPlayers);
    }
  }

  /**
   * Schedule night actions for all bot players with night abilities
   */
  private scheduleNightActions(
    gameId: string,
    game: GameState,
    botPlayers: GameState['players'],
  ): void {
    const timers: NodeJS.Timeout[] = [];
    const alivePlayers = game.players.filter((p) => p.isAlive);

    for (const bot of botPlayers) {
      const delay = 1000 + Math.random() * 3000; // 1-4s random delay

      const timer = setTimeout(async () => {
        const freshGame = await this.gameService.getGame(gameId);
        if (!freshGame || freshGame.phase !== GamePhase.NIGHT) return;

        const freshBot = freshGame.players.find((p) => p.id === bot.id);
        if (!freshBot || !freshBot.isAlive) return;

        const aliveOthers = freshGame.players.filter((p) => p.isAlive && p.id !== bot.id);
        if (aliveOthers.length === 0) return;

        // Choose target based on role faction awareness
        let randomTarget;
        if (freshBot.role === Role.MEDIUM) {
          // Medium should target dead players for revive
          const deadPlayers = freshGame.players.filter((p) => !p.isAlive);
          if (deadPlayers.length > 0) {
            randomTarget = deadPlayers[Math.floor(Math.random() * deadPlayers.length)];
          } else {
            randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          }
        } else if (freshBot.role === Role.WITCH) {
          // Witch kill should target non-villagers from witch's perspective (random non-self)
          // Witch doesn't know who wolves are, so random is fine, but avoid self
          randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        } else if (isWerewolfRole(freshBot.role)) {
          // Wolves should target non-wolves
          const nonWolves = aliveOthers.filter((p) => !isWerewolfRole(p.role));
          randomTarget = nonWolves.length > 0
            ? nonWolves[Math.floor(Math.random() * nonWolves.length)]
            : aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        } else {
          randomTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        }

        const { action, secondAction } = this.getNightAction(freshBot.role, freshGame, bot.id);

        if (action) {
          await this.gameService.recordNightAction(gameId, bot.id, action, randomTarget.id);
        }
        // Some roles need a second action (e.g., Werewolf Seer: seer_check + werewolf_kill)
        if (secondAction) {
          // Pick a different target for the second action (wolf kill vs seer check)
          const secondTarget = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          await this.gameService.recordNightAction(gameId, bot.id, secondAction, secondTarget.id);
        }
      }, delay);

      timers.push(timer);
    }

    this.activeGames.set(gameId, timers);
  }

  /**
   * Determine the night action type for a given role
   */
  private getNightAction(role: Role, game: GameState, botId: string): { action: string | null; secondAction?: string | null } {
    // Werewolf Seer needs both seer_check AND werewolf_kill
    if (role === Role.WEREWOLF_SEER) {
      return { action: 'seer_check', secondAction: 'werewolf_kill' };
    }
    if (isWerewolfRole(role)) {
      return { action: 'werewolf_kill' };
    }

    switch (role) {
      case Role.SEER:
      case Role.APPRENTICE_SEER:
        return { action: 'seer_check' };
      case Role.AURA_SEER:
        return { action: 'aura_check' };
      case Role.DOCTOR:
        return { action: 'protect' };
      case Role.BODYGUARD:
        return { action: 'protect' };
      case Role.WITCH: {
        const witch = game.players.find((p) => p.id === botId);
        // Check if there's a werewolf target (someone being attacked)
        const werewolfTarget = this.gameService.getWerewolfTarget(game);
        // Prioritize healing if someone is being attacked and we have heal potion
        if (werewolfTarget && witch?.witchState?.hasHealPotion) {
          return { action: 'heal' };
        }
        // Otherwise try to kill a non-wolf player (50% chance to use kill potion)
        if (witch?.witchState?.hasKillPotion && Math.random() < 0.5) {
          return { action: 'kill' };
        }
        // Skip if no potions or randomly decided not to use
        return { action: 'skip' };
      }
      case Role.BOMBER:
        return { action: 'bomb' };
      case Role.BEAST_HUNTER:
        return { action: 'trap' };
      case Role.AVENGER:
        return { action: 'revenge' };
      case Role.MEDIUM: {
        // Only try to revive if there are dead players
        const deadPlayers = game.players.filter((p) => !p.isAlive);
        if (deadPlayers.length > 0) {
          return { action: 'revive' };
        }
        return { action: null };
      }
      case Role.SERIAL_KILLER:
        return { action: 'kill' };
      case Role.ARSONIST:
        // Alternate between douse and ignite
        const arsonist = game.players.find((p) => p.id === botId);
        if (arsonist?.arsonistState && arsonist.arsonistState.dousedPlayers.length >= 2) {
          return { action: Math.random() < 0.5 ? 'ignite' : 'douse' };
        }
        return { action: 'douse' };
      case Role.CUPID:
        return game.round === 1 ? { action: 'link' } : { action: null };
      case Role.DOPPELGANGER:
        return game.round === 1 ? { action: 'choose' } : { action: null };
      case Role.VIGILANTE: {
        const vig = game.players.find((p) => p.id === botId);
        if (vig?.vigilanteState?.hasBullet) {
          return { action: 'vigilante_kill' };
        }
        return { action: null };
      }
      case Role.SPY:
        return { action: 'spy_watch' };
      case Role.JAILER:
        return { action: 'jail' };
      case Role.GRAVE_ROBBER:
        return { action: 'rob_grave' };
      case Role.PIRATE:
        return { action: 'duel' };
      case Role.PLAGUE_DOCTOR:
        return { action: 'plague' };
      case Role.CORRUPTOR:
        return { action: 'corrupt' };
      default:
        return { action: null };
    }
  }

  /**
   * Schedule votes for all bot players during vote phase.
   * Bots coordinate their votes to achieve majority — without this,
   * random voting across N players almost never reaches majority and
   * the game stalls with no eliminations.
   */
  private scheduleVotes(gameId: string, game: GameState, botPlayers: GameState['players']): void {
    const timers: NodeJS.Timeout[] = [];
    const alivePlayers = game.players.filter((p) => p.isAlive);

    // Pre-select a coordinated target for each faction so bots reach majority.
    // Werewolf bots all vote for the same non-wolf target.
    // Village bots all vote for the same target (random alive player).
    // Some bots (20%) deviate to add unpredictability.

    const nonWolves = alivePlayers.filter((p) => !isWerewolfRole(p.role));
    const wolfVoteTarget =
      nonWolves.length > 0
        ? nonWolves[Math.floor(Math.random() * nonWolves.length)]
        : alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

    // Village bots pick a random player to coordinate on
    // Prefer wolf players if any are "suspicious" (random chance to guess right)
    const wolves = alivePlayers.filter((p) => isWerewolfRole(p.role));
    let villageVoteTarget;
    // 40% chance village bots correctly suspect a wolf (simulates game intuition)
    if (wolves.length > 0 && Math.random() < 0.4) {
      villageVoteTarget = wolves[Math.floor(Math.random() * wolves.length)];
    } else {
      villageVoteTarget = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    }

    for (const bot of botPlayers) {
      const delay = 1000 + Math.random() * 4000; // 1-5s random delay

      const timer = setTimeout(async () => {
        const freshGame = await this.gameService.getGame(gameId);
        if (!freshGame || freshGame.phase !== GamePhase.VOTE) return;

        const freshBot = freshGame.players.find((p) => p.id === bot.id);
        if (!freshBot || !freshBot.isAlive) return;

        const aliveOthers = freshGame.players.filter((p) => p.isAlive && p.id !== bot.id);
        if (aliveOthers.length === 0) return;

        let target;
        const shouldDeviate = Math.random() < 0.2; // 20% chance to vote differently

        if (isWerewolfRole(freshBot.role)) {
          // Werewolf bots coordinate on the same non-wolf target
          if (shouldDeviate || wolfVoteTarget.id === bot.id) {
            const candidates = aliveOthers.filter((p) => !isWerewolfRole(p.role));
            target =
              candidates.length > 0
                ? candidates[Math.floor(Math.random() * candidates.length)]
                : aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          } else {
            target = wolfVoteTarget;
          }
        } else {
          // Village bots coordinate on the same target
          if (shouldDeviate || villageVoteTarget.id === bot.id) {
            target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          } else {
            target = villageVoteTarget;
          }
        }

        await this.gameService.recordVote(gameId, bot.id, target.id);
        // Broadcast vote update so human player sees real-time tally
        if (this.voteUpdateCallback) {
          const freshVotes = await this.gameService.getVotes(gameId);
          const currentGame = await this.gameService.getGame(gameId);
          if (currentGame && freshVotes) {
            this.voteUpdateCallback(gameId, currentGame.roomCode, freshVotes);
          }
        }
      }, delay);

      timers.push(timer);
    }

    this.activeGames.set(gameId, [...(this.activeGames.get(gameId) || []), ...timers]);
  }

  /**
   * Clear all scheduled timers for a game
   */
  clearTimers(gameId: string): void {
    const timers = this.activeGames.get(gameId);
    if (timers) {
      timers.forEach((t) => clearTimeout(t));
      this.activeGames.delete(gameId);
    }
  }

  /**
   * Clean up when game ends
   */
  onGameEnd(gameId: string): void {
    this.clearTimers(gameId);
  }
}
