import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
    };
  }

  async incrementStats(userId: string, won: boolean) {
    await this.userRepo.increment({ id: userId }, 'gamesPlayed', 1);
    if (won) {
      await this.userRepo.increment({ id: userId }, 'gamesWon', 1);
    }
  }
}
