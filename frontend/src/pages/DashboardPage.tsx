import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/stores/auth.store';
import { reportingApi } from '@/api/reporting.api';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { CampaignStatus } from '@/types';

// ─── Shared tooltip style ──────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  fontSize: '12px',
  backgroundColor: '#FFFFFF',
  color: '#111827',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
};

function fmtAud(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${accent}`}>
        {icon}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Campaign Status Donut ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Draft:     '#94a3b8',
  Planning:  '#60a5fa',
  Executing: '#10b981',
  Completed: '#8b5cf6',
};

function CampaignStatusDonut({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No campaign data yet</div>;
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="44%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#E5E7EB'} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [v, 'Campaigns']} contentStyle={TOOLTIP_STYLE} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', color: '#4B5563' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '24px' }}>
        <p className="text-2xl font-bold text-gray-900">{total}</p>
        <p className="text-xs text-gray-400">Total</p>
      </div>
    </div>
  );
}

// ─── KOL Pipeline Bar ─────────────────────────────────────────────────────────

const PIPELINE_COLORS: Record<string, string> = {
  'Shortlisted':         '#94a3b8',
  'Submitted to Client': '#60a5fa',
  'Approved by Client':  '#10b981',
  'Rejected by Client':  '#f87171',
  'Contacted':           '#fbbf24',
  'Negotiating':         '#fb923c',
  'Contracted':          '#8b5cf6',
  'Content Submitted':   '#c084fc',
  'Content Approved':    '#2dd4bf',
  'Published':           '#f472b6',
  'Completed':           '#6366f1',
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
    return <div className="flex h-48 items-center justify-center text-sm text-gray-400">No KOL pipeline data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} angle={-38} textAnchor="end" interval={0} />
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
        <Tooltip formatter={(v: number) => [v, 'KOLs']} contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Recent Campaigns ─────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]:     'gray',
  [CampaignStatus.PLANNING]:  'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

function RecentCampaigns({ campaigns }: { campaigns: Array<{ id: string; name: string; clientName: string; status: string; kolCount: number }> }) {
  const navigate = useNavigate();
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Campaigns</h3>
        <p className="mt-0.5 text-xs text-gray-400">Latest activity across all campaigns</p>
      </div>
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">No campaigns yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Create your first campaign to get started</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)}
              className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
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
      <div className="border-t border-gray-100 px-5 py-3">
        <button onClick={() => navigate('/campaigns')} className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
          View all campaigns →
        </button>
      </div>
    </div>
  );
}

// ─── Action Items ─────────────────────────────────────────────────────────────

function ActionItems({ activeCampaigns, unpaidKolCount, pipelineByStatus }: {
  activeCampaigns: number; unpaidKolCount: number; pipelineByStatus: Record<string, number>;
}) {
  const navigate = useNavigate();
  type Item = { label: string; count: number; icon: React.ReactNode; onClick?: () => void };
  const items: Item[] = [];

  const contentSubmitted = pipelineByStatus['Content_Submitted'] ?? pipelineByStatus['Content Submitted'] ?? 0;
  if (contentSubmitted > 0) items.push({
    label: 'content pieces pending review', count: contentSubmitted,
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    onClick: () => navigate('/campaigns'),
  });

  if (unpaidKolCount > 0) items.push({
    label: 'KOLs with outstanding fees', count: unpaidKolCount,
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    onClick: () => navigate('/reports'),
  });

  if (activeCampaigns > 0) items.push({
    label: 'campaigns currently executing', count: activeCampaigns,
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    onClick: () => navigate('/campaigns'),
  });

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Action Items</h3>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium text-gray-500">All caught up!</p>
          <p className="text-xs text-gray-400 mt-0.5">No pending actions right now</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <button key={i} onClick={item.onClick}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
              <span className="text-primary-500 flex-shrink-0">{item.icon}</span>
              <span className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{item.count}</span>{' '}{item.label}
              </span>
              <svg className="ml-auto h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: 'New Campaign', sub: 'Start a new brief', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>, href: '/campaigns', color: 'bg-primary-50 text-primary-600' },
    { label: 'Find KOLs', sub: 'Instagram discovery', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, href: '/influencer-search', color: 'bg-blue-50 text-blue-600' },
    { label: 'KOL Database', sub: 'Browse library', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, href: '/kols', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Reports', sub: 'P&L & PDF exports', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, href: '/reports', color: 'bg-purple-50 text-purple-600' },
  ];
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.href)}
            className="flex flex-col items-start gap-2 rounded-xl border border-gray-100 p-3 hover:border-gray-200 hover:bg-gray-50 transition-colors text-left">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.color}`}>{a.icon}</div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{a.label}</p>
              <p className="text-[10px] text-gray-400">{a.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
    staleTime: 60_000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (isLoading) return <PageSpinner />;

  const s = stats;

  return (
    <div className="space-y-6">
      {/* ── Welcome banner ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">
            {greeting}, {user?.fullName?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {s?.activeCampaigns ?? 0} active campaigns
          </span>
        </div>
      </div>

      {/* ── 4 KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total KOLs" value={s?.totalKols ?? 0} sub="in the database"
          accent="bg-gradient-to-br from-indigo-500 to-primary-600"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <KpiCard label="New This Month" value={s?.kolsThisMonth ?? 0} sub="KOLs added"
          accent="bg-gradient-to-br from-emerald-400 to-teal-600"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
        />
        <KpiCard label="Active Campaigns" value={s?.activeCampaigns ?? 0} sub="currently executing"
          accent="bg-gradient-to-br from-blue-500 to-blue-600"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
        <KpiCard label="Unpaid KOLs" value={s?.unpaidKolCount ?? 0} sub="outstanding fees"
          accent="bg-gradient-to-br from-amber-400 to-orange-500"
          icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Campaign status donut (full width on small, 1/3 on large) */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900">Campaign Status</h3>
          <p className="mt-0.5 mb-3 text-xs text-gray-400">Breakdown across all campaigns</p>
          <CampaignStatusDonut data={s?.campaignsByStatus ?? {}} />
        </div>
      </div>

      {/* ── KOL Pipeline ─────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-900">KOL Pipeline</h3>
        <p className="mt-0.5 mb-3 text-xs text-gray-400">Active KOLs by pipeline stage across all campaigns</p>
        <PipelineBar data={s?.pipelineByStatus ?? {}} />
      </div>

      {/* ── Bottom row: Recent campaigns + sidebar ───────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentCampaigns campaigns={s?.recentCampaigns ?? []} />
        </div>
        <div className="space-y-5">
          <ActionItems
            activeCampaigns={s?.activeCampaigns ?? 0}
            unpaidKolCount={s?.unpaidKolCount ?? 0}
            pipelineByStatus={s?.pipelineByStatus ?? {}}
          />
          <QuickActions />
          {(s?.unpaidKolTotal ?? 0) > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Outstanding KOL Fees</p>
                  <p className="text-xl font-bold text-amber-500 mt-0.5">
                    {fmtAud(s?.unpaidKolTotal ?? 0)}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">{s?.unpaidKolCount} unpaid KOL{(s?.unpaidKolCount ?? 0) !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
