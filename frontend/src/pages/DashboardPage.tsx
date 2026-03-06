import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  ComposedChart, Line, Area,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { reportingApi, type DashboardStats, type CampaignPnl } from '@/api/reporting.api';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { CampaignStatus } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPI_ICONS = {
  users: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  add: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  bolt: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  chart: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  money: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trend: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

type KpiIcon = keyof typeof KPI_ICONS;
type KpiColor = 'indigo' | 'green' | 'blue' | 'orange' | 'emerald' | 'red' | 'purple' | 'amber';

const COLOR_MAP: Record<KpiColor, string> = {
  indigo:  'from-indigo-500 to-indigo-600',
  green:   'from-green-500 to-emerald-600',
  blue:    'from-blue-500 to-blue-600',
  orange:  'from-orange-400 to-orange-500',
  emerald: 'from-emerald-400 to-teal-600',
  red:     'from-red-400 to-rose-600',
  purple:  'from-purple-500 to-violet-600',
  amber:   'from-amber-400 to-yellow-500',
};

function KpiCard({ label, value, sub, color, icon }: {
  label: string;
  value: string | number;
  sub?: string;
  color: KpiColor;
  icon: KpiIcon;
}) {
  return (
    <div className="card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${COLOR_MAP[color]} text-white shadow-sm`}>
        {KPI_ICONS[icon]}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-gray-300">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Campaign status pie chart ────────────────────────────────────────────────

const CAMPAIGN_PIE_COLORS: Record<string, string> = {
  Draft:     '#94a3b8',
  Planning:  '#60a5fa',
  Executing: '#34d399',
  Completed: '#a78bfa',
};

function CampaignStatusPie({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-gray-400">
        No campaign data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={CAMPAIGN_PIE_COLORS[entry.name] ?? '#6366f1'} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [v, 'Campaigns']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #374151', fontSize: '12px', backgroundColor: '#1f2937', color: '#f3f4f6' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── KOL pipeline bar chart ───────────────────────────────────────────────────

const PIPELINE_COLORS: Record<string, string> = {
  'Shortlisted':         '#94a3b8',
  'Submitted to Client': '#60a5fa',
  'Approved by Client':  '#34d399',
  'Rejected by Client':  '#f87171',
  'Contacted':           '#fbbf24',
  'Negotiating':         '#fb923c',
  'Contracted':          '#818cf8',
  'Content Submitted':   '#c084fc',
  'Content Approved':    '#2dd4bf',
  'Published':           '#f472b6',
  'Completed':           '#9ca3af',
};

function PipelineBar({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' '),
      value,
      fill: PIPELINE_COLORS[key.replace(/_/g, ' ')] ?? '#6366f1',
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-gray-400">
        No KOL pipeline data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 65 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 9, fill: '#9ca3af' }}
          angle={-38}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
        <Tooltip
          formatter={(v: number) => [v, 'KOLs']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #374151', fontSize: '12px', backgroundColor: '#1f2937', color: '#f3f4f6' }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Monthly trend chart ───────────────────────────────────────────────────────

function MonthlyTrendChart({ data }: { data: DashboardStats['monthlyTrend'] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-gray-400">
        No monthly data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
        />
        <Tooltip
          formatter={(v: number, name: string) => [
            `$${v.toLocaleString('en-AU')}`,
            name === 'revenue' ? 'Revenue' : name === 'kolCost' ? 'KOL Cost' : 'Net Profit',
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #374151', fontSize: '12px', backgroundColor: '#1f2937', color: '#f3f4f6' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#d1d5db' }} />
        <Area type="monotone" dataKey="revenue" fill="#4c1d95" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
        <Bar dataKey="kolCost" fill="#fca5a5" radius={[3, 3, 0, 0]} name="KOL Cost" />
        <Line type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={2} dot={false} name="Net Profit" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Campaign P&L table ────────────────────────────────────────────────────────

type SortField = 'revenue' | 'kolCost' | 'grossProfit' | 'netProfit';

const STATUS_VARIANT: Record<string, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]:     'gray',
  [CampaignStatus.PLANNING]:  'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

function CampaignPnlTable({ rows }: { rows: CampaignPnl[] }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortField>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = [...rows].sort((a, b) => {
    const diff = a[sortBy] - b[sortBy];
    return sortDir === 'desc' ? -diff : diff;
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-block text-gray-400">
      {sortBy === field ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-100">Campaign P&amp;L</h3>
        <p className="mt-0.5 text-xs text-gray-500">Revenue vs costs per campaign — click to open</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3 font-semibold">Campaign</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('revenue')}>
                Revenue <SortIcon field="revenue" />
              </th>
              <th className="px-3 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('kolCost')}>
                KOL Cost <SortIcon field="kolCost" />
              </th>
              <th className="px-3 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('grossProfit')}>
                Gross Profit <SortIcon field="grossProfit" />
              </th>
              <th className="px-3 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => handleSort('netProfit')}>
                Net Profit <SortIcon field="netProfit" />
              </th>
              <th className="px-3 py-3 font-semibold text-right">KOLs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                  No campaign data yet
                </td>
              </tr>
            )}
            {sorted.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                className="hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-100 truncate max-w-[180px]">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{c.clientName}</p>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[c.status] ?? 'gray'}>{c.status}</Badge>
                </td>
                <td className="px-3 py-3 text-right font-medium text-gray-200">
                  {c.revenue > 0 ? fmt(c.revenue) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-gray-400">
                  {c.kolCost > 0 ? fmt(c.kolCost) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  {c.revenue > 0 || c.kolCost > 0 ? (
                    <span className={c.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmt(c.grossProfit)}
                    </span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  {c.revenue > 0 || c.kolCost > 0 ? (
                    <span className={c.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {fmt(c.netProfit)}
                    </span>
                  ) : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-3 text-right text-gray-500">{c.kolCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Recent campaigns list ────────────────────────────────────────────────────

function RecentCampaigns({ campaigns }: { campaigns: DashboardStats['recentCampaigns'] }) {
  const navigate = useNavigate();

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-800 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-100">Recent Campaigns</h3>
      </div>
      {campaigns.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">No campaigns yet</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/campaigns/${c.id}`)}
              className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-800/50 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-100 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate">{c.clientName}</p>
              </div>
              <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                <span className="text-xs text-gray-400">{c.kolCount} KOL{c.kolCount !== 1 ? 's' : ''}</span>
                <Badge variant={STATUS_VARIANT[c.status] ?? 'gray'}>{c.status}</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-gray-800 px-5 py-3">
        <button
          onClick={() => navigate('/campaigns')}
          className="text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
        >
          View all campaigns →
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
    staleTime: 60_000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (isLoading) return <PageSpinner />;

  const s = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {user?.fullName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Here's a live snapshot of your KOL operations.
        </p>
      </div>

      {/* Operations KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total KOLs"       value={s?.totalKols ?? 0}       sub="in the database"     color="indigo" icon="users" />
        <KpiCard label="New This Month"    value={s?.kolsThisMonth ?? 0}   sub="KOLs added"          color="green"  icon="add" />
        <KpiCard label="Active Campaigns"  value={s?.activeCampaigns ?? 0} sub="currently executing" color="blue"   icon="bolt" />
        <KpiCard label="Total Campaigns"   value={s?.totalCampaigns ?? 0}  sub="all time"            color="orange" icon="chart" />
      </div>

      {/* Financial KPI cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Financial Overview</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Total Revenue"
            value={fmt(s?.totalRevenue ?? 0)}
            sub="client billings"
            color="purple"
            icon="money"
          />
          <KpiCard
            label="Gross Profit"
            value={fmt(s?.grossProfit ?? 0)}
            sub={`${pct(s?.grossMarginPct ?? 0)} margin`}
            color="emerald"
            icon="trend"
          />
          <KpiCard
            label="Net Profit"
            value={fmt(s?.netProfit ?? 0)}
            sub={`${pct(s?.netMarginPct ?? 0)} net margin`}
            color={(s?.netProfit ?? 0) >= 0 ? 'green' : 'red'}
            icon="trend"
          />
          <KpiCard
            label="Outstanding KOL Fees"
            value={fmt(s?.unpaidKolTotal ?? 0)}
            sub={`${s?.unpaidKolCount ?? 0} unpaid KOL${(s?.unpaidKolCount ?? 0) !== 1 ? 's' : ''}`}
            color="amber"
            icon="warning"
          />
        </div>

        {/* Inline P&L formula */}
        {(s?.totalRevenue ?? 0) > 0 && (
          <div className="mt-3 card p-4">
            <div className="flex flex-wrap gap-4 text-sm items-center">
              <div>
                <p className="text-xs text-gray-400">Revenue</p>
                <p className="font-semibold text-gray-100">{fmt(s?.totalRevenue ?? 0)}</p>
              </div>
              <span className="text-gray-300 text-lg">−</span>
              <div>
                <p className="text-xs text-gray-400">KOL Cost (COGS)</p>
                <p className="font-semibold text-red-500">{fmt(s?.totalKolCost ?? 0)}</p>
              </div>
              <span className="text-gray-300 text-lg">=</span>
              <div>
                <p className="text-xs text-gray-400">Gross Profit</p>
                <p className={`font-semibold ${(s?.grossProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(s?.grossProfit ?? 0)}
                </p>
              </div>
              <span className="text-gray-300 text-lg">−</span>
              <div>
                <p className="text-xs text-gray-400">Other Expenses</p>
                <p className="font-semibold text-orange-500">{fmt(s?.totalOtherExpenses ?? 0)}</p>
              </div>
              <span className="text-gray-300 text-lg">=</span>
              <div>
                <p className="text-xs text-gray-400">Net Profit</p>
                <p className={`font-semibold ${(s?.netProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmt(s?.netProfit ?? 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-100">Campaign Status Distribution</h3>
          <p className="mt-0.5 mb-3 text-xs text-gray-500">Breakdown across all campaigns</p>
          <CampaignStatusPie data={s?.campaignsByStatus ?? {}} />
        </div>

        <div className="card p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-gray-100">KOL Pipeline Overview</h3>
          <p className="mt-0.5 mb-3 text-xs text-gray-500">Active KOLs across all campaigns by pipeline stage</p>
          <PipelineBar data={s?.pipelineByStatus ?? {}} />
        </div>
      </div>

      {/* Monthly trend */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-100">Monthly Revenue vs Cost Trend</h3>
        <p className="mt-0.5 mb-3 text-xs text-gray-500">
          Last 6 months — purple area = Revenue, red bars = KOL Cost, green line = Net Profit
        </p>
        <MonthlyTrendChart data={s?.monthlyTrend ?? []} />
      </div>

      {/* Campaign P&L table */}
      <CampaignPnlTable rows={s?.campaignPnl ?? []} />

      {/* Recent campaigns */}
      <RecentCampaigns campaigns={s?.recentCampaigns ?? []} />
    </div>
  );
}
