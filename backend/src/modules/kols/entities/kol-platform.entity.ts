import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PlatformName } from '../../../common/enums';
import { Kol } from './kol.entity';

@Entity('kol_platforms')
@Unique(['kolId', 'platformName']) // Each KOL can only have one account per platform
export class KolPlatform {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kol_id' })
  kolId: string;

  @ManyToOne(() => Kol, (kol) => kol.platforms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'kol_id' })
  kol: Kol;

  @Column({
    name: 'platform_name',
    type: 'enum',
    enum: PlatformName,
  })
  platformName: PlatformName;

  @Column({ length: 200 })
  handle: string;

  @Column({ name: 'profile_url', type: 'text', nullable: true })
  profileUrl: string;

  @Column({ name: 'followers_count', type: 'integer', nullable: true })
  followersCount: number;

  // Stored as decimal 0.0000–1.0000 (e.g. 0.0356 = 3.56%)
  @Column({
    name: 'avg_engagement_rate',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  avgEngagementRate: number;

  // Reserved for future third-party API sync (e.g. HypeAuditor)
  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date;
}
