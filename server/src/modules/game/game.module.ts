import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameEngine } from './game.engine';
import { GameGateway } from './game.gateway';
import { BotService } from './bot.service';
import { RoomsModule } from '../rooms/rooms.module';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';
import { GameRecord } from '../../database/entities/game-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameRecord]),
    RoomsModule,
    ChatModule,
    UsersModule,
  ],
  providers: [GameService, GameEngine, GameGateway, BotService],
})
export class GameModule {}
