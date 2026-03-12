import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import {
  reportingApi,
  type ROIChannel,
  type KolPerformanceRow,
  type BenchmarkEntry,
  type CreateBenchmarkPayload,
} from '@/api/reporting.api';
import { PageSpinner } from '@/components/ui/Spinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtCpl(n: number | null) {
  if (n === null) return '—';
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | null) {
  if (n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

const CHANNEL_COLORS: Record<string, string> = {
  KOL:     '#EB5757',
  SEM:     '#4F86F7',
  Meta:    '#1877F2',
  Display: '#10b981',
  WeChat:  '#07C160',
  Other:   '#9ca3af',
};

function channelColor(ch: string) {
  return CHANNEL_COLORS[ch] ?? '#9ca3af';
}

// ─── CPL Comparison Bar Chart ─────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  fontSize: '12px',
  backgroundColor: '#FFFFFF',
  color: '#111827',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
};

function CplChart({ channels }: { channels: ROIChannel[] }) {
  const data = channels
    .filter((c) => c.cpl !== null)
    .map((c) => ({ name: c.channel, cpl: Math.round(c.cpl!), fill: channelColor(c.channel) }));

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        Add benchmark data to compare channels
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
        <YAxis
          tick={{ fontSize: 10, fill: '#9CA3AF' }}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          formatter={(v: number) => [`$${v}`, 'Cost per Lead']}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar dataKey="cpl" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Channel Comparison Table ─────────────────────────────────────────────────

function ChannelTable({ channels }: { channels: ROIChannel[] }) {
  const bestCpl = channels
    .filter((c) => c.cpl !== null && c.leads > 0)
    .reduce<number | null>((min, c) => (min === null || c.cpl! < min ? c.cpl! : min), null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-3 font-semibold">Channel</th>
            <th className="px-4 py-3 font-semibold text-right">Total Spend</th>
            <th className="px-4 py-3 font-semibold text-right">Leads</th>
            <th className="px-4 py-3 font-semibold text-right">Cost per Lead</th>
            <th className="px-4 py-3 font-semibold text-right">Test Drive Rate</th>
            <th className="px-4 py-3 font-semibold text-right">Conversion Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {channels.map((c) => {
            const isBest = c.cpl !== null && c.cpl === bestCpl && c.leads > 0;
            return (
              <tr key={c.channel} className={c.channel === 'KOL' ? 'bg-red-50/30' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: channelColor(c.channel) }}
                    />
                    <span className="font-semibold text-gray-800">{c.channel}</span>
                    {c.channel === 'KOL' && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        This Platform
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {c.spend > 0 ? fmtMoney(c.spend) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{c.leads > 0 ? c.leads : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-right">
                  {c.cpl !== null ? (
                    <span className={`font-semibold ${isBest ? 'text-emerald-600' : 'text-gray-700'}`}>
                      {fmtCpl(c.cpl)}
                      {isBest && <span className="ml-1 text-xs">✓ Best</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{fmtPct(c.testDriveRate)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmtPct(c.conversionRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── KOL Funnel ───────────────────────────────────────────────────────────────

function KolFunnel({ kol }: { kol: ROIChannel }) {
  const steps = [
    { label: 'Total Leads', value: kol.leads, color: 'bg-blue-500' },
    { label: 'Test Drives', value: kol.testDrives, color: 'bg-amber-500' },
    { label: 'Conversions', value: kol.conversions, color: 'bg-emerald-500' },
  ];
  const maxVal = Math.max(kol.leads, 1);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{step.label}</span>
            <span className="text-sm font-semibold text-gray-800">{step.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all ${step.color}`}
              style={{ width: `${(step.value / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {kol.leads === 0 && (
        <p className="text-xs text-gray-400 pt-1">
          No leads captured yet. Share tracking links to start collecting.
        </p>
      )}
    </div>
  );
}

// ─── Top KOLs Table ───────────────────────────────────────────────────────────

type SortKey = 'leads' | 'spend' | 'cpl' | 'conversionRate';

function TopKolsTable({ rows }: { rows: KolPerformanceRow[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('leads');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortBy] ?? (sortDir === 'desc' ? -Infinity : Infinity);
    const vb = b[sortBy] ?? (sortDir === 'desc' ? -Infinity : Infinity);
    return sortDir === 'desc' ? (vb as number) - (va as number) : (va as number) - (vb as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortBy(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-0.5 text-gray-300">{sortBy === k ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-4 py-3 font-semibold">KOL</th>
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th
              className="px-4 py-3 font-semibold text-right cursor-pointer select-none"
              onClick={() => toggleSort('spend')}
            >
              Spend <SortIcon k="spend" />
            </th>
            <th
              className="px-4 py-3 font-semibold text-right cursor-pointer select-none"
              onClick={() => toggleSort('leads')}
            >
              Leads <SortIcon k="leads" />
            </th>
            <th className="px-4 py-3 font-semibold text-right">Test Drives</th>
            <th className="px-4 py-3 font-semibold text-right">Conversions</th>
            <th
              className="px-4 py-3 font-semibold text-right cursor-pointer select-none"
              onClick={() => toggleSort('cpl')}
            >
              CPL <SortIcon k="cpl" />
            </th>
            <th
              className="px-4 py-3 font-semibold text-right cursor-pointer select-none"
              onClick={() => toggleSort('conversionRate')}
            >
              Conv. Rate <SortIcon k="conversionRate" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                No KOL data with spend or leads yet
              </td>
            </tr>
          )}
          {sorted.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{r.kolName}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{r.campaignName}</td>
              <td className="px-4 py-3 text-right text-gray-700">
                {r.spend > 0 ? fmtMoney(r.spend) : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={r.leads > 0 ? 'font-semibold text-blue-600' : 'text-gray-300'}>
                  {r.leads > 0 ? r.leads : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-amber-600">
                {r.testDrives > 0 ? r.testDrives : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-emerald-600">
                {r.conversions > 0 ? r.conversions : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-right font-medium text-gray-700">{fmtCpl(r.cpl)}</td>
              <td className="px-4 py-3 text-right text-gray-600">{fmtPct(r.conversionRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Benchmark Modal ──────────────────────────────────────────────────────────

const PRESET_CHANNELS = ['SEM', 'Meta', 'Display', 'WeChat', 'TikTok Ads', 'Other'];

function BenchmarkModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateBenchmarkPayload>({
    channel: 'SEM',
    periodLabel: '',
    spend: 0,
    leads: 0,
    testDrives: 0,
    conversions: 0,
    notes: '',
  });
  const [customChannel, setCustomChannel] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: CreateBenchmarkPayload) => reportingApi.createBenchmark(payload),
    onSuccess: () => { onSaved(); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, channel: useCustom ? customChannel : form.channel });
  };

  const set = (field: keyof CreateBenchmarkPayload, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Add Channel Benchmark</h2>
            <p className="mt-0.5 text-xs text-gray-400">Enter spend &amp; lead data from SEM, Meta, or other channels to compare against KOL ROI.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_CHANNELS.map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => { setUseCustom(false); set('channel', ch); }}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    !useCustom && form.channel === ch
                      ? 'bg-primary-500 text-white border-primary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {ch}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  useCustom ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                type="text"
                placeholder="Channel name"
                value={customChannel}
                onChange={(e) => setCustomChannel(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>

          {/* Period label */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period (optional)</label>
            <input
              type="text"
              placeholder='e.g. "Q1 2025" or "Jan–Mar 2025"'
              value={form.periodLabel}
              onChange={(e) => set('periodLabel', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Spend + Leads row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Spend (AUD)</label>
              <input
                type="number"
                min={0}
                step={100}
                value={form.spend}
                onChange={(e) => set('spend', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Leads</label>
              <input
                type="number"
                min={0}
                value={form.leads}
                onChange={(e) => set('leads', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Test Drives + Conversions row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Test Drives</label>
              <input
                type="number"
                min={0}
                value={form.testDrives}
                onChange={(e) => set('testDrives', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conversions (Sales)</label>
              <input
                type="number"
                min={0}
                value={form.conversions}
                onChange={(e) => set('conversions', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Google Ads campaign for Tiggo 7 Pro launch"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Save Benchmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Benchmark List ───────────────────────────────────────────────────────────

function BenchmarkList({
  benchmarks,
  onDelete,
}: {
  benchmarks: BenchmarkEntry[];
  onDelete: (id: string) => void;
}) {
  if (benchmarks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-400">
        No benchmark data yet. Click "Add Channel Benchmark" to add SEM or Meta data.
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {benchmarks.map((b) => (
        <div key={b.id} className="flex items-start gap-4 py-3 px-1">
          <span
            className="mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: channelColor(b.channel) }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{b.channel}</span>
              {b.periodLabel && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                  {b.periodLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Spend: {fmtMoney(b.spend)} · Leads: {b.leads} · CPL: {fmtCpl(b.cpl)} · Test Drives: {b.testDrives} · Conversions: {b.conversions}
            </p>
            {b.notes && <p className="text-xs text-gray-400 truncate">{b.notes}</p>}
          </div>
          <button
            onClick={() => onDelete(b.id)}
            className="flex-shrink-0 text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── ROI Page ─────────────────────────────────────────────────────────────────

export default function ROIPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: roi, isLoading } = useQuery({
    queryKey: ['roi-stats'],
    queryFn: reportingApi.getROIStats,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportingApi.deleteBenchmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roi-stats'] }),
  });

  if (isLoading) return <PageSpinner />;

  const kol = roi?.channels.find((c) => c.channel === 'KOL');
  const allChannels = roi?.channels ?? [];

  // Compute KOL savings headline vs other channels
  const otherChannels = allChannels.filter((c) => c.channel !== 'KOL' && c.cpl !== null && c.leads > 0);
  const avgOtherCpl =
    otherChannels.length > 0
      ? otherChannels.reduce((s, c) => s + c.cpl!, 0) / otherChannels.length
      : null;
  const kolCpl = kol?.cpl ?? null;
  const savings =
    avgOtherCpl !== null && kolCpl !== null ? avgOtherCpl - kolCpl : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">KOL ROI Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Compare KOL cost-per-lead against paid media channels to justify KOL investment.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Channel Benchmark
        </button>
      </div>

      {/* Headline savings banner */}
      {savings !== null && kol && kol.leads > 0 && (
        <div className={`card px-6 py-4 flex items-center gap-4 ${savings > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white text-lg ${savings > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {savings > 0 ? '🏆' : '📊'}
          </div>
          <div>
            <p className={`font-semibold ${savings > 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
              {savings > 0
                ? `KOL CPL is $${savings.toFixed(0)} cheaper than average paid media`
                : `KOL CPL is $${Math.abs(savings).toFixed(0)} higher than average paid media`}
            </p>
            <p className={`text-xs mt-0.5 ${savings > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              KOL: {fmtCpl(kolCpl)} per lead · Avg. other channels: {fmtCpl(avgOtherCpl)}
              {savings > 0 && ` · ${((savings / avgOtherCpl!) * 100).toFixed(0)}% more efficient`}
            </p>
          </div>
        </div>
      )}

      {/* Channel comparison */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* CPL Bar Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">CPL by Channel</h3>
          <p className="mt-0.5 mb-4 text-xs text-gray-400">Lower is better</p>
          <CplChart channels={allChannels.filter((c) => c.leads > 0 || c.spend > 0)} />
        </div>

        {/* Comparison table */}
        <div className="card overflow-hidden lg:col-span-3">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Channel Comparison</h3>
            <p className="mt-0.5 text-xs text-gray-400">KOL vs paid media benchmarks</p>
          </div>
          <ChannelTable channels={allChannels} />
        </div>
      </div>

      {/* KOL Funnel + Top KOLs */}
      <div className="grid gap-5 lg:grid-cols-4">
        {/* Funnel */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900">KOL Lead Funnel</h3>
          <p className="mt-0.5 mb-4 text-xs text-gray-400">All-time across all campaigns</p>
          {kol ? (
            <>
              <KolFunnel kol={kol} />
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{fmtCpl(kol.cpl)}</p>
                  <p className="text-xs text-gray-400">Cost per Lead</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{fmtPct(kol.testDriveRate)}</p>
                  <p className="text-xs text-gray-400">Test Drive Rate</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">No data yet</p>
          )}
        </div>

        {/* Top KOLs table */}
        <div className="card overflow-hidden lg:col-span-3">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">KOL Performance Breakdown</h3>
            <p className="mt-0.5 text-xs text-gray-400">Only KOLs with spend or leads are shown · Click column headers to sort</p>
          </div>
          <TopKolsTable rows={roi?.topKols ?? []} />
        </div>
      </div>

      {/* Benchmark data management */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Benchmark Entries</h3>
            <p className="mt-0.5 text-xs text-gray-400">Manually entered SEM / Meta / other channel data used for comparison above</p>
          </div>
        </div>
        <BenchmarkList
          benchmarks={roi?.benchmarks ?? []}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>

      {showModal && (
        <BenchmarkModal
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['roi-stats'] })}
        />
      )}
    </div>
  );
}
