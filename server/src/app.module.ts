import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GameModule } from './modules/game/game.module';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './common/redis/redis.module';
import { User } from './database/entities/user.entity';
import { GameRecord } from './database/entities/game-record.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/werewolf',
      entities: [User, GameRecord],
      synchronize: true, // TODO: Replace with migrations before scaling to production
      logging: process.env.NODE_ENV === 'development',
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '24h' },
    }),
    RedisModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    GameModule,
    ChatModule,
  ],
})
export class AppModule {}
