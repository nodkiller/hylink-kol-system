import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('media_benchmarks')
export class MediaBenchmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Optional link to a specific campaign — null means "general benchmark" */
  @Column({ name: 'campaign_id', nullable: true, type: 'uuid' })
  campaignId: string | null;

  /** Channel label: 'SEM' | 'Meta' | 'Display' | 'WeChat' | 'Other' */
  @Column({ length: 50 })
  channel: string;

  /** Free-text period label shown on the dashboard, e.g. "Q1 2025" */
  @Column({ name: 'period_label', length: 100, nullable: true })
  periodLabel: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  spend: number;

  @Column({ type: 'int', default: 0 })
  leads: number;

  @Column({ name: 'test_drives', type: 'int', default: 0 })
  testDrives: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
