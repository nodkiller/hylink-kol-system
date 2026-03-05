import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { portalApi } from '@/api/portal.api';
import type { CampaignKolRecord } from '@/api/campaigns.api';
import clsx from 'clsx';

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({
  campaignId,
  onVerified,
}: {
  campaignId: string;
  onVerified: (password: string, campaignName: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => portalApi.verify(campaignId, password),
    onSuccess: (data) => {
      onVerified(password, data.campaignName);
    },
    onError: () => {
      setError('Incorrect password. Please try again.');
      setPassword('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">KOL Review Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Enter your password to access the campaign</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-xl border border-gray-100 space-y-4">
          <div>
            <label className="label">Portal Password</label>
            <input
              type="password"
              placeholder="Enter password…"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className={clsx('input mt-1', error && 'border-red-400 focus:ring-red-400')}
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!password.trim() || mutation.isPending}
            className="btn-primary w-full justify-center"
          >
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Verifying…
              </span>
            ) : 'Access Portal'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Powered by Hylink KOL System
        </p>
      </div>
    </div>
  );
}

// ─── Feedback button group ────────────────────────────────────────────────────

function FeedbackControls({
  record,
  campaignId,
  password,
  onFeedbackSent,
}: {
  record: CampaignKolRecord;
  campaignId: string;
  password: string;
  onFeedbackSent: () => void;
}) {
  const [comment, setComment] = useState('');
  const [pendingFeedback, setPendingFeedback] = useState<'Approved' | 'Rejected' | null>(null);

  const mutation = useMutation({
    mutationFn: (feedback: 'Approved' | 'Rejected') =>
      portalApi.submitFeedback(campaignId, record.kolId, password, {
        clientFeedback: feedback,
        clientComment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      setPendingFeedback(null);
      setComment('');
      onFeedbackSent();
    },
  });

  // Already has feedback
  if (record.clientFeedback) {
    return (
      <div className={clsx(
        'rounded-xl border px-4 py-3',
        record.clientFeedback === 'Approved'
          ? 'border-green-200 bg-green-50'
          : 'border-red-200 bg-red-50',
      )}>
        <p className={clsx(
          'text-sm font-semibold',
          record.clientFeedback === 'Approved' ? 'text-green-700' : 'text-red-700',
        )}>
          {record.clientFeedback === 'Approved' ? '✓ Approved' : '✗ Rejected'}
        </p>
        {record.clientComment && (
          <p className="mt-0.5 text-xs text-gray-500">"{record.clientComment}"</p>
        )}
      </div>
    );
  }

  if (pendingFeedback) {
    return (
      <div className={clsx(
        'rounded-xl border p-4 space-y-3',
        pendingFeedback === 'Approved' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
      )}>
        <p className={clsx('text-sm font-semibold', pendingFeedback === 'Approved' ? 'text-green-700' : 'text-red-700')}>
          {pendingFeedback === 'Approved' ? 'Approving this KOL' : 'Rejecting this KOL'}
        </p>
        <textarea
          rows={2}
          placeholder="Optional comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input text-sm resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate(pendingFeedback)}
            disabled={mutation.isPending}
            className={clsx(
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors',
              pendingFeedback === 'Approved'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700',
              mutation.isPending && 'opacity-60 pointer-events-none',
            )}
          >
            {mutation.isPending ? 'Submitting…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setPendingFeedback(null); setComment(''); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setPendingFeedback('Approved')}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Approve
      </button>
      <button
        onClick={() => setPendingFeedback('Rejected')}
        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Reject
      </button>
    </div>
  );
}

// ─── KOL card (portal view) ───────────────────────────────────────────────────

function PortalKolCard({
  record,
  campaignId,
  password,
  onFeedbackSent,
}: {
  record: CampaignKolRecord;
  campaignId: string;
  password: string;
  onFeedbackSent: () => void;
}) {
  const kol = record.kol;
  const platforms = [...(kol.platforms ?? [])].sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0));

  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="p-5 flex-1 space-y-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-lg font-bold">
            {kol.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{kol.name}</h3>
            {kol.nickname && (
              <p className="text-sm text-gray-400">@{kol.nickname}</p>
            )}
          </div>
        </div>

        {/* Tags */}
        {kol.contentTags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {kol.contentTags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Platforms */}
        {platforms.length > 0 && (
          <div className="space-y-1.5">
            {platforms.map((p) => (
              <div key={p.platformName} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{p.platformName}</span>
                <div className="text-right text-gray-500 text-xs">
                  {p.followersCount != null && (
                    <span>
                      {p.followersCount >= 1_000_000
                        ? `${(p.followersCount / 1_000_000).toFixed(1)}M`
                        : p.followersCount >= 1000
                          ? `${(p.followersCount / 1000).toFixed(0)}K`
                          : p.followersCount}{' '}
                      followers
                    </span>
                  )}
                  {p.avgEngagementRate != null && (
                    <span className="ml-2">{(p.avgEngagementRate * 100).toFixed(1)}% eng</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Location */}
        {(kol.city || kol.country) && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {[kol.city, kol.country].filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      {/* Feedback section */}
      <div className="border-t border-gray-100 p-4">
        <FeedbackControls
          record={record}
          campaignId={campaignId}
          password={password}
          onFeedbackSent={onFeedbackSent}
        />
      </div>
    </div>
  );
}

// ─── Authenticated portal view ─────────────────────────────────────────────────

function PortalView({
  campaignId,
  campaignName,
  password,
  onLogout,
}: {
  campaignId: string;
  campaignName: string;
  password: string;
  onLogout: () => void;
}) {
  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['portal-shortlist', campaignId],
    queryFn: () => portalApi.getShortlist(campaignId, password),
  });

  const approvedCount = records.filter((r) => r.clientFeedback === 'Approved').length;
  const rejectedCount = records.filter((r) => r.clientFeedback === 'Rejected').length;
  const pendingCount = records.filter((r) => !r.clientFeedback).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">KOL Review Portal</p>
            <h1 className="text-lg font-bold text-gray-900 truncate">{campaignName}</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Summary pills */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 font-medium">
                {records.length} KOLs
              </span>
              {approvedCount > 0 && (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700 font-medium">
                  {approvedCount} approved
                </span>
              )}
              {rejectedCount > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700 font-medium">
                  {rejectedCount} rejected
                </span>
              )}
              {pendingCount > 0 && (
                <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-yellow-700 font-medium">
                  {pendingCount} pending
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <svg className="h-8 w-8 animate-spin text-primary-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="h-12 w-12 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
            <p className="text-sm">No KOLs have been submitted for review yet.</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              Please review the KOLs below and submit your approval or rejection for each one. Your feedback will be shared directly with the team.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((record) => (
                <PortalKolCard
                  key={record.kolId}
                  record={record}
                  campaignId={campaignId}
                  password={password}
                  onFeedbackSent={() => refetch()}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Root portal page ─────────────────────────────────────────────────────────

export default function PortalPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<{ password: string; campaignName: string } | null>(null);

  if (!id) return null;

  if (!session) {
    return (
      <PasswordGate
        campaignId={id}
        onVerified={(password, campaignName) => setSession({ password, campaignName })}
      />
    );
  }

  return (
    <PortalView
      campaignId={id}
      campaignName={session.campaignName}
      password={session.password}
      onLogout={() => setSession(null)}
    />
  );
}
