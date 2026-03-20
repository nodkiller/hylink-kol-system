import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { kolsApi } from '@/api/kols.api';
import { TierBadge, PlatformBadge, BlacklistedBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import KolFormModal from '@/components/kols/KolFormModal';
import clsx from 'clsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFollowers(n?: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatEngagement(n?: number) {
  if (!n) return '—';
  return `${(Number(n) * 100).toFixed(2)}%`;
}

function StarRating({ value, onChange }: { value?: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const v = Number(value ?? 0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={clsx(
            'transition-colors',
            onChange ? 'cursor-pointer' : 'cursor-default',
          )}
        >
          <svg
            className={clsx(
              'h-5 w-5',
              star <= (hover || Math.round(v))
                ? 'text-yellow-400'
                : 'text-gray-200',
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {v > 0 && <span className="ml-1.5 text-sm text-gray-500">{v.toFixed(1)}</span>}
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'platforms' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'platforms', label: 'Platforms' },
  { id: 'notes', label: 'Notes & Rating' },
];

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ kol }: { kol: NonNullable<Awaited<ReturnType<typeof kolsApi.getById>>> }) {
  const topPlatform = [...(kol.platforms ?? [])].sort(
    (a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0),
  )[0];

  const totalFollowers = (kol.platforms ?? []).reduce(
    (sum, p) => sum + (p.followersCount ?? 0), 0,
  );

  return (
    <div className="space-y-5">
      {/* Top metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Platforms</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kol.platforms?.length ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Followers</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatFollowers(totalFollowers)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Top Engagement</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {topPlatform ? formatEngagement(topPlatform.avgEngagementRate) : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rating</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {kol.collaborationRating ? `${Number(kol.collaborationRating).toFixed(1)} / 5` : '—'}
          </p>
        </div>
      </div>

      {/* Profile details */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Information</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
          {[
            { label: 'Location', value: [kol.city, kol.country].filter(Boolean).join(', ') || null },
            { label: 'Primary Language', value: kol.primaryLanguage },
            { label: 'Ethnicity', value: kol.ethnicityBackground },
            { label: 'Contact Email', value: kol.contactEmail },
            { label: 'Tier', value: kol.kolTier },
            { label: 'Agency', value: kol.talentAgencyName },
            { label: 'Agency Contact', value: kol.talentAgencyContact },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-gray-800">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content tags */}
      {kol.contentTags && kol.contentTags.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Content Tags</h3>
          <div className="flex flex-wrap gap-2">
            {kol.contentTags.map((tag) => (
              <span key={tag} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Added date */}
      <p className="text-xs text-gray-400">
        Added {new Date(kol.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}ID: {kol.id.slice(0, 8)}…
      </p>
    </div>
  );
}

// ─── Platforms tab ────────────────────────────────────────────────────────────

function PlatformsTab({ kol }: { kol: NonNullable<Awaited<ReturnType<typeof kolsApi.getById>>> }) {
  const platforms = [...(kol.platforms ?? [])].sort(
    (a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0),
  );

  if (platforms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <p className="text-sm">No platform accounts linked</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {platforms.map((p) => (
        <div key={p.id} className="card p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <PlatformBadge platform={p.platformName} />
              <span className="text-sm text-gray-500">@{p.handle}</span>
            </div>
            {p.profileUrl && (
              <a
                href={p.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:text-primary-800 transition-colors flex items-center gap-1"
              >
                View profile
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">{formatFollowers(p.followersCount)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Followers</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{formatEngagement(p.avgEngagementRate)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Avg Engagement</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {p.followersCount && p.avgEngagementRate
                  ? formatFollowers(Math.round(p.followersCount * p.avgEngagementRate))
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Avg Engagements</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Notes tab ────────────────────────────────────────────────────────────────

function NotesTab({ kol }: { kol: NonNullable<Awaited<ReturnType<typeof kolsApi.getById>>> }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(kol.agencyInternalNotes ?? '');
  const [rating, setRating] = useState<number>(Number(kol.collaborationRating ?? 0));
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => kolsApi.update(kol.id, {
      agencyInternalNotes: notes || undefined,
      collaborationRating: rating || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kol', kol.id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="space-y-5 max-w-lg">
      <div className="card p-5 space-y-5">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Collaboration Rating
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
            Internal Notes
          </label>
          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal notes about this KOL — working style, rates, past collaboration results…"
            className="input resize-y text-sm leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between">
          {saved && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {mutation.isError && (
            <span className="text-xs text-red-500">Save failed</span>
          )}
          {!saved && !mutation.isError && <span />}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary text-sm"
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {kol.isBlacklisted && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-semibold">Blacklisted KOL.</span> This KOL has been flagged and should not be engaged for campaigns.
        </div>
      )}
    </div>
  );
}

// ─── Main KOL Detail Page ─────────────────────────────────────────────────────

export default function KolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: kol, isLoading } = useQuery({
    queryKey: ['kol', id],
    queryFn: () => kolsApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading) return <PageSpinner />;
  if (!kol) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-sm">KOL not found.</p>
      <button onClick={() => navigate('/kols')} className="mt-3 btn-ghost text-sm">← Back to KOL Database</button>
    </div>
  );

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate('/kols')}
        className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        KOL Database
      </button>

      {/* KOL header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 text-2xl font-bold border border-primary-100 overflow-hidden">
            {kol.avatarUrl ? (
              <img
                src={kol.avatarUrl}
                alt={kol.name}
                className="h-16 w-16 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              kol.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Name + badges */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{kol.name}</h1>
              {kol.isBlacklisted && <BlacklistedBadge />}
            </div>
            {kol.nickname && (
              <p className="text-sm text-gray-400 mt-0.5">@{kol.nickname}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <TierBadge tier={kol.kolTier} />
              {kol.city && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {kol.city}, {kol.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditModalOpen(true)}
          className="btn-secondary gap-1.5 text-sm"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit KOL
        </button>
      </div>

      {/* Tab nav */}
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
            {tab.id === 'platforms' && (kol.platforms?.length ?? 0) > 0 && (
              <span className={clsx(
                'ml-2 rounded-full px-2 py-0.5 text-xs font-semibold',
                activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
              )}>
                {kol.platforms!.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab kol={kol} />}
      {activeTab === 'platforms' && <PlatformsTab kol={kol} />}
      {activeTab === 'notes' && <NotesTab kol={kol} key={kol.id} />}

      {/* Edit modal */}
      <KolFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        kol={kol}
      />
    </div>
  );
}
