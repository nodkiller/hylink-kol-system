import apiClient from './client';

// ─── ROI Types ─────────────────────────────────────────────────────────────────

export interface ROIChannel {
  channel: string;
  spend: number;
  leads: number;
  testDrives: number;
  conversions: number;
  cpl: number | null;
  testDriveRate: number | null;
  conversionRate: number | null;
}

export interface KolPerformanceRow {
  kolName: string;
  campaignName: string;
  trackingCode: string | null;
  spend: number;
  leads: number;
  testDrives: number;
  conversions: number;
  cpl: number | null;
  conversionRate: number | null;
}

export interface BenchmarkEntry {
  id: string;
  channel: string;
  periodLabel: string | null;
  campaignId: string | null;
  spend: number;
  leads: number;
  testDrives: number;
  conversions: number;
  notes: string | null;
  cpl: number | null;
  testDriveRate: number | null;
  conversionRate: number | null;
  createdAt: string;
}

export interface ROIStats {
  channels: ROIChannel[];
  topKols: KolPerformanceRow[];
  benchmarks: BenchmarkEntry[];
}

export interface CreateBenchmarkPayload {
  channel: string;
  periodLabel?: string;
  campaignId?: string;
  spend: number;
  leads: number;
  testDrives: number;
  conversions: number;
  notes?: string;
}

export interface CampaignPnl {
  id: string;
  name: string;
  clientName: string;
  status: string;
  revenue: number;
  kolCost: number;
  otherExpenses: number;
  kolCount: number;
  grossProfit: number;
  netProfit: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  kolCost: number;
  otherExpenses: number;
  netProfit: number;
}

export interface DashboardStats {
  // KOL counts
  totalKols: number;
  kolsThisMonth: number;
  // Campaign counts
  totalCampaigns: number;
  activeCampaigns: number;
  campaignsByStatus: Record<string, number>;
  pipelineByStatus: Record<string, number>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    clientName: string;
    status: string;
    kolCount: number;
  }>;
  // Financial P&L
  totalRevenue: number;
  totalKolCost: number;
  totalOtherExpenses: number;
  grossProfit: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
  unpaidKolCount: number;
  unpaidKolTotal: number;
  campaignPnl: CampaignPnl[];
  monthlyTrend: MonthlyTrend[];
}

export const reportingApi = {
  getDashboardStats: () =>
    apiClient.get<DashboardStats>('/reporting/dashboard').then((r) => r.data),

  getROIStats: () =>
    apiClient.get<ROIStats>('/reporting/roi').then((r) => r.data),

  createBenchmark: (payload: CreateBenchmarkPayload) =>
    apiClient.post('/reporting/benchmarks', payload).then((r) => r.data),

  deleteBenchmark: (id: string) =>
    apiClient.delete(`/reporting/benchmarks/${id}`),

  /** Downloads the campaign PDF and triggers a browser save-as dialog. */
  downloadCampaignReport: async (campaignId: string, campaignName: string) => {
    const response = await apiClient.get(`/reporting/campaign/${campaignId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${campaignName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
