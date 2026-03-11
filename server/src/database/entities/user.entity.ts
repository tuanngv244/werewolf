import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  isGuest: boolean;

  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  gamesWon: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
