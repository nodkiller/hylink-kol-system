import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignKolRecord } from '@/api/campaigns.api';
import { CampaignKolStatus } from '@/types';
import clsx from 'clsx';
import PostResultsSection from './PostResultsSection';

interface Props {
  record: CampaignKolRecord | null;
  campaignId: string;
  onClose: () => void;
}

const STATUS_OPTIONS = Object.values(CampaignKolStatus);

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function JsonTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    try {
      const parsed = JSON.parse(raw);
      setError('');
      onChange(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        className={clsx('input mt-1 font-mono text-xs resize-y', error && 'border-red-400')}
        spellCheck={false}
      />
      {error && <p className="mt-0.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function UrlListEditor({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const add = () => onChange([...urls, '']);
  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) => onChange(urls.map((u, idx) => (idx === i ? val : u)));

  return (
    <div>
      <label className="label">Published URLs</label>
      <div className="mt-1 space-y-1.5">
        {urls.map((url, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              type="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => update(i, e.target.value)}
              className="input flex-1 text-xs"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add URL
        </button>
      </div>
    </div>
  );
}

export default function KolDetailDrawer({ record, campaignId, onClose }: Props) {
  const qc = useQueryClient();

  // Local form state
  const [status, setStatus] = useState<CampaignKolStatus>(CampaignKolStatus.SHORTLISTED);
  const [negotiatedFee, setNegotiatedFee] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [invoiceRef, setInvoiceRef] = useState('');
  const [deliverables, setDeliverables] = useState<Record<string, unknown>>({});
  const [notes, setNotes] = useState('');

  // Sync local state when record changes
  useEffect(() => {
    if (!record) return;
    setStatus(record.status);
    setNegotiatedFee(record.negotiatedFee != null ? String(record.negotiatedFee) : '');
    setIsPaid(record.isPaid ?? false);
    setInvoiceRef(record.invoiceRef ?? '');
    setDeliverables(record.deliverables ?? {});
    setNotes(record.notes ?? '');
  }, [record]);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof campaignsApi.updateCampaignKol>[2]) =>
      campaignsApi.updateCampaignKol(campaignId, record!.kolId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
    },
  });

  const handleSave = () => {
    if (!record) return;
    mutation.mutate({
      status,
      negotiatedFee: negotiatedFee ? Number(negotiatedFee) : undefined,
      isPaid,
      invoiceRef: invoiceRef || undefined,
      deliverables,
      notes,
    });
  };

  const kol = record?.kol;
  const topPlatform = kol?.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/30 transition-opacity',
          record ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={clsx(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-gray-900 border-l border-gray-800 shadow-2xl transition-transform duration-300',
          record ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-gray-100 truncate">{kol?.name ?? '—'}</h2>
            {kol?.nickname && <p className="text-xs text-gray-400">@{kol.nickname}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
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
            <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {kol.kolTier && (
                  <span className="rounded-full bg-primary-900/40 px-2.5 py-0.5 text-xs font-medium text-primary-400">
                    {kol.kolTier}
                  </span>
                )}
                {kol.isBlacklisted && (
                  <span className="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    Blacklisted
                  </span>
                )}
                {kol.contentTags?.map((tag) => (
                  <span key={tag} className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-300">
                    {tag}
                  </span>
                ))}
              </div>
              {topPlatform && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-300">{topPlatform.platformName}</span>
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

          {/* Client feedback (if any) */}
          {record?.clientFeedback && (
            <div className={clsx(
              'rounded-xl border px-4 py-3 text-sm',
              record.clientFeedback === 'Approved'
                ? 'border-green-700/40 bg-green-900/20'
                : 'border-red-700/40 bg-red-900/20',
            )}>
              <p className={clsx('font-semibold', record.clientFeedback === 'Approved' ? 'text-green-400' : 'text-red-400')}>
                {record.clientFeedback === 'Approved' ? '✓ Client approved' : '✗ Client rejected'}
              </p>
              {record.clientComment && (
                <p className="mt-1 text-xs text-gray-400">"{record.clientComment}"</p>
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
              <p className="mt-0.5 text-xs text-gray-400">
                Last updated {formatDate(record.statusUpdatedAt)}
              </p>
            )}
          </div>

          {/* Negotiated fee */}
          <div>
            <label className="label">Negotiated Fee (AUD)</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={100}
                placeholder="0"
                value={negotiatedFee}
                onChange={(e) => setNegotiatedFee(e.target.value)}
                className="input pl-7"
              />
            </div>
          </div>

          {/* Payment tracking */}
          <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Paid</p>
                <p className="text-xs text-gray-500">Mark when negotiated fee has been paid</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid((v) => !v)}
                className={clsx(
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                  isPaid ? 'bg-green-500' : 'bg-gray-600',
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
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="INV-2025-001"
                className="input mt-1 text-sm"
                maxLength={100}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Internal Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this KOL…"
              className="input mt-1 resize-y"
            />
          </div>

          {/* Deliverables (JSON) */}
          <JsonTextarea label="Deliverables (JSON)" value={deliverables} onChange={setDeliverables} />

          {/* Post Results — structured per-post metrics */}
          <div className="border-t border-gray-800 pt-5">
            {record && (
              <PostResultsSection
                campaignId={campaignId}
                campaignKolId={record.id}
              />
            )}
          </div>

          {/* Meta */}
          {record && (
            <div className="rounded-lg bg-gray-800/50 border border-gray-700/50 p-3 text-xs text-gray-500 space-y-0.5">
              {record.assignedTo && (
                <p>Assigned to: <span className="text-gray-300">{record.assignedTo.fullName}</span></p>
              )}
              <p>Added to campaign: {formatDate(record.createdAt)}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4 flex items-center justify-between gap-3">
          {mutation.isSuccess && (
            <span className="text-xs text-green-400 font-medium">Saved ✓</span>
          )}
          {mutation.isError && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
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
    </>
  );
}
