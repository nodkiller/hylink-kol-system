import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type Campaign, type CampaignKolRecord } from '@/api/campaigns.api';
import { kolsApi } from '@/api/kols.api';
import CampaignKanban from '@/components/campaigns/CampaignKanban';
import KolDetailDrawer from '@/components/campaigns/KolDetailDrawer';
import PortalLinkModal from '@/components/campaigns/PortalLinkModal';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CampaignStatus, CampaignKolStatus } from '@/types';
import Modal from '@/components/ui/Modal';
import { reportingApi } from '@/api/reporting.api';
import clsx from 'clsx';

const STATUS_VARIANT: Record<string, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]: 'gray',
  [CampaignStatus.PLANNING]: 'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

// ─── Tab definitions ──────────────────────────────────────────────────────────

type Tab = 'overview' | 'kols' | 'analytics' | 'recommend' | 'content';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'kols', label: 'KOL Pipeline' },
  { id: 'content', label: 'Content Review' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'recommend', label: 'Recommendations' },
];

// ─── Add KOLs modal (light-themed) ───────────────────────────────────────────

function AddKolsModal({
  campaignId,
  open,
  onClose,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['kols-picker', search],
    queryFn: () => kolsApi.list({ search: search || undefined, limit: 50 }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  const kols = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => campaignsApi.addKols(campaignId, [...selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setSelected(new Set());
      onClose();
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add KOLs to Campaign"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={selected.size === 0 || mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''} KOL${selected.size !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search KOLs by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : kols.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No KOLs found</div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-200">
            {kols.map((kol) => {
              const top = kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
              const isChecked = selected.has(kol.id);
              return (
                <label
                  key={kol.id}
                  className={clsx(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                    isChecked ? 'bg-primary-50' : 'hover:bg-gray-50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(kol.id)}
                    className="h-4 w-4 rounded accent-primary-600"
                  />
                  <div className={clsx(
                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold border',
                    isChecked
                      ? 'bg-primary-100 text-primary-700 border-primary-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200',
                  )}>
                    {kol.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{kol.name}</p>
                    {top && (
                      <p className="text-xs text-gray-400 truncate">
                        {top.platformName}
                        {top.followersCount != null && ` · ${top.followersCount >= 1000 ? `${(top.followersCount / 1000).toFixed(0)}K` : top.followersCount}`}
                      </p>
                    )}
                  </div>
                  {kol.kolTier && (
                    <span className="flex-shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
                      {kol.kolTier}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {mutation.isError && (
          <p className="text-xs text-red-500">Failed to add KOLs. Please try again.</p>
        )}
      </div>
    </Modal>
  );
}

// ─── Pipeline List View (with bulk actions) ───────────────────────────────────

function PipelineListView({
  campaignId,
  records,
  onRowClick,
}: {
  campaignId: string;
  records: CampaignKolRecord[];
  onRowClick: (r: CampaignKolRecord) => void;
}) {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [applyingStatus, setApplyingStatus] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const allSelected = records.length > 0 && records.every((r) => selectedIds.has(r.id));
  const someSelected = records.some((r) => selectedIds.has(r.id));

  const toggle = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(records.map((r) => r.id)));
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setApplyingStatus(true);
    const selected = records.filter((r) => selectedIds.has(r.id));
    await Promise.all(selected.map((r) =>
      campaignsApi.updateCampaignKol(campaignId, r.kolId, { status: bulkStatus as CampaignKolStatus })
    ));
    qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
    setApplyingStatus(false);
    setSelectedIds(new Set());
  };

  const handleBulkPaid = async () => {
    if (selectedIds.size === 0) return;
    setMarkingPaid(true);
    const selected = records.filter((r) => selectedIds.has(r.id));
    await Promise.all(selected.map((r) =>
      campaignsApi.updateCampaignKol(campaignId, r.kolId, { isPaid: true })
    ));
    qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
    setMarkingPaid(false);
    setSelectedIds(new Set());
  };

  const STATUS_COLOR: Record<string, string> = {
    Shortlisted: 'bg-slate-100 text-slate-600',
    'Submitted to Client': 'bg-blue-100 text-blue-600',
    'Approved by Client': 'bg-green-100 text-green-700',
    'Rejected by Client': 'bg-red-100 text-red-600',
    Contacted: 'bg-amber-100 text-amber-700',
    Negotiating: 'bg-orange-100 text-orange-600',
    Contracted: 'bg-indigo-100 text-indigo-600',
    'Content Submitted': 'bg-purple-100 text-purple-600',
    'Content Approved': 'bg-teal-100 text-teal-700',
    Published: 'bg-pink-100 text-pink-600',
    Completed: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-primary-50 border border-primary-200 px-4 py-2.5">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="text-sm rounded-lg border border-gray-200 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Change status to…</option>
              {Object.values(CampaignKolStatus).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStatus}
              disabled={!bulkStatus || applyingStatus}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg px-3 py-1.5 hover:bg-primary-200 disabled:opacity-50 transition-colors"
            >
              {applyingStatus ? <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> : null}
              Apply
            </button>
            <button
              onClick={handleBulkPaid}
              disabled={markingPaid}
              className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg px-3 py-1.5 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
            >
              {markingPaid ? <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg> : null}
              Mark Paid
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Clear</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <div className="flex-1">KOL</div>
          <div className="w-36">Status</div>
          <div className="w-24 text-right">Fee</div>
          <div className="w-16 text-center">Paid</div>
        </div>

        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">No KOLs in pipeline yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map((r) => {
              const kol = r.kol;
              const top = kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
              const statusLabel = r.status.replace(/_/g, ' ');
              return (
                <div
                  key={r.id}
                  className={clsx('flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors', selectedIds.has(r.id) && 'bg-primary-50/50')}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggle(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <button className="flex-1 flex items-center gap-3 text-left min-w-0" onClick={() => onRowClick(r)}>
                    <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-600 text-xs font-bold border border-primary-100">
                      {kol.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{kol.name}</p>
                      {top && <p className="text-xs text-gray-400">{top.platformName}{top.followersCount ? ` · ${top.followersCount >= 1000 ? `${(top.followersCount / 1000).toFixed(0)}K` : top.followersCount}` : ''}</p>}
                    </div>
                  </button>
                  <div className="w-36 flex-shrink-0">
                    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLOR[statusLabel] ?? 'bg-gray-100 text-gray-600')}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="w-24 text-right flex-shrink-0 text-sm text-gray-700 tabular-nums">
                    {r.negotiatedFee != null ? `$${r.negotiatedFee.toLocaleString()}` : '—'}
                  </div>
                  <div className="w-16 flex-shrink-0 flex justify-center">
                    <span className={clsx('text-xs font-medium', r.isPaid ? 'text-emerald-600' : 'text-amber-500')}>
                      {r.isPaid ? '✓ Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Campaign Brief Modal ─────────────────────────────────────────────────────

function CampaignBriefModal({
  open, onClose, campaign, records,
}: {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  records: CampaignKolRecord[];
}) {
  const [copied, setCopied] = useState(false);

  const contracted = records.filter((r) =>
    ['Contracted', 'Content_Submitted', 'Content_Approved', 'Published', 'Completed'].includes(r.status),
  ).length;
  const totalFees = records.reduce((s, r) => s + (r.negotiatedFee ?? 0), 0);

  const kolLines = records.length === 0
    ? '\n  (No KOLs added yet)'
    : records.map((r) => {
        const top = r.kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
        return `\n  • ${r.kol.name}${top ? ` (${top.platformName}${top.followersCount != null ? `, ${top.followersCount >= 1000 ? `${(top.followersCount / 1000).toFixed(0)}K` : top.followersCount} followers` : ''})` : ''}${r.negotiatedFee != null ? ` — AUD $${r.negotiatedFee.toLocaleString()}` : ''}
    Status: ${r.status.replace(/_/g, ' ')}${r.invoiceRef ? `\n    Invoice: ${r.invoiceRef}` : ''}`;
      }).join('');

  const brief = `CAMPAIGN BRIEF
${'═'.repeat(50)}

Campaign:       ${campaign.name}
Client:         ${campaign.clientName}
Status:         ${campaign.status}${campaign.startDate || campaign.endDate ? `\nTimeline:       ${campaign.startDate ?? 'TBD'} → ${campaign.endDate ?? 'TBD'}` : ''}${campaign.budget != null ? `\nBudget:         AUD $${campaign.budget.toLocaleString()}` : ''}${campaign.clientBilling != null ? `\nClient Billing: AUD $${campaign.clientBilling.toLocaleString()}` : ''}

${'─'.repeat(50)}
KOL SUMMARY
${'─'.repeat(50)}

Total KOLs:     ${records.length}
Contracted:     ${contracted}
Total KOL Fees: ${totalFees > 0 ? `AUD $${totalFees.toLocaleString()}` : 'TBD'}

${'─'.repeat(50)}
KOL LIST
${'─'.repeat(50)}
${kolLines}

${'─'.repeat(50)}
OBJECTIVES & NOTES
${'─'.repeat(50)}

[Add campaign objectives here]
[Add key messages / talking points]
[Add content guidelines]

${'─'.repeat(50)}
PREPARED BY
${'─'.repeat(50)}

Hylink Australia
Generated: ${new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([brief], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign.name.replace(/\s+/g, '-').toLowerCase()}-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Campaign Brief"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handleDownload} className="btn-secondary gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download .txt
          </button>
          <button onClick={handleCopy} className="btn-primary gap-2">
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </>
      }
    >
      <textarea
        value={brief}
        readOnly
        rows={22}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none"
      />
    </Modal>
  );
}

// ─── Health Score Card ────────────────────────────────────────────────────────

function HealthScoreCard({ records }: { records: CampaignKolRecord[] }) {
  if (records.length === 0) return null;

  const PROGRESS_STATUSES = ['Contracted', 'Content_Submitted', 'Content_Approved', 'Published', 'Completed'];
  const PUBLISHED_STATUSES = ['Published', 'Completed'];

  const contracted = records.filter((r) => PROGRESS_STATUSES.includes(r.status)).length;
  const published = records.filter((r) => PUBLISHED_STATUSES.includes(r.status)).length;
  const totalFees = records.reduce((s, r) => s + (r.negotiatedFee ?? 0), 0);
  const paidFees = records.filter((r) => r.isPaid).reduce((s, r) => s + (r.negotiatedFee ?? 0), 0);

  const pipelineScore = Math.round((contracted / records.length) * 100);
  const publishedScore = Math.round((published / records.length) * 100);
  const paymentScore = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 100;
  const overall = Math.round((pipelineScore + publishedScore + paymentScore) / 3);

  const overallColor = overall >= 70 ? 'text-emerald-600' : overall >= 40 ? 'text-amber-500' : 'text-red-500';
  const overallBar = overall >= 70 ? 'bg-emerald-500' : overall >= 40 ? 'bg-amber-400' : 'bg-red-400';

  const metrics = [
    { label: 'Pipeline', value: pipelineScore, desc: `${contracted}/${records.length} contracted+` },
    { label: 'Published', value: publishedScore, desc: `${published}/${records.length} published` },
    { label: 'Payments', value: paymentScore, desc: totalFees > 0 ? `$${paidFees.toLocaleString()}/$${totalFees.toLocaleString()}` : 'N/A' },
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Campaign Health</h3>
        <span className={clsx('text-2xl font-bold tabular-nums', overallColor)}>
          {overall}
          <span className="text-sm font-normal text-gray-400">/100</span>
        </span>
      </div>
      {/* Overall bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div className={clsx('h-2 rounded-full transition-all duration-500', overallBar)} style={{ width: `${overall}%` }} />
      </div>
      {/* Sub-metrics */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{m.label}</span>
              <span className="text-xs font-semibold text-gray-700">{m.value}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div className="h-1 rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${m.value}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recommend Tab ────────────────────────────────────────────────────────────

function RecommendTab({
  campaignId,
  records,
}: {
  campaignId: string;
  records: CampaignKolRecord[];
}) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<Set<string>>(new Set());

  const existingKolIds = new Set(records.map((r) => r.kolId));

  // Collect tags from KOLs already in campaign for matching
  const existingTags = Array.from(new Set(records.flatMap((r) => (r.kol as { contentTags?: string[] })?.contentTags ?? [])));

  const { data, isLoading } = useQuery({
    queryKey: ['kol-recommendations', campaignId],
    queryFn: () => kolsApi.list({ isBlacklisted: false, limit: 100, sortBy: 'created_at', order: 'DESC' }),
  });

  const recommended = (data?.data ?? [])
    .filter((k) => !existingKolIds.has(k.id) && !k.isBlacklisted && !added.has(k.id))
    .sort((a, b) => {
      // Rank by tag overlap score first
      const aScore = a.contentTags.filter((t) => existingTags.includes(t)).length;
      const bScore = b.contentTags.filter((t) => existingTags.includes(t)).length;
      if (bScore !== aScore) return bScore - aScore;
      // Then by rating
      return (b.collaborationRating ?? 0) - (a.collaborationRating ?? 0);
    })
    .slice(0, 10);

  const handleAdd = async (kolId: string) => {
    setAdding((prev) => new Set(prev).add(kolId));
    try {
      await campaignsApi.addKols(campaignId, [kolId]);
      setAdded((prev) => new Set(prev).add(kolId));
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
    } finally {
      setAdding((prev) => { const next = new Set(prev); next.delete(kolId); return next; });
    }
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
        <svg className="h-5 w-5 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-primary-900">Smart Recommendations</p>
          <p className="text-xs text-primary-600 mt-0.5">
            {existingTags.length > 0
              ? `Ranked by tag overlap: ${existingTags.slice(0, 3).join(', ')}${existingTags.length > 3 ? '…' : ''}`
              : 'Top-rated KOLs from your database, not yet in this campaign'}
          </p>
        </div>
      </div>

      {recommended.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm">No recommendations available</p>
          <p className="text-xs text-gray-400 mt-1">All KOLs may already be in this campaign</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-gray-50">
          {recommended.map((kol) => {
            const top = kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
            const isAdding = adding.has(kol.id);
            const tagMatches = kol.contentTags.filter((t) => existingTags.includes(t));
            return (
              <div key={kol.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-600 text-sm font-bold border border-primary-100">
                  {kol.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{kol.name}</p>
                    {kol.kolTier && (
                      <span className="text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 flex-shrink-0">
                        {kol.kolTier.split('(')[0]}
                      </span>
                    )}
                    {kol.collaborationRating != null && (
                      <span className="text-xs text-amber-500 flex-shrink-0">★ {kol.collaborationRating}/5</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {top && (
                      <p className="text-xs text-gray-400">
                        {top.platformName}
                        {top.followersCount != null && ` · ${top.followersCount >= 1000 ? `${(top.followersCount / 1000).toFixed(0)}K` : top.followersCount}`}
                        {top.avgEngagementRate != null && ` · ${(top.avgEngagementRate * 100).toFixed(1)}% eng`}
                      </p>
                    )}
                    {tagMatches.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs rounded-full bg-amber-50 text-amber-700 px-1.5 py-0.5">{tag}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(kol.id)}
                  disabled={isAdding}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50 transition-colors"
                >
                  {isAdding ? (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Add
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Content Review Tab ───────────────────────────────────────────────────────

function ContentReviewTab({
  campaignId,
  records,
}: {
  campaignId: string;
  records: CampaignKolRecord[];
}) {
  const qc = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [publishUrl, setPublishUrl] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const awaiting = records.filter((r) => r.status === CampaignKolStatus.CONTENT_SUBMITTED);
  const approved = records.filter((r) => r.status === CampaignKolStatus.CONTENT_APPROVED);
  const published = records.filter((r) =>
    [CampaignKolStatus.PUBLISHED, CampaignKolStatus.COMPLETED].includes(r.status),
  );

  const hasContent = awaiting.length > 0 || approved.length > 0 || published.length > 0;

  const handleApprove = async (r: CampaignKolRecord) => {
    setLoadingId(r.kolId);
    try {
      await campaignsApi.updateCampaignKol(campaignId, r.kolId, {
        status: CampaignKolStatus.CONTENT_APPROVED,
        notes: reviewNotes || undefined,
        publishedUrls: reviewUrl ? [reviewUrl] : undefined,
      });
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
      setReviewingId(null);
      setReviewUrl('');
      setReviewNotes('');
    } finally {
      setLoadingId(null);
    }
  };

  const handleRequestRevision = async (r: CampaignKolRecord) => {
    if (!reviewNotes.trim()) return;
    setLoadingId(r.kolId);
    try {
      await campaignsApi.updateCampaignKol(campaignId, r.kolId, {
        notes: `[Revision requested] ${reviewNotes}`,
      });
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
      setReviewingId(null);
      setReviewNotes('');
    } finally {
      setLoadingId(null);
    }
  };

  const handleMarkPublished = async (r: CampaignKolRecord) => {
    setLoadingId(r.kolId);
    try {
      await campaignsApi.updateCampaignKol(campaignId, r.kolId, {
        status: CampaignKolStatus.PUBLISHED,
        publishedUrls: publishUrl ? [publishUrl] : r.publishedUrls,
      });
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
      setPublishingId(null);
      setPublishUrl('');
    } finally {
      setLoadingId(null);
    }
  };

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm font-medium">No content ready for review</p>
        <p className="text-xs text-gray-400 mt-1">Move KOLs to "Content Submitted" status to start the review process</p>
      </div>
    );
  }

  const KolRow = ({ r, section }: { r: CampaignKolRecord; section: 'awaiting' | 'approved' | 'published' }) => {
    const isReviewing = reviewingId === r.kolId;
    const isPublishing = publishingId === r.kolId;
    const isLoading = loadingId === r.kolId;

    return (
      <div key={r.id} className="border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-primary-50 text-primary-600 text-xs font-bold border border-primary-100">
            {r.kol.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{r.kol.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {r.kol.platforms?.[0] && (
                <p className="text-xs text-gray-400">{r.kol.platforms[0].platformName}</p>
              )}
              {r.notes && (
                <p className="text-xs text-amber-600 truncate max-w-xs">{r.notes}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {section === 'awaiting' && (
              <>
                <button
                  onClick={() => { setReviewingId(isReviewing ? null : r.kolId); setReviewNotes(''); setReviewUrl(''); }}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    isReviewing ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100',
                  )}
                >
                  {isReviewing ? 'Cancel' : 'Review'}
                </button>
              </>
            )}
            {section === 'approved' && !isPublishing && (
              <button
                onClick={() => { setPublishingId(r.kolId); setPublishUrl(r.publishedUrls?.[0] ?? ''); }}
                className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium transition-colors"
              >
                Mark Published
              </button>
            )}
            {section === 'approved' && isPublishing && (
              <button
                onClick={() => setPublishingId(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
            {section === 'published' && r.publishedUrls?.[0] && (
              <a
                href={r.publishedUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                View post →
              </a>
            )}
          </div>
        </div>

        {/* Review panel (awaiting) */}
        {section === 'awaiting' && isReviewing && (
          <div className="mx-4 mb-3 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Content URL (optional)</label>
              <input
                type="url"
                value={reviewUrl}
                onChange={(e) => setReviewUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add feedback or approval notes…"
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApprove(r)}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Approve Content
              </button>
              <button
                onClick={() => handleRequestRevision(r)}
                disabled={isLoading || !reviewNotes.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 px-4 py-1.5 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Request Revision
              </button>
            </div>
          </div>
        )}

        {/* Publish panel (approved) */}
        {section === 'approved' && isPublishing && (
          <div className="mx-4 mb-3 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Published URL</label>
              <input
                type="url"
                value={publishUrl}
                onChange={(e) => setPublishUrl(e.target.value)}
                placeholder="https://instagram.com/p/..."
                className="input text-sm"
              />
            </div>
            <button
              onClick={() => handleMarkPublished(r)}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg bg-primary-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : null}
              Confirm Published
            </button>
          </div>
        )}
      </div>
    );
  };

  const Section = ({ title, color, count, children }: { title: string; color: string; count: number; children: React.ReactNode }) => (
    <div className="card overflow-hidden">
      <div className={clsx('flex items-center gap-2 px-4 py-2.5 border-b border-gray-100', color)}>
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold">{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Workflow guide */}
      <div className="flex items-center gap-2 text-xs text-gray-400 overflow-x-auto pb-1">
        {[
          { label: 'Content Submitted', color: 'bg-amber-400' },
          { label: '→', color: '' },
          { label: 'Approve / Request Revision', color: 'bg-emerald-400' },
          { label: '→', color: '' },
          { label: 'Mark Published', color: 'bg-primary-400' },
          { label: '→', color: '' },
          { label: 'Done', color: 'bg-gray-400' },
        ].map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            {s.color && <span className={clsx('h-2 w-2 rounded-full flex-shrink-0', s.color)} />}
            {s.label}
          </span>
        ))}
      </div>

      {awaiting.length > 0 && (
        <Section title="Awaiting Review" color="bg-amber-50 text-amber-700" count={awaiting.length}>
          {awaiting.map((r) => <KolRow key={r.id} r={r} section="awaiting" />)}
        </Section>
      )}

      {approved.length > 0 && (
        <Section title="Approved — Ready to Publish" color="bg-emerald-50 text-emerald-700" count={approved.length}>
          {approved.map((r) => <KolRow key={r.id} r={r} section="approved" />)}
        </Section>
      )}

      {published.length > 0 && (
        <Section title="Published" color="bg-gray-50 text-gray-600" count={published.length}>
          {published.map((r) => <KolRow key={r.id} r={r} section="published" />)}
        </Section>
      )}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ campaign, records }: { campaign: Campaign; records: CampaignKolRecord[] }) {
  const summary = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalFees = records.reduce((sum, r) => sum + (r.negotiatedFee ?? 0), 0);
  const paidFees = records.filter(r => r.isPaid).reduce((sum, r) => sum + (r.negotiatedFee ?? 0), 0);
  const unpaidFees = totalFees - paidFees;

  return (
    <div className="space-y-6">
      {/* Campaign info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total KOLs</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{records.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">KOL Fees</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">${totalFees.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-600">${paidFees.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">${unpaidFees.toLocaleString()}</p>
        </div>
      </div>

      {/* Campaign details */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Campaign Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Client</p>
            <p className="text-gray-800">{campaign.clientName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Start Date</p>
            <p className="text-gray-800">{campaign.startDate ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">End Date</p>
            <p className="text-gray-800">{campaign.endDate ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Budget</p>
            <p className="text-gray-800">{campaign.budget != null ? `AUD $${campaign.budget.toLocaleString()}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Client Billing</p>
            <p className="text-gray-800">{campaign.clientBilling != null ? `AUD $${campaign.clientBilling.toLocaleString()}` : '—'}</p>
          </div>
          {campaign.briefDocumentUrl && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Brief</p>
              <a href={campaign.briefDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm">View document →</a>
            </div>
          )}
        </div>
      </div>

      {/* Campaign health score */}
      <HealthScoreCard records={records} />

      {/* Pipeline summary */}
      {Object.keys(summary).length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">KOL Pipeline Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).map(([status, count]) => (
              <span key={status} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {status.replace(/_/g, ' ')}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ records }: { records: CampaignKolRecord[] }) {
  const contracted = records.filter(r =>
    ['Contracted', 'Content_Submitted', 'Content_Approved', 'Published', 'Completed'].includes(r.status)
  ).length;
  const published = records.filter(r => ['Published', 'Completed'].includes(r.status)).length;
  const completed = records.filter(r => r.status === 'Completed').length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Contracted', value: contracted, color: 'text-indigo-600' },
          { label: 'Published', value: published, color: 'text-green-600' },
          { label: 'Completed', value: completed, color: 'text-gray-600' },
        ].map(item => (
          <div key={item.label} className="card p-4 text-center">
            <p className={clsx('text-3xl font-bold', item.color)}>{item.value}</p>
            <p className="mt-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">{item.label}</p>
          </div>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No analytics data yet</p>
          <p className="text-xs text-gray-400 mt-1">Analytics will appear as KOLs progress through the pipeline</p>
        </div>
      ) : (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">KOL Performance Summary</h3>
          <div className="divide-y divide-gray-100">
            {records
              .filter(r => r.negotiatedFee != null)
              .sort((a, b) => (b.negotiatedFee ?? 0) - (a.negotiatedFee ?? 0))
              .slice(0, 10)
              .map(r => (
                <div key={r.kolId} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center border border-primary-100 flex-shrink-0">
                      {r.kol.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.kol.name}</p>
                      <p className="text-xs text-gray-400">{r.status.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={clsx('text-xs', r.isPaid ? 'text-green-600 font-medium' : 'text-amber-600')}>
                      {r.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    <span className="font-semibold text-gray-800">
                      AUD ${(r.negotiatedFee ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main detail page ─────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('kols');
  const [pipelineView, setPipelineView] = useState<'kanban' | 'list'>('kanban');
  const [drawerRecord, setDrawerRecord] = useState<CampaignKolRecord | null>(null);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addKolsOpen, setAddKolsOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!campaign) return;
    setDownloading(true);
    try {
      await reportingApi.downloadCampaignReport(campaign.id, campaign.name);
    } finally {
      setDownloading(false);
    }
  };

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id!),
    enabled: !!id,
  });

  const { data: records = [], isLoading: kolsLoading } = useQuery({
    queryKey: ['campaign-kols', id],
    queryFn: () => campaignsApi.getCampaignKols(id!),
    enabled: !!id,
  });

  if (campaignLoading) return <PageSpinner />;
  if (!campaign) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-sm">Campaign not found.</p>
      <button onClick={() => navigate('/campaigns')} className="mt-3 btn-ghost text-sm">← Back</button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-0">
      {/* Back link */}
      <button
        onClick={() => navigate('/campaigns')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Campaigns
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <Badge variant={STATUS_VARIANT[campaign.status] ?? 'gray'}>{campaign.status}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{campaign.clientName}</p>
          {(campaign.startDate || campaign.endDate) && (
            <p className="mt-1 text-xs text-gray-400">
              {campaign.startDate ?? '?'} → {campaign.endDate ?? '?'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="btn-secondary gap-1.5 text-sm"
          >
            {downloading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF Report
              </>
            )}
          </button>
          {campaign.briefDocumentUrl && (
            <a
              href={campaign.briefDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary gap-1.5 text-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Brief
            </a>
          )}
          <button onClick={() => setBriefOpen(true)} className="btn-secondary gap-1.5 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Brief
          </button>
          <button onClick={() => setPortalModalOpen(true)} className="btn-secondary gap-1.5 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Portal link
          </button>
          <button onClick={() => setEditModalOpen(true)} className="btn-secondary gap-1.5 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          {activeTab === 'kols' && (
            <>
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  onClick={() => setPipelineView('kanban')}
                  title="Kanban view"
                  className={clsx('rounded-md p-1.5 transition-colors', pipelineView === 'kanban' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </button>
                <button
                  onClick={() => setPipelineView('list')}
                  title="List view"
                  className={clsx('rounded-md p-1.5 transition-colors', pipelineView === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600')}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <button onClick={() => setAddKolsOpen(true)} className="btn-primary gap-1.5 text-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add KOLs
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
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
            {tab.id === 'kols' && records.length > 0 && (
              <span className={clsx(
                'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
              )}>
                {records.length}
              </span>
            )}
            {tab.id === 'content' && (() => {
              const n = records.filter(r => [CampaignKolStatus.CONTENT_SUBMITTED, CampaignKolStatus.CONTENT_APPROVED].includes(r.status)).length;
              return n > 0 ? (
                <span className={clsx(
                  'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                  activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-amber-50 text-amber-600',
                )}>
                  {n}
                </span>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <OverviewTab campaign={campaign} records={records} />
      )}

      {activeTab === 'kols' && (
        kolsLoading ? (
          <PageSpinner />
        ) : pipelineView === 'kanban' ? (
          <CampaignKanban
            campaignId={id!}
            records={records}
            onCardClick={setDrawerRecord}
          />
        ) : (
          <PipelineListView
            campaignId={id!}
            records={records}
            onRowClick={setDrawerRecord}
          />
        )
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab records={records} />
      )}

      {activeTab === 'recommend' && (
        <RecommendTab campaignId={id!} records={records} />
      )}

      {activeTab === 'content' && (
        <ContentReviewTab campaignId={id!} records={records} />
      )}

      {/* KOL detail drawer */}
      <KolDetailDrawer
        record={drawerRecord}
        campaignId={id!}
        onClose={() => setDrawerRecord(null)}
      />

      {/* Portal link modal */}
      <PortalLinkModal
        campaign={campaign}
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
      />

      {/* Edit campaign modal */}
      <CampaignFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        campaign={campaign}
      />

      {/* Add KOLs modal */}
      <AddKolsModal
        campaignId={id!}
        open={addKolsOpen}
        onClose={() => setAddKolsOpen(false)}
      />

      {/* Campaign Brief modal */}
      <CampaignBriefModal
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        campaign={campaign}
        records={records}
      />
    </div>
  );
}
