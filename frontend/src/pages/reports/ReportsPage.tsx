import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportingApi, type CampaignPnl } from '@/api/reporting.api';
import { Spinner } from '@/components/ui/Spinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700',
    Completed: 'bg-blue-100 text-blue-700',
    Draft: 'bg-gray-100 text-gray-600',
    Paused: 'bg-amber-100 text-amber-700',
    Archived: 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Campaign P&L Table ───────────────────────────────────────────────────────

function PnlTable({
  rows,
  downloading,
  onDownload,
}: {
  rows: CampaignPnl[];
  downloading: Set<string>;
  onDownload: (id: string, name: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium text-gray-400">No campaigns found</p>
        <p className="text-xs text-gray-300 mt-1">Reports will appear once campaigns have financial data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="text-left">
            {['Campaign', 'Client', 'Status', 'Revenue', 'KOL Cost', 'Other Exp.', 'Gross Profit', 'Net Profit', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => {
            const profitColor = row.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500';
            return (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3.5 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                  {row.name}
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{row.clientName}</td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-900 whitespace-nowrap tabular-nums">{fmt(row.revenue)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap tabular-nums">{fmt(row.kolCost)}</td>
                <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap tabular-nums">{fmt(row.otherExpenses)}</td>
                <td className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap tabular-nums ${row.grossProfit >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                  {fmt(row.grossProfit)}
                </td>
                <td className={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap tabular-nums ${profitColor}`}>
                  {fmt(row.netProfit)}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <button
                    onClick={() => onDownload(row.id, row.name)}
                    disabled={downloading.has(row.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading.has(row.id) ? (
                      <Spinner className="h-3 w-3" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    PDF
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Monthly Trend Chart ──────────────────────────────────────────────────────

function MonthlyTrendChart() {
  const { data } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
  });

  const trends = data?.monthlyTrend ?? [];
  if (trends.length === 0) return null;

  const maxVal = Math.max(...trends.map((t) => Math.max(t.revenue, t.kolCost + t.otherExpenses)));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-5">Monthly Revenue vs Costs</h3>
      <div className="flex items-end gap-3 h-40">
        {trends.map((t) => {
          const revH = maxVal > 0 ? Math.round((t.revenue / maxVal) * 100) : 0;
          const costH = maxVal > 0 ? Math.round(((t.kolCost + t.otherExpenses) / maxVal) * 100) : 0;
          return (
            <div key={t.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-end gap-0.5 w-full h-32">
                <div
                  className="flex-1 rounded-t-sm bg-primary-500 transition-all"
                  style={{ height: `${revH}%` }}
                  title={`Revenue: ${fmt(t.revenue)}`}
                />
                <div
                  className="flex-1 rounded-t-sm bg-amber-400 transition-all"
                  style={{ height: `${costH}%` }}
                  title={`Costs: ${fmt(t.kolCost + t.otherExpenses)}`}
                />
              </div>
              <span className="text-[10px] text-gray-400 truncate w-full text-center">
                {t.month.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary-500 inline-block" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400 inline-block" />Costs</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
  });

  const handleDownload = async (id: string, name: string) => {
    setDownloading((prev) => new Set(prev).add(id));
    try {
      await reportingApi.downloadCampaignReport(id, name);
    } catch {
      // ignore — browser will show download error if needed
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500">Financial summaries and per-campaign PDF exports</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-primary-600" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Failed to load reporting data. Please try again.
        </div>
      )}

      {data && (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Revenue" value={fmt(data.totalRevenue)} sub={`${data.totalCampaigns} campaigns`} />
            <KpiCard label="Total KOL Cost" value={fmt(data.totalKolCost)} sub="Contracted spend" color="text-amber-600" />
            <KpiCard
              label="Gross Profit"
              value={fmt(data.grossProfit)}
              sub={`${pct(data.grossMarginPct)} margin`}
              color={data.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
            <KpiCard
              label="Net Profit"
              value={fmt(data.netProfit)}
              sub={`${pct(data.netMarginPct)} margin`}
              color={data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}
            />
          </div>

          {/* Chart */}
          <MonthlyTrendChart />

          {/* Campaign P&L Table */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Campaign P&L</h2>
              <span className="text-xs text-gray-400">{data.campaignPnl.length} campaigns</span>
            </div>
            <PnlTable
              rows={data.campaignPnl}
              downloading={downloading}
              onDownload={handleDownload}
            />
          </div>

          {/* Unpaid KOLs callout */}
          {data.unpaidKolCount > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {data.unpaidKolCount} unpaid KOL invoice{data.unpaidKolCount !== 1 ? 's' : ''} — {fmt(data.unpaidKolTotal)} outstanding
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Mark KOL records as paid in the Campaign Pipeline tab once invoices are settled.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
