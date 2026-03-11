import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';
import { GameEngine } from './game.engine';
import { GameRecord } from '../../database/entities/game-record.entity';
import { GamePhase, Role, Team, PlayerState, GameTimers, WinCondition } from '@shared/types/game.types';
import { RoomState } from '@shared/types/room.types';
import { v4 as uuid } from 'uuid';

const GAME_TTL = 7200; // 2 hours

export interface GameState {
  id: string;
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: PlayerState[];
  timers: GameTimers;
  phaseEndAt: number;
  nightActions: NightActions;
  startedAt: number;
}

export interface NightActions {
  werewolfVotes: Record<string, string>; // wolfId -> targetId
  seerTarget?: string;
  auraSeerTarget?: string;
  werewolfSeerTarget?: string;
  doctorTarget?: string;
  witchHeal?: boolean;
  witchKillTarget?: string;
  bomberTarget?: string;
  beastHunterTrap?: string;
  avengerTarget?: string;
  mediumRevive?: string;
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

@Injectable()
export class GameService {
  constructor(
    private readonly redis: RedisService,
    private readonly engine: GameEngine,
    @InjectRepository(GameRecord)
    private readonly gameRecordRepo: Repository<GameRecord>,
  ) {}

  async createGame(room: RoomState): Promise<GameState> {
    const id = uuid();
    const players = this.engine.assignRoles(room.players, room.settings.roles);

    const game: GameState = {
      id,
      roomCode: room.code,
      phase: GamePhase.STARTING,
      round: 0,
      players,
      timers: room.settings.timers as GameTimers,
      phaseEndAt: Date.now() + 5000,
      nightActions: { werewolfVotes: {} },
      startedAt: Date.now(),
    };

    await this.saveGame(game);
    // Map room code to game id for lookups
    await this.redis.set(`room_game:${room.code}`, id, GAME_TTL);
    return game;
  }

  async getGame(gameId: string): Promise<GameState | null> {
    return this.redis.getJson<GameState>(`game:${gameId}`);
  }

  async getGameByRoom(roomCode: string): Promise<GameState | null> {
    const gameId = await this.redis.get(`room_game:${roomCode}`);
    if (!gameId) return null;
    return this.getGame(gameId);
  }

  async saveGame(game: GameState): Promise<void> {
    await this.redis.setJson(`game:${game.id}`, game, GAME_TTL);
  }

  async advancePhase(game: GameState, votes?: Record<string, string>): Promise<{
    game: GameState;
    events: GameEvent[];
  }> {
    const events: GameEvent[] = [];

    switch (game.phase) {
      case GamePhase.STARTING: {
        game.phase = GamePhase.NIGHT;
        game.round = 1;
        game.phaseEndAt = Date.now() + (game.timers.night * 1000);
        game.nightActions = { werewolfVotes: {} };
        events.push({ type: 'phase_changed', phase: GamePhase.NIGHT, endAt: game.phaseEndAt });
        break;
      }

      case GamePhase.NIGHT: {
        // Resolve night actions
        const nightResult = this.engine.resolveNight(game);
        game.phase = GamePhase.DAWN;
        game.phaseEndAt = Date.now() + 8000; // 8s for dawn reveal

        for (const death of nightResult.deaths) {
          const player = game.players.find((p) => p.id === death.playerId);
          if (player) {
            player.isAlive = false;
            player.deathCause = death.cause;
            player.deathRound = game.round;
          }
        }

        events.push({ type: 'phase_changed', phase: GamePhase.DAWN, endAt: game.phaseEndAt });
        events.push({
          type: 'dawn_result',
          killed: nightResult.deaths.map((d) => d.playerId),
          saved: nightResult.saved,
          messages: nightResult.messages,
        });

        // Check seer results
        if (nightResult.seerResult) {
          events.push({ type: 'seer_result', ...nightResult.seerResult });
        }
        if (nightResult.auraSeerResult) {
          events.push({ type: 'aura_seer_result', ...nightResult.auraSeerResult });
        }
        if (nightResult.werewolfSeerResult) {
          events.push({ type: 'werewolf_seer_result', ...nightResult.werewolfSeerResult });
        }
        break;
      }

      case GamePhase.DAWN: {
        // Check win condition after night deaths
        const winCheck = this.engine.checkWinCondition(game);
        if (winCheck) {
          game.phase = GamePhase.GAME_OVER;
          events.push({ type: 'game_over', ...winCheck });
          break;
        }

        game.phase = GamePhase.DAY;
        game.phaseEndAt = Date.now() + (game.timers.day * 1000);
        events.push({ type: 'phase_changed', phase: GamePhase.DAY, endAt: game.phaseEndAt });
        break;
      }

      case GamePhase.DAY: {
        game.phase = GamePhase.VOTE;
        game.phaseEndAt = Date.now() + (game.timers.vote * 1000);
        events.push({ type: 'phase_changed', phase: GamePhase.VOTE, endAt: game.phaseEndAt });
        break;
      }

      case GamePhase.VOTE: {
        // Resolve votes using actual vote data
        const voteResult = votes
          ? this.engine.resolveVoteWithData(game, votes)
          : { eliminatedId: null, voteCount: {} };
        game.phase = GamePhase.VOTE_RESULT;
        game.phaseEndAt = Date.now() + 5000;

        events.push({
          type: 'vote_result',
          eliminatedId: voteResult.eliminatedId,
          voteCount: voteResult.voteCount,
        });

        if (voteResult.eliminatedId) {
          const eliminated = game.players.find((p) => p.id === voteResult.eliminatedId);
          if (eliminated) {
            eliminated.isAlive = false;
            eliminated.deathCause = 'VOTED';
            eliminated.deathRound = game.round;
          }

          // Check solo win conditions (Fool, Headhunter)
          const soloWin = this.engine.checkSoloWinOnVote(game, voteResult.eliminatedId);
          if (soloWin) {
            game.phase = GamePhase.GAME_OVER;
            events.push({ type: 'game_over', ...soloWin });
            break;
          }
        }

        events.push({ type: 'phase_changed', phase: GamePhase.VOTE_RESULT, endAt: game.phaseEndAt });
        break;
      }

      case GamePhase.VOTE_RESULT: {
        // Check if eliminated player gets last words
        const lastDeath = game.players.find(
          (p) => !p.isAlive && p.deathRound === game.round && p.deathCause === 'VOTED',
        );

        if (lastDeath) {
          game.phase = GamePhase.LAST_WORDS;
          game.phaseEndAt = Date.now() + (game.timers.lastWords * 1000);
          events.push({ type: 'phase_changed', phase: GamePhase.LAST_WORDS, endAt: game.phaseEndAt });
        } else {
          // Skip to win check
          const winCheck = this.engine.checkWinCondition(game);
          if (winCheck) {
            game.phase = GamePhase.GAME_OVER;
            events.push({ type: 'game_over', ...winCheck });
          } else {
            game.phase = GamePhase.NIGHT;
            game.round++;
            game.phaseEndAt = Date.now() + (game.timers.night * 1000);
            game.nightActions = { werewolfVotes: {} };
            events.push({ type: 'phase_changed', phase: GamePhase.NIGHT, endAt: game.phaseEndAt });
          }
        }
        break;
      }

      case GamePhase.LAST_WORDS: {
        // Check win condition
        const winCheck = this.engine.checkWinCondition(game);
        if (winCheck) {
          game.phase = GamePhase.GAME_OVER;
          events.push({ type: 'game_over', ...winCheck });
        } else {
          game.phase = GamePhase.NIGHT;
          game.round++;
          game.phaseEndAt = Date.now() + (game.timers.night * 1000);
          game.nightActions = { werewolfVotes: {} };
          events.push({ type: 'phase_changed', phase: GamePhase.NIGHT, endAt: game.phaseEndAt });
        }
        break;
      }
    }

    await this.saveGame(game);
    return { game, events };
  }

  async recordNightAction(
    gameId: string,
    playerId: string,
    action: string,
    targetId?: string,
  ): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game || game.phase !== GamePhase.NIGHT) return;

    const player = game.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) return;

    switch (player.role) {
      case Role.WEREWOLF:
      case Role.ALPHA_WEREWOLF:
      case Role.WEREWOLF_SHAMAN:
      case Role.SHADOW_WOLF:
      case Role.BLOOD_MOON_WOLF:
      case Role.HOWLER_WOLF:
        if (targetId) game.nightActions.werewolfVotes[playerId] = targetId;
        break;
      case Role.NIGHTMARE_WOLF:
        if (action === 'werewolf_kill' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        if (action === 'block' && targetId) {
          game.nightActions.nightmareWolfTarget = targetId;
        }
        // Fallback
        if (action !== 'werewolf_kill' && action !== 'block' && targetId) {
          game.nightActions.nightmareWolfTarget = targetId;
        }
        break;
      case Role.VENOM_WOLF:
        if (action === 'werewolf_kill' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        if (action === 'venom' && targetId) {
          game.nightActions.venomWolfTarget = targetId;
        }
        if (action !== 'werewolf_kill' && action !== 'venom' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        break;
      case Role.LONE_WOLF:
        if (action === 'werewolf_kill' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        if (action === 'solo_kill' && targetId) {
          game.nightActions.loneWolfTarget = targetId;
        }
        if (action !== 'werewolf_kill' && action !== 'solo_kill' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        break;
      case Role.WEREWOLF_SEER:
        if (action === 'werewolf_kill' && targetId) {
          game.nightActions.werewolfVotes[playerId] = targetId;
        }
        if (action === 'seer_check' && targetId) {
          game.nightActions.werewolfSeerTarget = targetId;
        }
        // Fallback: if the client sends a generic action, treat as seer check only
        if (action !== 'werewolf_kill' && action !== 'seer_check' && targetId) {
          game.nightActions.werewolfSeerTarget = targetId;
        }
        break;
      case Role.SEER:
        if (targetId) game.nightActions.seerTarget = targetId;
        break;
      case Role.AURA_SEER:
        if (targetId) game.nightActions.auraSeerTarget = targetId;
        break;
      case Role.DOCTOR:
        if (targetId) game.nightActions.doctorTarget = targetId;
        break;
      case Role.WITCH:
        if (action === 'heal') game.nightActions.witchHeal = true;
        if (action === 'kill' && targetId) game.nightActions.witchKillTarget = targetId;
        break;
      case Role.BOMBER:
        if (targetId) game.nightActions.bomberTarget = targetId;
        break;
      case Role.BEAST_HUNTER:
        if (targetId) game.nightActions.beastHunterTrap = targetId;
        break;
      case Role.AVENGER:
        if (targetId) game.nightActions.avengerTarget = targetId;
        break;
      case Role.MEDIUM:
        if (targetId) game.nightActions.mediumRevive = targetId;
        break;
      // New roles
      case Role.BODYGUARD:
        if (targetId) game.nightActions.bodyguardTarget = targetId;
        break;
      case Role.SERIAL_KILLER:
        if (targetId) game.nightActions.serialKillerTarget = targetId;
        break;
      case Role.CUPID:
        if (action === 'link' && targetId) {
          // First target
          if (!game.nightActions.cupidTarget1) {
            game.nightActions.cupidTarget1 = targetId;
          } else {
            game.nightActions.cupidTarget2 = targetId;
          }
        }
        break;
      case Role.ARSONIST:
        if (action === 'douse' && targetId) game.nightActions.arsonistTarget = targetId;
        if (action === 'ignite') game.nightActions.arsonistIgnite = true;
        // Default to douse
        if (action !== 'douse' && action !== 'ignite' && targetId) {
          game.nightActions.arsonistTarget = targetId;
        }
        break;
      case Role.AMNESIAC:
        // Choose a dead player to copy role from
        if (targetId) game.nightActions.mediumRevive = targetId; // reuse field, handled differently
        break;
      case Role.DOPPELGANGER:
        // Choose target on first night
        if (targetId && game.round === 1) {
          const dp = game.players.find((p) => p.id === playerId);
          if (dp) {
            dp.doppelgangerState = { targetId };
          }
        }
        break;
      case Role.APPRENTICE_SEER:
        // Only acts as seer if activated
        if (player.apprenticeSeerState?.isActivated && targetId) {
          game.nightActions.seerTarget = targetId;
        }
        break;
    }

    await this.saveGame(game);
  }

  async recordVote(gameId: string, playerId: string, targetId: string): Promise<Record<string, string> | null> {
    const game = await this.getGame(gameId);
    if (!game || game.phase !== GamePhase.VOTE) return null;

    const player = game.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) return null;

    if (!game.nightActions.werewolfVotes) {
      game.nightActions.werewolfVotes = {};
    }
    // Reuse werewolfVotes field for day votes (it's reset each phase)
    // Actually, let's use a separate field. Store votes in a dedicated key.
    const votesKey = `game:${gameId}:votes`;
    await this.redis.hset(votesKey, playerId, targetId);
    await this.redis.expire(votesKey, GAME_TTL);

    return this.redis.hgetall(votesKey);
  }

  async getVotes(gameId: string): Promise<Record<string, string>> {
    return this.redis.hgetall(`game:${gameId}:votes`);
  }

  async clearVotes(gameId: string): Promise<void> {
    await this.redis.del(`game:${gameId}:votes`);
  }

  async saveGameRecord(game: GameState, winCondition: WinCondition, winningTeam: Team): Promise<void> {
    const record = this.gameRecordRepo.create({
      roomCode: game.roomCode,
      players: game.players.map((p) => ({
        userId: p.id,
        username: p.username,
        role: p.role,
        team: p.team,
        isWinner: p.team === winningTeam,
      })),
      winningTeam,
      rounds: game.round,
      duration: Math.floor((Date.now() - game.startedAt) / 1000),
    });
    await this.gameRecordRepo.save(record);
  }
}

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}
