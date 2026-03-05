import apiClient from './client';
import type { CampaignKolRecord } from './campaigns.api';

/** Portal requests attach the password as a header, not a JWT Bearer token. */
function portalHeaders(password: string) {
  return { 'x-portal-password': password };
}

export const portalApi = {
  verify: (campaignId: string, password: string) =>
    apiClient
      .post<{ verified: true; campaignName: string }>(
        `/portal/campaigns/${campaignId}/verify`,
        { password },
      )
      .then(r => r.data),

  getShortlist: (campaignId: string, password: string) =>
    apiClient
      .get<CampaignKolRecord[]>(`/portal/campaigns/${campaignId}/shortlist`, {
        headers: portalHeaders(password),
      })
      .then(r => r.data),

  submitFeedback: (
    campaignId: string,
    kolId: string,
    password: string,
    payload: { clientFeedback: 'Approved' | 'Rejected'; clientComment?: string },
  ) =>
    apiClient
      .post(`/portal/campaigns/${campaignId}/kols/${kolId}/feedback`, payload, {
        headers: portalHeaders(password),
      })
      .then(r => r.data),
};
