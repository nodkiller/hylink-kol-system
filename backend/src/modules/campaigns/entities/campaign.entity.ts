import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignStatus } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { CampaignKol } from './campaign-kol.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'client_name', length: 200 })
  clientName: string;

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({ name: 'brief_document_url', type: 'text', nullable: true })
  briefDocumentUrl: string;

  // Plaintext password shared with client for the read-only portal view
  @Column({ name: 'client_portal_password', length: 100, nullable: true })
  clientPortalPassword: string;

  // ─── Financial Fields ────────────────────────────────────────────

  /** Client's approved budget for this campaign (AUD) */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budget: number;

  /** What we invoice the client — our total revenue for this campaign (AUD) */
  @Column({ name: 'client_billing', type: 'decimal', precision: 12, scale: 2, nullable: true })
  clientBilling: number;

  /** Non-KOL campaign costs: production, ad spend, tools, etc. (AUD) */
  @Column({ name: 'other_expenses', type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  otherExpenses: number;

  // ─── Relations ──────────────────────────────────────────────────

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => CampaignKol, (ck) => ck.campaign, { cascade: true })
  campaignKols: CampaignKol[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
