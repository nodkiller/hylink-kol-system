import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, type CampaignKolRecord } from '@/api/campaigns.api';
import { reportingApi } from '@/api/reporting.api';
import { Spinner } from '@/components/ui/Spinner';
import clsx from 'clsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={clsx('mt-2 text-2xl font-bold', color ?? 'text-gray-900')}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Mark Paid Button ─────────────────────────────────────────────────────────

function MarkPaidButton({ record, campaignId }: { record: CampaignKolRecord; campaignId: string }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => campaignsApi.updateCampaignKol(campaignId, record.kolId, { isPaid: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments-kols', campaignId] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  if (record.isPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Paid
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); mutation.mutate(); }}
      disabled={mutation.isPending}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
    >
      {mutation.isPending ? <Spinner className="h-3 w-3" /> : null}
      Mark paid
    </button>
  );
}

// ─── Campaign Payment Section ─────────────────────────────────────────────────

function CampaignPaymentSection({
  campaignId,
  campaignName,
  clientName,
  filter,
}: {
  campaignId: string;
  campaignName: string;
  clientName: string;
  filter: 'all' | 'unpaid' | 'paid';
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payments-kols', campaignId],
    queryFn: () => campaignsApi.getCampaignKols(campaignId),
    enabled: expanded,
  });

  const allWithFee = records.filter((r) => r.negotiatedFee != null && r.negotiatedFee > 0);
  const unpaidRecords = allWithFee.filter((r) => !r.isPaid);
  const paidRecords = allWithFee.filter((r) => r.isPaid);
  const unpaidTotal = unpaidRecords.reduce((s, r) => s + (r.negotiatedFee ?? 0), 0);
  const paidTotal = paidRecords.reduce((s, r) => s + (r.negotiatedFee ?? 0), 0);

  const displayed =
    filter === 'unpaid' ? unpaidRecords :
    filter === 'paid' ? paidRecords :
    allWithFee;

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <svg
          className={clsx('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', expanded && 'rotate-90')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{campaignName}</p>
          <p className="text-xs text-gray-400">{clientName}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0 text-xs">
          {unpaidTotal > 0 && (
            <span className="font-semibold text-amber-600">{fmt(unpaidTotal)} unpaid</span>
          )}
          {paidTotal > 0 && (
            <span className="text-emerald-600">{fmt(paidTotal)} paid</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${campaignId}`); }}
            className="text-primary-500 hover:text-primary-700 transition-colors"
          >
            View →
          </button>
        </div>
      </button>

      {/* Expanded KOL rows */}
      {expanded && (
        <div className="border-t border-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="h-5 w-5 text-primary-500" />
            </div>
          ) : displayed.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No matching KOL payment records</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Sub-header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center bg-gray-50 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>KOL</span>
                <span className="w-24 text-right">Fee</span>
                <span className="w-28 text-center">Invoice Ref</span>
                <span className="w-20 text-right">Status</span>
              </div>
              {displayed.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center border border-primary-100">
                      {r.kol.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.kol.name}</p>
                      <p className="text-xs text-gray-400">{r.status.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm font-semibold text-gray-800 tabular-nums">
                    {fmt(r.negotiatedFee ?? 0)}
                  </span>
                  <span className="w-28 text-center text-xs text-gray-400 font-mono">
                    {r.invoiceRef ?? '—'}
                  </span>
                  <div className="w-20 flex justify-end">
                    <MarkPaidButton record={r} campaignId={campaignId} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function exportPaymentsCsv(campaignPnl: Array<{ id: string; name: string; clientName: string; kolCost: number; revenue: number; netProfit: number }>) {
  const headers = ['Campaign', 'Client', 'Revenue', 'KOL Cost', 'Net Profit'];
  const rows = campaignPnl.map((c) => [c.name, c.clientName, c.revenue, c.kolCost, c.netProfit]);
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unpaid' | 'paid';

export default function PaymentsPage() {
  const [filterTab, setFilterTab] = useState<FilterTab>('unpaid');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
    staleTime: 30_000,
  });

  const { data: campaignsList } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignsApi.list({ limit: 200 }),
  });

  const allCampaigns: Array<{ id: string; name: string; clientName: string }> =
    campaignsList?.data ?? [];

  const pnlMap = new Map((stats?.campaignPnl ?? []).map((c) => [c.id, c]));

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'unpaid', label: 'Unpaid' },
    { id: 'paid', label: 'Paid' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Payment Management</h1>
          <p className="mt-0.5 text-sm text-gray-500">Track KOL fees across all campaigns</p>
        </div>
        <button
          onClick={() => stats && exportPaymentsCsv(stats.campaignPnl)}
          disabled={!stats}
          className="btn-secondary gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-primary-500" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard label="Total KOL Cost" value={fmt(stats?.totalKolCost ?? 0)} sub="contracted" />
            <SummaryCard
              label="Outstanding"
              value={fmt(stats?.unpaidKolTotal ?? 0)}
              sub={`${stats?.unpaidKolCount ?? 0} invoices`}
              color="text-amber-600"
            />
            <SummaryCard
              label="Paid"
              value={fmt((stats?.totalKolCost ?? 0) - (stats?.unpaidKolTotal ?? 0))}
              sub="settled"
              color="text-emerald-600"
            />
            <SummaryCard
              label="Net Profit"
              value={fmt(stats?.netProfit ?? 0)}
              sub={`${(stats?.netMarginPct ?? 0).toFixed(1)}% margin`}
              color={(stats?.netProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          </div>

          {/* Outstanding alert */}
          {(stats?.unpaidKolCount ?? 0) > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{stats?.unpaidKolCount} unpaid KOL invoice{stats?.unpaidKolCount !== 1 ? 's' : ''}</span>
                {' '}— {fmt(stats?.unpaidKolTotal ?? 0)} outstanding. Expand a campaign below to mark individual payments.
              </p>
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={clsx(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                  filterTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Campaign list */}
          <div className="space-y-3">
            {allCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">No campaigns found</p>
            ) : (
              allCampaigns.map((c) => {
                const pnl = pnlMap.get(c.id);
                // Skip campaigns with no KOL cost when filtering
                if (filterTab === 'unpaid' && (pnl?.kolCost ?? 0) === 0) return null;
                if (filterTab === 'paid' && (pnl?.kolCost ?? 0) === 0) return null;
                return (
                  <CampaignPaymentSection
                    key={c.id}
                    campaignId={c.id}
                    campaignName={c.name}
                    clientName={c.clientName}
                    filter={filterTab}
                  />
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
