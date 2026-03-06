// ─── Enums (mirrors backend) ───────────────────────────────────────────────────

export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNT_MANAGER = 'AccountManager',
  KOL_MANAGER = 'KOLManager',
}

export enum KolTier {
  NANO = 'Nano(<10k)',
  MICRO = 'Micro(10k-100k)',
  MID = 'Mid(100k-500k)',
  MACRO = 'Macro(500k-1M)',
  MEGA = 'Mega(>1M)',
}

export enum PlatformName {
  INSTAGRAM = 'Instagram',
  TIKTOK = 'TikTok',
  YOUTUBE = 'YouTube',
  XIAOHONGSHU = 'Xiaohongshu',
  WEIBO = 'Weibo',
}

export enum CampaignStatus {
  DRAFT = 'Draft',
  PLANNING = 'Planning',
  EXECUTING = 'Executing',
  COMPLETED = 'Completed',
}

export enum CampaignKolStatus {
  SHORTLISTED = 'Shortlisted',
  SUBMITTED_TO_CLIENT = 'Submitted_to_Client',
  APPROVED_BY_CLIENT = 'Approved_by_Client',
  REJECTED_BY_CLIENT = 'Rejected_by_Client',
  CONTACTED = 'Contacted',
  NEGOTIATING = 'Negotiating',
  CONTRACTED = 'Contracted',
  CONTENT_SUBMITTED = 'Content_Submitted',
  CONTENT_APPROVED = 'Content_Approved',
  PUBLISHED = 'Published',
  COMPLETED = 'Completed',
}

export enum PostContentType {
  STATIC_IMAGE = 'StaticImage',
  CAROUSEL = 'Carousel',
  REEL = 'Reel',
  STORY = 'Story',
  YOUTUBE_SHORT = 'YouTube_Short',
  YOUTUBE_VIDEO = 'YouTube_Video',
  TIKTOK_VIDEO = 'TikTok_Video',
  OTHER = 'Other',
}

export enum PostSentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
}

export interface CampaignKolPost {
  id: string;
  campaignKolId: string;
  postUrl: string;
  contentType: PostContentType;
  publishedAt: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  reach?: number;
  impressions?: number;
  /** Click-through rate as 0–1 decimal (e.g. 0.0523 = 5.23%) */
  ctr?: number;
  attributedSales?: number;
  sentiment?: PostSentiment;
  revisionRounds: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Entity Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface KolPlatform {
  id: string;
  kolId: string;
  platformName: PlatformName;
  handle: string;
  profileUrl?: string;
  followersCount?: number;
  avgEngagementRate?: number;
}

export interface Kol {
  id: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
  country: string;
  city?: string;
  ethnicityBackground?: string;
  primaryLanguage?: string;
  contentTags: string[];
  kolTier?: KolTier;
  contactEmail?: string;
  talentAgencyName?: string;
  talentAgencyContact?: string;
  rateCard: Record<string, unknown>;
  audienceDemographics: Record<string, unknown>;
  agencyInternalNotes?: string;
  collaborationRating?: number;
  isBlacklisted: boolean;
  platforms: KolPlatform[];
  createdBy?: Pick<User, 'id' | 'fullName'>;
  createdAt: string;
  updatedAt: string;
}

// ─── API Payload Types ─────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: Pick<User, 'id' | 'fullName' | 'email' | 'role'>;
}

export interface CreateKolPlatformPayload {
  platformName: PlatformName;
  handle: string;
  profileUrl?: string;
  followersCount?: number;
  avgEngagementRate?: number;
}

export interface CreateKolPayload {
  name: string;
  nickname?: string;
  avatarUrl?: string;
  country?: string;
  city?: string;
  ethnicityBackground?: string;
  primaryLanguage?: string;
  contentTags?: string[];
  kolTier?: KolTier;
  contactEmail?: string;
  talentAgencyName?: string;
  talentAgencyContact?: string;
  rateCard?: Record<string, unknown>;
  audienceDemographics?: Record<string, unknown>;
  agencyInternalNotes?: string;
  collaborationRating?: number;
  isBlacklisted?: boolean;
  platforms?: CreateKolPlatformPayload[];
}

export type UpdateKolPayload = Partial<CreateKolPayload>;

// ─── Query / Pagination Types ──────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface KolQueryParams {
  search?: string;
  platform?: PlatformName | '';
  minFollowers?: number | '';
  maxFollowers?: number | '';
  minEngagement?: number | '';
  maxEngagement?: number | '';
  city?: string;
  language?: string;
  tags?: string;
  tier?: KolTier | '';
  isBlacklisted?: boolean | '';
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'ASC' | 'DESC';
}
