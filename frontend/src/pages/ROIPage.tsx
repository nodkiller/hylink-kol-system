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
import clsx from 'clsx';

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

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #E5E7EB',
  fontSize: '12px',
  backgroundColor: '#FFFFFF',
  color: '#111827',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
};

const CHANNEL_COLORS: Record<string, string> = {
  KOL:     '#4F46E5',
  SEM:     '#4F86F7',
  Meta:    '#1877F2',
  Display: '#10b981',
  WeChat:  '#07C160',
  Other:   '#9ca3af',
};

function channelColor(ch: string) {
  return CHANNEL_COLORS[ch] ?? '#9ca3af';
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'performance' | 'roi' | 'benchmarks';

const TABS: { id: Tab; label: string }[] = [
  { id: 'performance', label: 'KOL Performance' },
  { id: 'roi', label: 'ROI & Cost' },
  { id: 'benchmarks', label: 'Benchmarks' },
];

// ─── Performance Tab ──────────────────────────────────────────────────────────

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
            <th className="px-4 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('spend')}>
              Spend <SortIcon k="spend" />
            </th>
            <th className="px-4 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('leads')}>
              Leads <SortIcon k="leads" />
            </th>
            <th className="px-4 py-3 font-semibold text-right">Qualified</th>
            <th className="px-4 py-3 font-semibold text-right">Converted</th>
            <th className="px-4 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('cpl')}>
              CPL <SortIcon k="cpl" />
            </th>
            <th className="px-4 py-3 font-semibold text-right cursor-pointer select-none" onClick={() => toggleSort('conversionRate')}>
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

function PerformanceTab({ kol, topKols }: { kol?: ROIChannel; topKols: KolPerformanceRow[] }) {
  const steps = [
    { label: 'Total Leads', value: kol?.leads ?? 0, color: 'bg-blue-500' },
    { label: 'Qualified', value: kol?.testDrives ?? 0, color: 'bg-amber-500' },
    { label: 'Converted', value: kol?.conversions ?? 0, color: 'bg-emerald-500' },
  ];
  const maxVal = Math.max(kol?.leads ?? 0, 1);

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: (kol?.leads ?? 0).toString(), color: 'text-blue-600' },
          { label: 'Qualified', value: (kol?.testDrives ?? 0).toString(), color: 'text-amber-600' },
          { label: 'Converted', value: (kol?.conversions ?? 0).toString(), color: 'text-emerald-600' },
          { label: 'Conversion Rate', value: fmtPct(kol?.conversionRate ?? null), color: 'text-gray-900' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.label}</p>
            <p className={clsx('mt-1 text-2xl font-bold', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">KOL Lead Funnel</h3>
        <div className="space-y-3 max-w-md">
          {steps.map((step, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{step.label}</span>
                <span className="text-sm font-semibold text-gray-800">{step.value}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={clsx('h-2 rounded-full transition-all', step.color)}
                  style={{ width: `${(step.value / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {(kol?.leads ?? 0) === 0 && (
            <p className="text-xs text-gray-400 pt-1">
              No leads captured yet. Share tracking links to start collecting.
            </p>
          )}
        </div>
      </div>

      {/* Top KOLs */}
      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">KOL Performance Breakdown</h3>
          <p className="mt-0.5 text-xs text-gray-400">KOLs with spend or leads · Click column headers to sort</p>
        </div>
        <TopKolsTable rows={topKols} />
      </div>
    </div>
  );
}

// ─── ROI & Cost Tab ───────────────────────────────────────────────────────────

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
        <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `$${v}`} />
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
            <th className="px-4 py-3 font-semibold text-right">Qualification Rate</th>
            <th className="px-4 py-3 font-semibold text-right">Conversion Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {channels.map((c) => {
            const isBest = c.cpl !== null && c.cpl === bestCpl && c.leads > 0;
            return (
              <tr key={c.channel} className={c.channel === 'KOL' ? 'bg-primary-50/30' : ''}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: channelColor(c.channel) }}
                    />
                    <span className="font-semibold text-gray-800">{c.channel}</span>
                    {c.channel === 'KOL' && (
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-700">
                        This Platform
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {c.spend > 0 ? fmtMoney(c.spend) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {c.leads > 0 ? c.leads : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {c.cpl !== null ? (
                    <span className={clsx('font-semibold', isBest ? 'text-emerald-600' : 'text-gray-700')}>
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

function RoiTab({ channels, kol, savings, avgOtherCpl, kolCpl }: {
  channels: ROIChannel[];
  kol?: ROIChannel;
  savings: number | null;
  avgOtherCpl: number | null;
  kolCpl: number | null;
}) {
  return (
    <div className="space-y-5">
      {/* Savings banner */}
      {savings !== null && kol && kol.leads > 0 && (
        <div className={clsx(
          'card px-6 py-4 flex items-center gap-4',
          savings > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100',
        )}>
          <div className={clsx(
            'flex h-10 w-10 items-center justify-center rounded-xl text-white text-lg',
            savings > 0 ? 'bg-emerald-500' : 'bg-amber-500',
          )}>
            {savings > 0 ? '🏆' : '📊'}
          </div>
          <div>
            <p className={clsx('font-semibold', savings > 0 ? 'text-emerald-800' : 'text-amber-800')}>
              {savings > 0
                ? `KOL CPL is $${savings.toFixed(0)} cheaper than average paid media`
                : `KOL CPL is $${Math.abs(savings).toFixed(0)} higher than average paid media`}
            </p>
            <p className={clsx('text-xs mt-0.5', savings > 0 ? 'text-emerald-600' : 'text-amber-600')}>
              KOL: {fmtCpl(kolCpl)} per lead · Avg. other channels: {fmtCpl(avgOtherCpl)}
              {savings > 0 && ` · ${((savings / avgOtherCpl!) * 100).toFixed(0)}% more efficient`}
            </p>
          </div>
        </div>
      )}

      {/* Chart + Table */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900">CPL by Channel</h3>
          <p className="mt-0.5 mb-4 text-xs text-gray-400">Lower is better</p>
          <CplChart channels={channels.filter((c) => c.leads > 0 || c.spend > 0)} />
        </div>
        <div className="card overflow-hidden lg:col-span-3">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Channel Comparison</h3>
            <p className="mt-0.5 text-xs text-gray-400">KOL vs paid media benchmarks</p>
          </div>
          <ChannelTable channels={channels} />
        </div>
      </div>

      {/* KOL cost summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'KOL Total Spend', value: kol ? fmtMoney(kol.spend) : '—' },
          { label: 'KOL Cost per Lead', value: fmtCpl(kolCpl) },
          { label: 'Qualification Rate', value: fmtPct(kol?.testDriveRate ?? null) },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Benchmarks Tab ───────────────────────────────────────────────────────────

const PRESET_CHANNELS = ['SEM', 'Meta', 'Display', 'WeChat', 'TikTok Ads', 'Other'];

function BenchmarkTab({
  benchmarks,
  onDelete,
  onAdd,
}: {
  benchmarks: BenchmarkEntry[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Enter spend &amp; lead data from other channels (SEM, Meta, etc.) to compare against KOL ROI.
          </p>
        </div>
        <button onClick={onAdd} className="btn-primary gap-2 text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Benchmark
        </button>
      </div>

      <div className="card p-5">
        {benchmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No benchmark data yet</p>
            <p className="text-xs mt-1">Add paid media channel data to compare CPL against KOL performance</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {benchmarks.map((b) => (
              <div key={b.id} className="flex items-start gap-4 py-3.5 px-1">
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
                    Spend: {fmtMoney(b.spend)} · Leads: {b.leads} · CPL: {fmtCpl(b.cpl)} · Qualified: {b.testDrives} · Converted: {b.conversions}
                  </p>
                  {b.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{b.notes}</p>}
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
        )}
      </div>
    </div>
  );
}

// ─── Benchmark Add Modal ──────────────────────────────────────────────────────

function BenchmarkModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
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
            <p className="mt-0.5 text-xs text-gray-400">Enter spend &amp; lead data from other channels to compare CPL.</p>
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
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                    !useCustom && form.channel === ch
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                  )}
                >
                  {ch}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  useCustom ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                )}
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
                className="input text-sm"
              />
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period (optional)</label>
            <input
              type="text"
              placeholder='e.g. "Q1 2025" or "Jan–Mar 2025"'
              value={form.periodLabel}
              onChange={(e) => set('periodLabel', e.target.value)}
              className="input text-sm"
            />
          </div>

          {/* Spend + Leads */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Spend (AUD)</label>
              <input
                type="number" min={0} step={100}
                value={form.spend}
                onChange={(e) => set('spend', Number(e.target.value))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Leads</label>
              <input
                type="number" min={0}
                value={form.leads}
                onChange={(e) => set('leads', Number(e.target.value))}
                className="input text-sm"
              />
            </div>
          </div>

          {/* Qualified + Converted */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Qualified Leads</label>
              <input
                type="number" min={0}
                value={form.testDrives}
                onChange={(e) => set('testDrives', Number(e.target.value))}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conversions</label>
              <input
                type="number" min={0}
                value={form.conversions}
                onChange={(e) => set('conversions', Number(e.target.value))}
                className="input text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Google Ads search campaign — Q1"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="input text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : 'Save Benchmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function ROIPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('performance');
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
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Track KOL performance and compare ROI against other marketing channels.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {tab.label}
            {tab.id === 'benchmarks' && (roi?.benchmarks?.length ?? 0) > 0 && (
              <span className={clsx(
                'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
              )}>
                {roi!.benchmarks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'performance' && (
        <PerformanceTab kol={kol} topKols={roi?.topKols ?? []} />
      )}

      {activeTab === 'roi' && (
        <RoiTab
          channels={allChannels}
          kol={kol}
          savings={savings}
          avgOtherCpl={avgOtherCpl}
          kolCpl={kolCpl}
        />
      )}

      {activeTab === 'benchmarks' && (
        <BenchmarkTab
          benchmarks={roi?.benchmarks ?? []}
          onDelete={(id) => deleteMutation.mutate(id)}
          onAdd={() => setShowModal(true)}
        />
      )}

      {showModal && (
        <BenchmarkModal
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['roi-stats'] })}
        />
      )}
    </div>
  );
}
