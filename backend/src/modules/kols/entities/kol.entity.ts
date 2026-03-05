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
import { KolTier } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';
import { KolPlatform } from './kol-platform.entity';

@Entity('kols')
export class Kol {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ length: 100, default: 'Australia' })
  country: string;

  @Column({ length: 100, nullable: true })
  city: string;

  @Column({ name: 'ethnicity_background', length: 100, nullable: true })
  ethnicityBackground: string;

  @Column({ name: 'primary_language', length: 50, nullable: true })
  primaryLanguage: string;

  @Column({
    name: 'content_tags',
    type: 'text',
    array: true,
    default: '{}',
  })
  contentTags: string[];

  @Column({
    name: 'kol_tier',
    type: 'enum',
    enum: KolTier,
    nullable: true,
  })
  kolTier: KolTier;

  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail: string;

  @Column({ name: 'talent_agency_name', length: 200, nullable: true })
  talentAgencyName: string;

  @Column({ name: 'talent_agency_contact', length: 200, nullable: true })
  talentAgencyContact: string;

  // { "instagram_post": 1500, "tiktok_video": 2000, "currency": "AUD" }
  @Column({ name: 'rate_card', type: 'jsonb', default: '{}' })
  rateCard: Record<string, any>;

  // { "age_range": "18-34", "top_cities": [...], "gender_split": {...} }
  @Column({ name: 'audience_demographics', type: 'jsonb', default: '{}' })
  audienceDemographics: Record<string, any>;

  @Column({ name: 'agency_internal_notes', type: 'text', nullable: true })
  agencyInternalNotes: string;

  @Column({
    name: 'collaboration_rating',
    type: 'decimal',
    precision: 2,
    scale: 1,
    nullable: true,
  })
  collaborationRating: number;

  @Column({ name: 'is_blacklisted', default: false })
  isBlacklisted: boolean;

  // ─── Relations ──────────────────────────────────────────────────

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @OneToMany(() => KolPlatform, (platform) => platform.kol, {
    cascade: true,
    eager: false,
  })
  platforms: KolPlatform[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
