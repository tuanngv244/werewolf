import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
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
    let username: string;
    if (customName && customName.trim().length >= 2) {
      // Use the player's chosen name directly (no suffix for clean display)
      username = customName.trim().slice(0, 20);
    } else {
      const guestName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
      const suffix = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      username = `${guestName}${suffix}`;
    }

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
