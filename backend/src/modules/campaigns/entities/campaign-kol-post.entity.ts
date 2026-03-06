import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PostContentType, PostSentiment } from '../../../common/enums';
import { CampaignKol } from './campaign-kol.entity';

@Entity('campaign_kol_posts')
export class CampaignKolPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_kol_id' })
  campaignKolId: string;

  @ManyToOne(() => CampaignKol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_kol_id' })
  campaignKol: CampaignKol;

  // ── Content identification ──────────────────────────────────────────────────

  @Column({ name: 'post_url', type: 'text' })
  postUrl: string;

  @Column({ name: 'content_type', type: 'enum', enum: PostContentType })
  contentType: PostContentType;

  @Column({ name: 'published_at', type: 'timestamptz', default: () => 'NOW()' })
  publishedAt: Date;

  // ── Engagement metrics ──────────────────────────────────────────────────────

  @Column({ name: 'views', type: 'integer', nullable: true })
  views: number | null;

  @Column({ name: 'likes', type: 'integer', nullable: true })
  likes: number | null;

  @Column({ name: 'comments', type: 'integer', nullable: true })
  comments: number | null;

  @Column({ name: 'shares', type: 'integer', nullable: true })
  shares: number | null;

  @Column({ name: 'saves', type: 'integer', nullable: true })
  saves: number | null;

  @Column({ name: 'reach', type: 'integer', nullable: true })
  reach: number | null;

  @Column({ name: 'impressions', type: 'integer', nullable: true })
  impressions: number | null;

  /** Click-through rate, stored as 0–1 (e.g. 0.0523 = 5.23%) */
  @Column({
    name: 'ctr',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  ctr: number | null;

  // ── Business outcome metrics ────────────────────────────────────────────────

  /** Revenue directly attributed to this post (AUD) */
  @Column({
    name: 'attributed_sales',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  attributedSales: number | null;

  // ── Qualitative ─────────────────────────────────────────────────────────────

  @Column({
    name: 'sentiment',
    type: 'enum',
    enum: PostSentiment,
    nullable: true,
  })
  sentiment: PostSentiment | null;

  /** Number of content revision rounds before final approval */
  @Column({ name: 'revision_rounds', type: 'integer', default: 0 })
  revisionRounds: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
