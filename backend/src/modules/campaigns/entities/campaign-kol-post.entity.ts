import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlatformName, PostContentType, PostSentiment } from '../../../common/enums';
import { CampaignKol } from './campaign-kol.entity';

/**
 * Tracks per-post performance data for a KOL in a campaign.
 * This is the core "process data" layer — each published content piece gets
 * its own row so we can analyse content-type × platform × KOL effectiveness.
 */
@Entity('campaign_kol_posts')
export class CampaignKolPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // FK to campaign_kols (composite key: campaignId + kolId)
  @Column({ name: 'campaign_id' })
  campaignId: string;

  @Column({ name: 'kol_id' })
  kolId: string;

  @ManyToOne(() => CampaignKol, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'campaign_id', referencedColumnName: 'campaignId' },
    { name: 'kol_id', referencedColumnName: 'kolId' },
  ])
  campaignKol: CampaignKol;

  // ── Content identification ──────────────────────────────────────────────────

  @Column({ name: 'post_url', type: 'text' })
  postUrl: string;

  @Column({ name: 'platform', type: 'enum', enum: PlatformName })
  platform: PlatformName;

  @Column({ name: 'content_type', type: 'enum', enum: PostContentType })
  contentType: PostContentType;

  @Column({ name: 'posted_at', type: 'date', nullable: true })
  postedAt: string | null;

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

  @Column({ name: 'clicks', type: 'integer', nullable: true })
  clicks: number | null;

  @Column({ name: 'conversions', type: 'integer', nullable: true })
  conversions: number | null;

  // ── Business outcome metrics ────────────────────────────────────────────────

  /** Revenue directly attributed to this post (AUD) */
  @Column({
    name: 'attributed_sales',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  attributedSales: number | null;

  /**
   * Earned Media Value (AUD) — can be manually set or auto-calculated.
   * Formula hint: (views × $0.003) + (likes × $0.08) + (comments × $0.40)
   *             + (shares × $0.20) + (saves × $0.12)
   */
  @Column({
    name: 'emv',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  emv: number | null;

  // ── Qualitative ─────────────────────────────────────────────────────────────

  @Column({
    name: 'sentiment',
    type: 'enum',
    enum: PostSentiment,
    nullable: true,
  })
  sentiment: PostSentiment | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
