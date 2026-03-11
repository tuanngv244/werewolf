import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('game_records')
export class GameRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomCode: string;

  @Column('jsonb')
  players: {
    userId: string;
    username: string;
    role: string;
    team: string;
    isWinner: boolean;
  }[];

  @Column()
  winningTeam: string;

  @Column()
  rounds: number;

  @Column()
  duration: number;

  @CreateDateColumn()
  createdAt: Date;
}
