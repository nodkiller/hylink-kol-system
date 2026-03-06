import apiClient from './client';
import type { CampaignKolStatus, CampaignKolPost, PostContentType, PostSentiment } from '@/types';

export interface Campaign {
  id: string;
  name: string;
  clientName: string;
  status: string;
  startDate?: string;
  endDate?: string;
  briefDocumentUrl?: string;
  clientPortalPassword?: string;
  createdBy?: { id: string; fullName: string };
  kolCount?: number;
  kolStatusSummary?: Record<string, number>;
  kolTotal?: number;
  // Financial fields
  budget?: number;
  clientBilling?: number;
  otherExpenses?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignKolRecord {
  id: string;
  campaignId: string;
  kolId: string;
  status: CampaignKolStatus;
  negotiatedFee?: number;
  deliverables: Record<string, unknown>;
  publishedUrls: string[];
  performanceData: Record<string, unknown>;
  notes?: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string };
  isPaid: boolean;
  invoiceRef?: string;
  clientFeedback?: string;
  clientComment?: string;
  statusUpdatedAt: string;
  createdAt: string;
  kol: {
    id: string; name: string; nickname?: string; avatarUrl?: string;
    city?: string; country: string; kolTier?: string; contentTags: string[];
    collaborationRating?: number; isBlacklisted: boolean;
    platforms: { platformName: string; handle: string; followersCount?: number; avgEngagementRate?: number }[];
  };
}

function clean(p: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== '' && v !== null));
}

export const campaignsApi = {
  list: (params?: { status?: string; clientName?: string; name?: string; page?: number; limit?: number }) =>
    apiClient.get('/campaigns', { params: params ? clean(params as Record<string, unknown>) : undefined }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<Campaign>(`/campaigns/${id}`).then(r => r.data),

  create: (payload: Omit<Campaign, 'id' | 'createdBy' | 'kolCount' | 'kolStatusSummary' | 'kolTotal' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<Campaign>('/campaigns', payload).then(r => r.data),

  update: (id: string, payload: Partial<Campaign>) =>
    apiClient.patch<Campaign>(`/campaigns/${id}`, payload).then(r => r.data),

  updatePortal: (id: string, password: string | null) =>
    apiClient.patch<Campaign>(`/campaigns/${id}/portal`, { password }).then(r => r.data),

  // Campaign-KOL workflow
  addKols: (campaignId: string, kolIds: string[]) =>
    apiClient.post(`/campaigns/${campaignId}/kols`, { kolIds }).then(r => r.data),

  getCampaignKols: (campaignId: string, status?: CampaignKolStatus) =>
    apiClient.get<CampaignKolRecord[]>(`/campaigns/${campaignId}/kols`, {
      params: status ? { status } : undefined,
    }).then(r => r.data),

  updateCampaignKol: (campaignId: string, kolId: string, payload: {
    status?: CampaignKolStatus;
    negotiatedFee?: number;
    deliverables?: Record<string, unknown>;
    publishedUrls?: string[];
    performanceData?: Record<string, unknown>;
    assignedToId?: string;
    notes?: string;
    isPaid?: boolean;
    invoiceRef?: string;
  }) =>
    apiClient.patch<CampaignKolRecord>(`/campaigns/${campaignId}/kols/${kolId}`, payload).then(r => r.data),

  // ── Post Results ────────────────────────────────────────────────────────────

  getPosts: (campaignId: string, kolId: string) =>
    apiClient.get<CampaignKolPost[]>(`/campaigns/${campaignId}/kols/${kolId}/posts`).then(r => r.data),

  createPost: (campaignId: string, kolId: string, payload: {
    postUrl: string;
    platform: string;
    contentType: PostContentType;
    postedAt?: string;
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    clicks?: number;
    conversions?: number;
    attributedSales?: number;
    emv?: number;
    sentiment?: PostSentiment;
    notes?: string;
  }) =>
    apiClient.post<CampaignKolPost>(`/campaigns/${campaignId}/kols/${kolId}/posts`, payload).then(r => r.data),

  updatePost: (campaignId: string, kolId: string, postId: string, payload: Partial<{
    postUrl: string;
    platform: string;
    contentType: PostContentType;
    postedAt: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    clicks: number;
    conversions: number;
    attributedSales: number;
    emv: number;
    sentiment: PostSentiment;
    notes: string;
  }>) =>
    apiClient.patch<CampaignKolPost>(`/campaigns/${campaignId}/kols/${kolId}/posts/${postId}`, payload).then(r => r.data),

  deletePost: (campaignId: string, kolId: string, postId: string) =>
    apiClient.delete(`/campaigns/${campaignId}/kols/${kolId}/posts/${postId}`),
};
