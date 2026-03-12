import {
  Column, CreateDateColumn, Entity, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { LeadStatus } from '../../../common/enums';
import { CampaignKol } from '../../campaigns/entities/campaign-kol.entity';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_kol_id' })
  campaignKolId: string;

  @ManyToOne(() => CampaignKol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_kol_id' })
  campaignKol: CampaignKol;

  /** The tracking code used — redundant but useful for quick lookup */
  @Column({ name: 'tracking_code', length: 60 })
  trackingCode: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
