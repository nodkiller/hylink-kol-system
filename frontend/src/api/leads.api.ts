import apiClient from './client';
import type { Lead, LeadStatus, LeadStats } from '@/types';

export const leadsApi = {
  /** Get all leads for a specific campaign KOL */
  getByKol: (campaignKolId: string) =>
    apiClient.get<Lead[]>('/leads', { params: { campaignKolId } }).then(r => r.data),

  /** Get lead stats grouped by KOL for an entire campaign */
  getStatsByCampaign: (campaignId: string) =>
    apiClient.get<Record<string, LeadStats>>('/leads/stats', { params: { campaignId } }).then(r => r.data),

  /** Update a lead's status or notes */
  update: (leadId: string, payload: { status?: LeadStatus; notes?: string }) =>
    apiClient.patch<Lead>(`/leads/${leadId}`, payload).then(r => r.data),
};
