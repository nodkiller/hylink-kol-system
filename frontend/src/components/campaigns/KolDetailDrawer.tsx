import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignKolRecord } from '@/api/campaigns.api';
import { leadsApi } from '@/api/leads.api';
import { CampaignKolStatus } from '@/types';
import clsx from 'clsx';
import PostResultsSection from './PostResultsSection';
import LeadsModal from './LeadsModal';

interface Props {
  record: CampaignKolRecord | null;
  campaignId: string;
  onClose: () => void;
}

const STATUS_OPTIONS = Object.values(CampaignKolStatus);

const TRACKING_BASE = 'https://chery.com.au/test-drive';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Deliverables Checklist ───────────────────────────────────────────────────

const DEFAULT_DELIVERABLES = ['Reel (60s)', 'Story x3', 'Static Post', 'TikTok Video', 'YouTube Short', 'Blog Post', 'Live Stream'];

function DeliverablesChecklist({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  // value is { [label]: boolean, ... }
  const [newItem, setNewItem] = useState('');

  // Get all keys: defaults + any custom ones in value
  const allKeys = Array.from(new Set([
    ...DEFAULT_DELIVERABLES,
    ...Object.keys(value).filter((k) => !DEFAULT_DELIVERABLES.includes(k)),
  ]));

  const toggle = (key: string) => {
    onChange({ ...value, [key]: !value[key] });
  };

  const addCustom = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange({ ...value, [trimmed]: false });
    setNewItem('');
  };

  const doneCount = allKeys.filter((k) => value[k]).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label">Deliverables Checklist</label>
        <span className="text-xs text-gray-400">{doneCount}/{allKeys.length} done</span>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {allKeys.map((key, i) => (
          <label
            key={key}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors',
              i > 0 && 'border-t border-gray-100',
            )}
          >
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className={clsx(
              'text-sm flex-1',
              value[key] ? 'line-through text-gray-400' : 'text-gray-700',
            )}>
              {key}
            </span>
          </label>
        ))}
        {/* Add custom */}
        <div className="border-t border-gray-100 flex items-center gap-2 px-3 py-2">
          <input
            type="text"
            placeholder="Add custom deliverable…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-300 text-gray-700"
          />
          <button
            onClick={addCustom}
            className="text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors px-1"
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KolDetailDrawer({ record, campaignId, onClose }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<CampaignKolStatus>(CampaignKolStatus.SHORTLISTED);
  const [negotiatedFee, setNegotiatedFee] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [deliverables, setDeliverables] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);

  useEffect(() => {
    if (!record) return;
    setStatus(record.status);
    setNegotiatedFee(record.negotiatedFee != null ? String(record.negotiatedFee) : '');
    setIsPaid(record.isPaid ?? false);
    setInvoiceRef(record.invoiceRef ?? '');
    setDeliverables(record.deliverables ?? {});
    setNotes(record.notes ?? '');
    setCopied(false);
  }, [record]);

  // Lead stats for this KOL
  const { data: leadStats } = useQuery({
    queryKey: ['leads', record?.id],
    queryFn: () => leadsApi.getByKol(record!.id),
    enabled: Boolean(record?.id),
    select: (leads) => ({
      total: leads.length,
      testDrives: leads.filter(l => l.status === 'TestDriveBooked' || l.status === 'TestDriveCompleted').length,
      converted: leads.filter(l => l.status === 'Converted').length,
    }),
  });

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof campaignsApi.updateCampaignKol>[2]) =>
      campaignsApi.updateCampaignKol(campaignId, record!.kolId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] }),
  });

  const handleSave = () => {
    if (!record) return;
    mutation.mutate({
      status,
      negotiatedFee: negotiatedFee ? Number(negotiatedFee) : undefined,
      isPaid, invoiceRef: invoiceRef || undefined, deliverables, notes,
    });
  };

  const handleCopy = () => {
    if (!record?.trackingCode) return;
    const url = `${TRACKING_BASE}?ref=${record.trackingCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const kol = record?.kol;
  const topPlatform = kol?.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity',
          record ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={clsx(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white border-l border-gray-200 shadow-2xl transition-transform duration-300',
          record ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-900 truncate">{kol?.name ?? '—'}</h2>
            {kol?.nickname && <p className="text-xs text-gray-400">@{kol.nickname}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* KOL info strip */}
          {kol && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-1.5">
                {kol.kolTier && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                    {kol.kolTier}
                  </span>
                )}
                {kol.isBlacklisted && (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 ring-1 ring-red-200">
                    Blacklisted
                  </span>
                )}
                {kol.contentTags?.map((tag) => (
                  <span key={tag} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                    {tag}
                  </span>
                ))}
              </div>
              {topPlatform && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{topPlatform.platformName}</span>
                  {topPlatform.followersCount != null && (
                    <> · {topPlatform.followersCount >= 1000
                      ? `${(topPlatform.followersCount / 1000).toFixed(0)}K`
                      : topPlatform.followersCount} followers</>
                  )}
                  {topPlatform.avgEngagementRate != null && (
                    <> · {(topPlatform.avgEngagementRate * 100).toFixed(1)}% eng</>
                  )}
                </p>
              )}
              {kol.city && <p className="text-xs text-gray-400">{kol.city}, {kol.country}</p>}
            </div>
          )}

          {/* ── Tracking Link + Lead Stats ─────────────────────────── */}
          {record?.trackingCode && (
            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tracking Link</p>
                <span className="text-xs font-mono text-gray-400">{record.trackingCode}</span>
              </div>

              {/* URL copy row */}
              <div className="px-4 py-3 flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                  {TRACKING_BASE}?ref={record.trackingCode}
                </code>
                <button
                  onClick={handleCopy}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex-shrink-0',
                    copied
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
                  )}
                >
                  {copied ? (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Lead stats row */}
              <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-3 divide-x divide-gray-100">
                {[
                  { label: 'Leads', value: leadStats?.total ?? 0, color: 'text-gray-900' },
                  { label: 'Test Drives', value: leadStats?.testDrives ?? 0, color: 'text-purple-600' },
                  { label: 'Converted', value: leadStats?.converted ?? 0, color: 'text-green-600' },
                ].map(item => (
                  <div key={item.label} className="text-center px-2">
                    <p className={clsx('text-xl font-bold', item.color)}>{item.value}</p>
                    <p className="text-xs text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* View leads button */}
              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => setLeadsModalOpen(true)}
                  className="w-full rounded-lg py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                >
                  View & manage leads →
                </button>
              </div>
            </div>
          )}

          {/* Client feedback */}
          {record?.clientFeedback && (
            <div className={clsx(
              'rounded-xl border px-4 py-3 text-sm',
              record.clientFeedback === 'Approved'
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50',
            )}>
              <p className={clsx('font-semibold', record.clientFeedback === 'Approved' ? 'text-green-700' : 'text-red-600')}>
                {record.clientFeedback === 'Approved' ? '✓ Client approved' : '✗ Client rejected'}
              </p>
              {record.clientComment && (
                <p className="mt-1 text-xs text-gray-500">"{record.clientComment}"</p>
              )}
            </div>
          )}

          {/* Status */}
          <div>
            <label className="label">Pipeline Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignKolStatus)}
              className="input mt-1"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {record?.statusUpdatedAt && (
              <p className="mt-0.5 text-xs text-gray-400">Last updated {formatDate(record.statusUpdatedAt)}</p>
            )}
          </div>

          {/* Negotiated fee */}
          <div>
            <label className="label">Negotiated Fee (AUD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" min={0} step={100} placeholder="0"
                value={negotiatedFee}
                onChange={(e) => setNegotiatedFee(e.target.value)}
                className="input pl-7"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Paid</p>
                <p className="text-xs text-gray-400">Mark when fee has been paid</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid((v) => !v)}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  isPaid ? 'bg-green-500' : 'bg-gray-200',
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
                    isPaid ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>
            <div>
              <label className="label">Invoice / Payment Ref</label>
              <input
                type="text" value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="INV-2025-001"
                className="input mt-1 text-sm" maxLength={100}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Internal Notes</label>
            <textarea
              rows={3} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this KOL…"
              className="input mt-1 resize-y"
            />
          </div>

          {/* Deliverables */}
          <DeliverablesChecklist value={deliverables} onChange={setDeliverables} />

          {/* Post Results */}
          <div className="border-t border-gray-100 pt-5">
            {record && (
              <PostResultsSection campaignId={campaignId} campaignKolId={record.id} />
            )}
          </div>

          {/* Meta */}
          {record && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-400 space-y-0.5">
              {record.assignedTo && (
                <p>Assigned to: <span className="text-gray-600">{record.assignedTo.fullName}</span></p>
              )}
              <p>Added to campaign: {formatDate(record.createdAt)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
          {mutation.isSuccess && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
          {mutation.isError && <span className="text-xs text-red-500">Save failed</span>}
          {!mutation.isSuccess && !mutation.isError && <span />}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Leads modal */}
      {record && (
        <LeadsModal
          open={leadsModalOpen}
          onClose={() => setLeadsModalOpen(false)}
          campaignKolId={record.id}
          kolName={kol?.name ?? '—'}
        />
      )}
    </>
  );
}
