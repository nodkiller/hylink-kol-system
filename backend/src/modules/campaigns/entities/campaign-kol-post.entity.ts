import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { PostContentType, PostSentiment } from '../../../common/enums';
import { CampaignKol } from './campaign-kol.entity';

@Entity('campaign_kol_posts')
export class CampaignKolPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_kol_id' })
  campaignKolId: string;

  @ManyToOne(() => CampaignKol, (ck) => ck.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_kol_id' })
  campaignKol: CampaignKol;

  @Column({ name: 'post_url', type: 'text' })
  postUrl: string;

  @Column({ name: 'content_type', type: 'enum', enum: PostContentType })
  contentType: PostContentType;

  @Column({ name: 'published_at', type: 'timestamptz', default: () => 'NOW()' })
  publishedAt: Date;

  @Column({ type: 'integer', nullable: true }) views?: number;
  @Column({ type: 'integer', nullable: true }) likes?: number;
  @Column({ type: 'integer', nullable: true }) comments?: number;
  @Column({ type: 'integer', nullable: true }) shares?: number;
  @Column({ type: 'integer', nullable: true }) saves?: number;
  @Column({ type: 'integer', nullable: true }) reach?: number;
  @Column({ type: 'integer', nullable: true }) impressions?: number;
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) ctr?: number;

  @Column({ name: 'attributed_sales', type: 'decimal', precision: 10, scale: 2, nullable: true })
  attributedSales?: number;

  @Column({ type: 'enum', enum: PostSentiment, nullable: true })
  sentiment?: PostSentiment;

  @Column({ name: 'revision_rounds', type: 'integer', default: 0 })
  revisionRounds: number;

  @Column({ type: 'text', nullable: true }) notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
