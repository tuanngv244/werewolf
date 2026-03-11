import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GameService } from './game.service';
import { BotService } from './bot.service';
import { RoomsService } from '../rooms/rooms.service';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../users/users.service';
import { GamePhase, Role, DeathCause } from '@shared/types/game.types';
import { RoomStatus } from '@shared/types/room.types';
import { isWerewolfRole } from '@shared/constants/roles';
import { DEFAULT_ROLES } from '@shared/constants/game-config';

interface AuthenticatedSocket extends Socket {
  user: { id: string; username: string };
}

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      // In development, allow all origins for LAN play
      callback(null, true);
    },
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private phaseTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly gameService: GameService,
    private readonly botService: BotService,
    private readonly roomsService: RoomsService,
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake?.auth?.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.user = { id: payload.sub, username: payload.username };

      // Rejoin room if player was in one
      const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
      if (roomCode) {
        client.join(`room:${roomCode}`);
      }
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user) return;
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (roomCode) {
      this.server.to(`room:${roomCode}`).emit('room:player_disconnected', {
        playerId: client.user.id,
      });
    }
  }

  // ─── Room Events ────────────────────────────────

  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { maxPlayers?: number; isPrivate?: boolean; roles?: string[] },
  ) {
    const room = await this.roomsService.createRoom(client.user, {
      maxPlayers: data.maxPlayers,
      isPrivate: data.isPrivate,
      roles: data.roles as any,
    });

    await this.roomsService.setPlayerRoom(client.user.id, room.code);
    client.join(`room:${room.code}`);
    client.emit('room:created', room);
  }

  @SubscribeMessage('room:create_demo')
  async handleCreateDemoRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { playerCount?: number },
  ) {
    const playerCount = Math.min(Math.max(data?.playerCount || 8, 6), 16);
    const roles = DEFAULT_ROLES[playerCount as keyof typeof DEFAULT_ROLES] || DEFAULT_ROLES[8];

    // Create room with the host
    const room = await this.roomsService.createRoom(client.user, {
      maxPlayers: playerCount,
      isPrivate: true,
      roles: roles as any,
    });

    // Use faster timers for demo mode
    room.settings.timers = { night: 15, day: 30, vote: 15, lastWords: 8 };

    // Add bot players to fill the room
    const botsNeeded = playerCount - 1; // -1 for the host
    const bots = this.botService.generateBotPlayers(botsNeeded);
    for (const bot of bots) {
      room.players.push(bot);
    }

    await this.roomsService.updateRoom(room.code, room);
    await this.roomsService.setPlayerRoom(client.user.id, room.code);
    client.join(`room:${room.code}`);

    // Auto-start the game immediately
    room.status = RoomStatus.IN_GAME;
    await this.roomsService.updateRoom(room.code, room);

    const game = await this.gameService.createGame(room);

    // Send game started
    client.emit('game:started', {
      gameId: game.id,
      phase: game.phase,
      players: game.players.map((p) => ({
        id: p.id,
        username: p.username,
        isAlive: true,
        isConnected: true,
      })),
      timers: game.timers,
      phaseEndAt: game.phaseEndAt,
    });

    // Send role assignment to the real player
    const player = game.players.find((p) => p.id === client.user.id);
    if (player) {
      client.emit('game:role_assigned', {
        role: player.role,
        team: player.team,
        ...(player.headhunterState ? { headhunterTarget: player.headhunterState.targetId } : {}),
      });

      if (isWerewolfRole(player.role)) {
        const wolfIds = game.players
          .filter((p) => isWerewolfRole(p.role))
          .map((p) => ({ id: p.id, username: p.username, role: p.role }));
        client.emit('game:werewolf_team', { wolves: wolfIds });
      }
    }

    // Start phase timer — bots will auto-act via BotService
    this.startPhaseTimer(game.id, game.phaseEndAt);
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { code: string },
  ) {
    const room = await this.roomsService.joinRoom(data.code, client.user);
    if (!room) {
      client.emit('room:error', { message: 'Room not found or cannot join' });
      return;
    }

    await this.roomsService.setPlayerRoom(client.user.id, data.code);
    client.join(`room:${data.code}`);
    client.emit('room:state', room);
    this.server.to(`room:${data.code}`).emit('room:player_joined', {
      id: client.user.id,
      username: client.user.username,
      isReady: false,
      isHost: false,
      isConnected: true,
    });
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    const room = await this.roomsService.leaveRoom(roomCode, client.user.id);
    await this.roomsService.setPlayerRoom(client.user.id, null);
    client.leave(`room:${roomCode}`);

    if (room) {
      this.server.to(`room:${roomCode}`).emit('room:player_left', {
        playerId: client.user.id,
      });
      this.server.to(`room:${roomCode}`).emit('room:state', room);
    }
  }

  @SubscribeMessage('room:list')
  async handleListRooms(@ConnectedSocket() client: AuthenticatedSocket) {
    const rooms = await this.roomsService.listRooms();
    const list = rooms.map((r) => ({
      id: r.id,
      code: r.code,
      hostName: r.players.find((p) => p.id === r.hostId)?.username || 'Unknown',
      playerCount: r.players.length,
      maxPlayers: r.settings.maxPlayers,
      status: r.status,
    }));
    client.emit('room:list', list);
  }

  @SubscribeMessage('room:settings')
  async handleUpdateSettings(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { maxPlayers?: number; roles?: string[]; timers?: Record<string, number> },
  ) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    const room = await this.roomsService.getRoom(roomCode);
    if (!room || room.hostId !== client.user.id) return;

    if (data.maxPlayers) room.settings.maxPlayers = data.maxPlayers;
    if (data.roles) room.settings.roles = data.roles as any;
    if (data.timers) room.settings.timers = { ...room.settings.timers, ...data.timers };

    await this.roomsService.updateRoom(roomCode, room);
    this.server.to(`room:${roomCode}`).emit('room:settings_updated', room.settings);
  }

  // ─── Game Events ────────────────────────────────

  @SubscribeMessage('game:start')
  async handleStartGame(@ConnectedSocket() client: AuthenticatedSocket) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    const room = await this.roomsService.getRoom(roomCode);
    if (!room || room.hostId !== client.user.id) return;
    if (room.players.length < 6) {
      client.emit('room:error', { message: 'Need at least 6 players' });
      return;
    }

    // Create game
    room.status = RoomStatus.IN_GAME;

    // Ensure roles are configured — fallback to DEFAULT_ROLES based on player count
    if (!room.settings.roles || room.settings.roles.length === 0) {
      const playerCount = room.players.length;
      room.settings.roles = DEFAULT_ROLES[playerCount as keyof typeof DEFAULT_ROLES]
        || DEFAULT_ROLES[8 as keyof typeof DEFAULT_ROLES]
        || [];
    }

    await this.roomsService.updateRoom(roomCode, room);

    const game = await this.gameService.createGame(room);

    // Send game started to all players
    this.server.to(`room:${roomCode}`).emit('game:started', {
      gameId: game.id,
      phase: game.phase,
      players: game.players.map((p) => ({
        id: p.id,
        username: p.username,
        isAlive: true,
        isConnected: true,
      })),
      timers: game.timers,
      phaseEndAt: game.phaseEndAt,
    });

    // Send individual role assignments
    const sockets = await this.server.in(`room:${roomCode}`).fetchSockets();
    for (const socket of sockets) {
      const authSocket = socket as unknown as AuthenticatedSocket;
      const player = game.players.find((p) => p.id === authSocket.user?.id);
      if (player) {
        socket.emit('game:role_assigned', {
          role: player.role,
          team: player.team,
          // Send extra info for specific roles
          ...(player.headhunterState ? { headhunterTarget: player.headhunterState.targetId } : {}),
        });

        // Tell werewolves who the other wolves are
        if (isWerewolfRole(player.role)) {
          const wolfIds = game.players
            .filter((p) => isWerewolfRole(p.role))
            .map((p) => ({ id: p.id, username: p.username, role: p.role }));
          socket.emit('game:werewolf_team', { wolves: wolfIds });
        }
      }
    }

    // Start phase timer
    this.startPhaseTimer(game.id, game.phaseEndAt);
  }

  @SubscribeMessage('game:night_action')
  async handleNightAction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { gameId: string; action: string; targetId?: string },
  ) {
    await this.gameService.recordNightAction(
      data.gameId,
      client.user.id,
      data.action,
      data.targetId,
    );
    client.emit('game:action_confirmed', { action: data.action });
  }

  @SubscribeMessage('game:vote')
  async handleVote(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { gameId: string; targetId: string },
  ) {
    const votes = await this.gameService.recordVote(data.gameId, client.user.id, data.targetId);
    if (votes) {
      const game = await this.gameService.getGame(data.gameId);
      if (game) {
        this.server.to(`room:${game.roomCode}`).emit('game:vote_update', {
          votes,
        });
      }
    }
  }

  @SubscribeMessage('game:shaman_curse')
  async handleShamanCurse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { gameId: string; targetId: string },
  ) {
    const game = await this.gameService.getGame(data.gameId);
    if (!game || game.phase !== GamePhase.DAY) return;

    const shaman = game.players.find((p) => p.id === client.user.id);
    if (!shaman || shaman.role !== Role.WEREWOLF_SHAMAN || !shaman.isAlive) return;

    const target = game.players.find((p) => p.id === data.targetId);
    if (target && target.isAlive) {
      // Clear previous curse
      for (const p of game.players) {
        p.cursedByShaman = false;
      }
      target.cursedByShaman = true;
      await this.gameService.saveGame(game);
      client.emit('game:action_confirmed', { action: 'shaman_curse' });
    }
  }

  @SubscribeMessage('game:gunner_shoot')
  async handleGunnerShoot(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { gameId: string; targetId: string },
  ) {
    const game = await this.gameService.getGame(data.gameId);
    if (!game || game.phase !== GamePhase.DAY) return;

    const gunner = game.players.find((p) => p.id === client.user.id);
    if (!gunner || !gunner.isAlive || gunner.role !== Role.GUNNER || !gunner.gunnerState || gunner.gunnerState.bullets <= 0) return;

    gunner.gunnerState.bullets--;
    const target = game.players.find((p) => p.id === data.targetId);
    if (target && target.isAlive) {
      target.isAlive = false;
      target.deathCause = DeathCause.GUNNER_SHOT;
      target.deathRound = game.round;

      await this.gameService.saveGame(game);

      this.server.to(`room:${game.roomCode}`).emit('game:gunner_shot', {
        shooterId: client.user.id,
        targetId: data.targetId,
        targetRole: target.role,
      });
    }
  }

  // ─── Chat Events ────────────────────────────────

  @SubscribeMessage('chat:send')
  async handleChat(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { channel: 'DAY' | 'WEREWOLF' | 'DEAD'; content: string },
  ) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    const message = this.chatService.createMessage(
      data.channel,
      client.user.id,
      client.user.username,
      data.content,
    );

    if (data.channel === 'WEREWOLF') {
      // Only send to werewolf players in this room
      const game = await this.gameService.getGameByRoom(roomCode);
      if (!game) return;

      const wolfIds = new Set(
        game.players.filter((p) => isWerewolfRole(p.role) && p.isAlive).map((p) => p.id),
      );
      // Verify sender is a wolf
      if (!wolfIds.has(client.user.id)) return;

      const sockets = await this.server.in(`room:${roomCode}`).fetchSockets();
      for (const s of sockets) {
        const authSocket = s as unknown as AuthenticatedSocket;
        if (authSocket.user && wolfIds.has(authSocket.user.id)) {
          s.emit('chat:message', message);
        }
      }
    } else if (data.channel === 'DEAD') {
      // Only send to dead players in this room
      const game = await this.gameService.getGameByRoom(roomCode);
      if (!game) return;

      const deadIds = new Set(
        game.players.filter((p) => !p.isAlive).map((p) => p.id),
      );
      // Verify sender is dead
      if (!deadIds.has(client.user.id)) return;

      const sockets = await this.server.in(`room:${roomCode}`).fetchSockets();
      for (const s of sockets) {
        const authSocket = s as unknown as AuthenticatedSocket;
        if (authSocket.user && deadIds.has(authSocket.user.id)) {
          s.emit('chat:message', message);
        }
      }
    } else {
      // DAY channel — only alive players can send
      const game = await this.gameService.getGameByRoom(roomCode);
      if (game) {
        const sender = game.players.find((p) => p.id === client.user.id);
        if (sender && !sender.isAlive) return; // Dead players cannot chat in DAY channel
      }
      this.server.to(`room:${roomCode}`).emit('chat:message', message);
    }
  }

  // ─── Fun: Slap/Attack (purely cosmetic) ────────────────────────
  @SubscribeMessage('fun:slap')
  async handleSlap(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetId: string },
  ) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    // Relay to everyone in the room (including sender for confirmation)
    this.server.to(`room:${roomCode}`).emit('fun:slapped', {
      attackerId: client.user.id,
      targetId: data.targetId,
    });
  }

  // ─── Voice Chat Signaling (WebRTC) ────────────────────────────

  @SubscribeMessage('voice:join')
  async handleVoiceJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomCode: string },
  ) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    // Notify everyone else in the room that a new voice peer joined
    client.to(`room:${roomCode}`).emit('voice:joined', {
      userId: client.user.id,
    });
  }

  @SubscribeMessage('voice:leave')
  async handleVoiceLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomCode: string },
  ) {
    const roomCode = await this.roomsService.getPlayerRoom(client.user.id);
    if (!roomCode) return;

    client.to(`room:${roomCode}`).emit('voice:left', {
      userId: client.user.id,
    });
  }

  @SubscribeMessage('voice:offer')
  async handleVoiceOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetId: string; sdp: any },
  ) {
    // Relay the SDP offer to the target peer
    const sockets = await this.server.fetchSockets();
    const target = sockets.find(
      (s) => (s as unknown as AuthenticatedSocket).user?.id === data.targetId,
    );
    if (target) {
      target.emit('voice:offer', {
        fromId: client.user.id,
        sdp: data.sdp,
      });
    }
  }

  @SubscribeMessage('voice:answer')
  async handleVoiceAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetId: string; sdp: any },
  ) {
    // Relay the SDP answer to the target peer
    const sockets = await this.server.fetchSockets();
    const target = sockets.find(
      (s) => (s as unknown as AuthenticatedSocket).user?.id === data.targetId,
    );
    if (target) {
      target.emit('voice:answer', {
        fromId: client.user.id,
        sdp: data.sdp,
      });
    }
  }

  @SubscribeMessage('voice:ice-candidate')
  async handleVoiceIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetId: string; candidate: any },
  ) {
    // Relay ICE candidate to the target peer
    const sockets = await this.server.fetchSockets();
    const target = sockets.find(
      (s) => (s as unknown as AuthenticatedSocket).user?.id === data.targetId,
    );
    if (target) {
      target.emit('voice:ice-candidate', {
        fromId: client.user.id,
        candidate: data.candidate,
      });
    }
  }

  // ─── Phase Timer ────────────────────────────────

  private startPhaseTimer(gameId: string, endAt: number) {
    // Clear existing timer
    const existing = this.phaseTimers.get(gameId);
    if (existing) clearTimeout(existing);

    const delay = Math.max(0, endAt - Date.now());
    const timer = setTimeout(async () => {
      await this.handlePhaseEnd(gameId);
    }, delay);

    this.phaseTimers.set(gameId, timer);
  }

  private async handlePhaseEnd(gameId: string) {
    const game = await this.gameService.getGame(gameId);
    if (!game || game.phase === GamePhase.GAME_OVER) {
      this.phaseTimers.delete(gameId);
      return;
    }

    // If vote phase ending, fetch votes and pass to advancePhase
    let votes: Record<string, string> | undefined;
    if (game.phase === GamePhase.VOTE) {
      votes = await this.gameService.getVotes(gameId);
      await this.gameService.clearVotes(gameId);
    }

    const { game: updatedGame, events } = await this.gameService.advancePhase(game, votes);

    // Broadcast events
    for (const event of events) {
      switch (event.type) {
        case 'phase_changed':
          this.server.to(`room:${game.roomCode}`).emit('game:phase_changed', {
            phase: event.phase,
            endAt: event.endAt,
            round: updatedGame.round,
          });
          // Trigger bot actions for the new phase
          this.botService.onPhaseChanged(gameId, event.phase as GamePhase);
          break;
        case 'dawn_result':
          this.server.to(`room:${game.roomCode}`).emit('game:dawn_result', {
            killed: event.killed,
            saved: event.saved,
            messages: event.messages,
          });
          break;
        case 'vote_result':
          this.server.to(`room:${game.roomCode}`).emit('game:vote_result', {
            eliminatedId: event.eliminatedId,
            voteCount: event.voteCount,
          });
          break;
        case 'seer_result': {
          // Send to seer OR activated apprentice seer
          const seer = updatedGame.players.find((p) => p.role === Role.SEER || (p.role === Role.APPRENTICE_SEER && p.apprenticeSeerState?.isActivated));
          if (seer) {
            const sockets = await this.server.in(`room:${game.roomCode}`).fetchSockets();
            const seerSocket = sockets.find(
              (s) => (s as unknown as AuthenticatedSocket).user?.id === seer.id,
            );
            if (seerSocket) {
              seerSocket.emit('game:seer_result', {
                targetId: event.targetId,
                role: event.role,
              });
            }
          }
          break;
        }
        case 'aura_seer_result': {
          const auraSeer = updatedGame.players.find((p) => p.role === Role.AURA_SEER);
          if (auraSeer) {
            const sockets = await this.server.in(`room:${game.roomCode}`).fetchSockets();
            const auraSeerSocket = sockets.find(
              (s) => (s as unknown as AuthenticatedSocket).user?.id === auraSeer.id,
            );
            if (auraSeerSocket) {
              auraSeerSocket.emit('game:aura_seer_result', {
                targetId: event.targetId,
                result: event.result,
              });
            }
          }
          break;
        }
        case 'werewolf_seer_result': {
          // Send to all werewolves
          const wolves = updatedGame.players.filter((p) => isWerewolfRole(p.role));
          const sockets = await this.server.in(`room:${game.roomCode}`).fetchSockets();
          for (const wolf of wolves) {
            const wolfSocket = sockets.find(
              (s) => (s as unknown as AuthenticatedSocket).user?.id === wolf.id,
            );
            if (wolfSocket) {
              wolfSocket.emit('game:werewolf_seer_result', {
                targetId: event.targetId,
                role: event.role,
              });
            }
          }
          break;
        }
        case 'game_over':
          this.server.to(`room:${game.roomCode}`).emit('game:over', {
            winCondition: event.winCondition,
            winningTeam: event.team,
            winners: event.playerIds,
            players: updatedGame.players,
          });

          // Update user stats (skip bots)
          for (const player of updatedGame.players) {
            if (this.botService.isBot(player.id)) continue;
            const isWinner = (event.playerIds as string[]).includes(player.id);
            await this.usersService.incrementStats(player.id, isWinner);
          }

          // Clean up bot timers
          this.botService.onGameEnd(gameId);

          // Reset room status back to WAITING
          const currentRoom = await this.roomsService.getRoom(game.roomCode);
          if (currentRoom) {
            currentRoom.status = RoomStatus.WAITING;
            await this.roomsService.updateRoom(game.roomCode, currentRoom);
          }

          this.phaseTimers.delete(gameId);
          return;
      }
    }

    // Set next phase timer
    if (updatedGame.phase !== GamePhase.GAME_OVER) {
      this.startPhaseTimer(gameId, updatedGame.phaseEndAt);
    }
  }
}
