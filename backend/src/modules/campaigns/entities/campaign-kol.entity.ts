import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignKolStatus, ClientFeedback } from '../../../common/enums';
import { Campaign } from './campaign.entity';
import { Kol } from '../../kols/entities/kol.entity';
import { User } from '../../users/entities/user.entity';

@Entity('campaign_kols')
@Unique(['campaignId', 'kolId']) // A KOL can only appear once per campaign
export class CampaignKol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Campaign, (c) => c.campaignKols, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'kol_id' })
  kolId: string;

  @ManyToOne(() => Kol, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'kol_id' })
  kol: Kol;

  @Column({
    type: 'enum',
    enum: CampaignKolStatus,
    default: CampaignKolStatus.SHORTLISTED,
  })
  status: CampaignKolStatus;

  // Final negotiated fee in AUD
  @Column({
    name: 'negotiated_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  negotiatedFee: number;

  // { "instagram_posts": 2, "stories": 3, "tiktok_videos": 1, "deadline": "2025-03-15" }
  @Column({ type: 'jsonb', default: '{}' })
  deliverables: Record<string, any>;

  // Array of live content URLs after publishing
  @Column({
    name: 'published_urls',
    type: 'text',
    array: true,
    default: '{}',
  })
  publishedUrls: string[];

  // { "total_reach": 85000, "total_impressions": 120000, "cpe": 0.48, ... }
  @Column({ name: 'performance_data', type: 'jsonb', default: '{}' })
  performanceData: Record<string, any>;

  // Internal KOL Manager responsible for this KOL's follow-up
  @Column({ name: 'assigned_to', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ── Payment tracking ───────────────────────────────────────────
  /** Whether we have paid this KOL their negotiated fee */
  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  /** Invoice or payment reference number for reconciliation */
  @Column({ name: 'invoice_ref', length: 100, nullable: true })
  invoiceRef: string;

  // ── Client portal feedback ─────────────────────────────────────
  @Column({
    name: 'client_feedback',
    type: 'enum',
    enum: ClientFeedback,
    nullable: true,
  })
  clientFeedback: ClientFeedback | null;

  @Column({ name: 'client_comment', type: 'text', nullable: true })
  clientComment: string | null;

  // Updated automatically on status change (via application layer)
  @Column({ name: 'status_updated_at', type: 'timestamptz', default: () => 'NOW()' })
  statusUpdatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
