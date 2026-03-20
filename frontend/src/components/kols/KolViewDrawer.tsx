import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { TierBadge, PlatformBadge, BlacklistedBadge } from '@/components/ui/Badge';
import type { Kol } from '@/types';

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

function StarRating({ value }: { value?: number }) {
  if (!value) return <span className="text-gray-400 text-sm">No rating</span>;
  const v = Number(value);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={clsx('h-4 w-4', star <= Math.round(v) ? 'text-yellow-400' : 'text-gray-200')} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm text-gray-500">{v.toFixed(1)}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm text-gray-700">{value || '—'}</span>
    </div>
  );
}

interface Props {
  kol: Kol | null;
  onClose: () => void;
  onEdit: (kol: Kol) => void;
}

export default function KolViewDrawer({ kol, onClose, onEdit }: Props) {
  const open = Boolean(kol);

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      <div
        className={clsx(
          'fixed right-0 top-0 z-40 h-full w-[480px] max-w-full bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {!kol ? null : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 text-xl font-bold border border-primary-100 overflow-hidden">
                  {kol.avatarUrl
                    ? <img src={kol.avatarUrl} alt={kol.name} className="h-14 w-14 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    : kol.name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">{kol.name}</h2>
                    {kol.isBlacklisted && <BlacklistedBadge />}
                  </div>
                  {kol.nickname && <p className="text-sm text-gray-400">@{kol.nickname}</p>}
                  <div className="mt-1.5">
                    <TierBadge tier={kol.kolTier} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Link
                  to={`/kols/${kol.id}`}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                  onClick={onClose}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Full Profile
                </Link>
                <button
                  onClick={() => onEdit(kol)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 border border-primary-200 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto">

              {kol.platforms && kol.platforms.length > 0 && (
                <section className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Platform Accounts</h3>
                  <div className="space-y-2.5">
                    {[...kol.platforms]
                      .sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))
                      .map((p) => (
                        <div key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <PlatformBadge platform={p.platformName} />
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-semibold text-gray-800">{formatFollowers(p.followersCount)}</span>
                              <span className="text-gray-300">·</span>
                              <span className="text-gray-500">{formatEngagement(p.avgEngagementRate)} eng</span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400">@{p.handle}</span>
                            {p.profileUrl && (
                              <a
                                href={p.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-500 hover:text-primary-700 transition-colors"
                              >
                                View profile →
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              <section className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Basic Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow label="City" value={kol.city} />
                  <InfoRow label="Country" value={kol.country} />
                  <InfoRow label="Primary Language" value={kol.primaryLanguage} />
                  <InfoRow label="Ethnicity" value={kol.ethnicityBackground} />
                  <InfoRow label="Contact Email" value={kol.contactEmail} />
                </div>
              </section>

              {kol.contentTags && kol.contentTags.length > 0 && (
                <section className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Content Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {kol.contentTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(kol.talentAgencyName || kol.talentAgencyContact) && (
                <section className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Talent Agency</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Agency Name" value={kol.talentAgencyName} />
                    <InfoRow label="Agency Contact" value={kol.talentAgencyContact} />
                  </div>
                </section>
              )}

              <section className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Collaboration</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Rating</span>
                    <StarRating value={kol.collaborationRating} />
                  </div>
                  {kol.agencyInternalNotes && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1.5">Internal Notes</span>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                        {kol.agencyInternalNotes}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="px-6 py-4">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>ID: {kol.id.slice(0, 8)}…</span>
                  <span>Added {new Date(kol.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
