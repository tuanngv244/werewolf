import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { RoomState, RoomPlayer, RoomSettings, RoomStatus } from '@shared/types/room.types';
import { DEFAULT_TIMERS } from '@shared/constants/game-config';
import { v4 as uuid } from 'uuid';

const ROOM_TTL = 3600; // 1 hour

@Injectable()
export class RoomsService {
  constructor(private readonly redis: RedisService) {}

  async createRoom(host: { id: string; username: string }, settings: Partial<RoomSettings>): Promise<RoomState> {
    const code = this.generateCode();
    const room: RoomState = {
      id: uuid(),
      code,
      hostId: host.id,
      status: RoomStatus.WAITING,
      players: [
        {
          id: host.id,
          username: host.username,
          isReady: false,
          isHost: true,
          isConnected: true,
        },
      ],
      settings: {
        maxPlayers: settings.maxPlayers || 8,
        isPrivate: settings.isPrivate || false,
        roles: settings.roles || [],
        timers: settings.timers || DEFAULT_TIMERS,
      },
    };

    await this.redis.setJson(`room:${code}`, room, ROOM_TTL);
    await this.redis.hset('rooms:index', code, room.id);
    return room;
  }

  async getRoom(code: string): Promise<RoomState | null> {
    return this.redis.getJson<RoomState>(`room:${code}`);
  }

  async updateRoom(code: string, room: RoomState): Promise<void> {
    await this.redis.setJson(`room:${code}`, room, ROOM_TTL);
  }

  async deleteRoom(code: string): Promise<void> {
    await this.redis.del(`room:${code}`);
    await this.redis.hdel('rooms:index', code);
  }

  async joinRoom(code: string, player: { id: string; username: string }): Promise<RoomState | null> {
    const room = await this.getRoom(code);
    if (!room) return null;
    if (room.status !== RoomStatus.WAITING) return null;

    const existing = room.players.find((p) => p.id === player.id);
    if (existing) {
      // Player already in room — update username in case it changed (re-login)
      existing.username = player.username;
      existing.isConnected = true;
      await this.updateRoom(code, room);
      return room;
    }

    if (room.players.length >= room.settings.maxPlayers) return null;

    room.players.push({
      id: player.id,
      username: player.username,
      isReady: false,
      isHost: false,
      isConnected: true,
    });

    await this.updateRoom(code, room);
    return room;
  }

  async leaveRoom(code: string, playerId: string): Promise<RoomState | null> {
    const room = await this.getRoom(code);
    if (!room) return null;

    room.players = room.players.filter((p) => p.id !== playerId);

    if (room.players.length === 0) {
      await this.deleteRoom(code);
      return null;
    }

    // Transfer host
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
    }

    await this.updateRoom(code, room);
    return room;
  }

  async listRooms(): Promise<RoomState[]> {
    const index = await this.redis.hgetall('rooms:index');
    const rooms: RoomState[] = [];

    for (const code of Object.keys(index)) {
      const room = await this.getRoom(code);
      if (room && room.status === RoomStatus.WAITING && !room.settings.isPrivate) {
        rooms.push(room);
      }
    }

    return rooms;
  }

  async setPlayerRoom(playerId: string, code: string | null): Promise<void> {
    if (code) {
      await this.redis.set(`player:${playerId}:room`, code, ROOM_TTL);
    } else {
      await this.redis.del(`player:${playerId}:room`);
    }
  }

  async getPlayerRoom(playerId: string): Promise<string | null> {
    return this.redis.get(`player:${playerId}:room`);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
