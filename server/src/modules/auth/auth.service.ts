import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { GUEST_NAMES } from '@shared/constants/game-config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async guestLogin(customName?: string) {
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let username: string;
      if (customName && customName.trim().length >= 2) {
        username = customName.trim().slice(0, 20);
        // For custom names, add suffix on retry to avoid collision
        if (attempt > 0) {
          const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          username = `${username.slice(0, 15)}#${suffix}`;
        }
      } else {
        const guestName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
        const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        username = `${guestName}${suffix}`;
      }

      // Check if username already exists
      const existing = await this.userRepo.findOne({ where: { username } });
      if (existing) {
        continue; // Try again with different name
      }

      try {
        const user = this.userRepo.create({
          username,
          isGuest: true,
        });
        await this.userRepo.save(user);

        const tokens = this.generateTokens(user);
        return {
          ...tokens,
          user: { id: user.id, username: user.username },
        };
      } catch (error: any) {
        // Handle race condition: another request inserted the same username between our check and insert
        if (error?.code === '23505' || error?.message?.includes('duplicate')) {
          continue; // Retry with a different name
        }
        throw error;
      }
    }

    throw new ConflictException('Could not generate a unique username. Please try again.');
  }

  async register(username: string, email: string, password: string) {
    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === email ? 'Email already in use' : 'Username already taken',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      username,
      email,
      password: hashedPassword,
    });
    await this.userRepo.save(user);

    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      user: { id: user.id, username: user.username, email: user.email },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, username: user.username };
    return {
      token: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
