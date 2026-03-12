import clsx from 'clsx';
import type { SortingState, OnChangeFn } from '@tanstack/react-table';
import { TierBadge, PlatformBadge, BlacklistedBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import type { Kol } from '@/types';

interface Props {
  data: Kol[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onPageChange: (p: number) => void;
  onView: (kol: Kol) => void;
  onEdit: (kol: Kol) => void;
  onRowClick?: (kol: Kol) => void;
}

function formatFollowers(n?: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatEngagement(n?: number) {
  if (!n) return null;
  return `${(n * 100).toFixed(2)}%`;
}

// Platform icon mini components
const PLATFORM_ICON: Record<string, React.ReactNode> = {
  Instagram: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  TikTok: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
    </svg>
  ),
  YouTube: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
    </svg>
  ),
  小红书: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5c1.933 0 3.5 1.567 3.5 3.5S13.933 11.5 12 11.5 8.5 9.933 8.5 8 10.067 4.5 12 4.5zm0 15c-2.485 0-4.697-1.133-6.176-2.914a9.97 9.97 0 01-.824-1.336C5.78 13.667 8.706 12 12 12s6.22 1.667 7 3.25a9.97 9.97 0 01-.824 1.336C16.697 18.367 14.485 19.5 12 19.5z" />
    </svg>
  ),
  Weibo: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM11.285 17c-.238.277-.619.427-1.003.419-.771-.008-1.412-.613-1.428-1.351-.016-.738.598-1.363 1.369-1.383.238-.006.463.052.655.161.44.254.624.79.431 1.25a.636.636 0 01-.024.056c.02.006.041.012.063.02.19.064.278.27.196.46-.078.185-.294.274-.484.21-.014-.006-.028-.013-.041-.02a.617.617 0 01-.04.044.636.636 0 01-.694.134zm1.903-.878c-.162-.449-.536-.747-.95-.747-.154 0-.313.043-.469.132-.375.214-.513.69-.311 1.065l.003.006c.201.375.675.518 1.055.32.379-.2.524-.668.327-1.043a.81.81 0 00-.014-.025.632.632 0 00-.326-.248c.13-.058.257-.13.377-.213.283-.195.458-.494.469-.816l.023-.015A2.41 2.41 0 0012 13.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5c.67 0 1.279-.266 1.73-.697a2.503 2.503 0 00.07-3.366 2.48 2.48 0 00-.612-.215zm3.412-3.528c.38.38.38.998 0 1.378a.972.972 0 01-1.378 0 .972.972 0 010-1.378.97.97 0 011.378 0zm3.3-3.594c-1.99-2.004-4.88-2.543-7.27-1.578-.284.116-.423.44-.307.724.117.284.44.424.724.307 1.966-.8 4.348-.354 5.975 1.271 1.627 1.625 2.073 3.95 1.278 5.948-.115.283.023.606.306.72.282.116.606-.023.72-.306.932-2.347.41-5.086-1.426-7.086z" />
    </svg>
  ),
};

function PlatformIcon({ name }: { name: string }) {
  const icon = PLATFORM_ICON[name];
  return icon ? <span className="text-gray-400">{icon}</span> : null;
}

function StarRating({ value }: { value?: number }) {
  if (!value) return <span className="text-gray-300 text-xs">—</span>;
  const v = Number(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} className={clsx('h-3 w-3', star <= Math.round(v) ? 'text-yellow-400' : 'text-gray-200')} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-0.5 text-xs text-gray-400">{v.toFixed(1)}</span>
    </div>
  );
}

function KolCard({ kol, onView, onEdit, onRowClick }: {
  kol: Kol;
  onView: (k: Kol) => void;
  onEdit: (k: Kol) => void;
  onRowClick?: (k: Kol) => void;
}) {
  const sortedPlatforms = [...(kol.platforms ?? [])].sort(
    (a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0),
  );

  return (
    <div
      className={clsx(
        'flex items-start gap-0 border-b border-gray-100 last:border-0 hover:bg-gray-50/70 transition-colors',
        onRowClick && 'cursor-pointer',
        kol.isBlacklisted && 'opacity-60',
      )}
      onClick={() => onRowClick?.(kol)}
    >
      {/* ── Profile section ─────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 gap-4 py-5 px-5 w-[300px]">
        {/* Avatar */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 text-base font-bold border border-primary-100 overflow-hidden">
          {kol.avatarUrl
            ? <img src={kol.avatarUrl} alt={kol.name} className="h-12 w-12 object-cover" />
            : kol.name.charAt(0).toUpperCase()
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{kol.name}</span>
            {kol.isBlacklisted && <BlacklistedBadge />}
          </div>
          {kol.nickname && (
            <p className="text-xs text-gray-400 mt-0.5">@{kol.nickname}</p>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            {kol.country && <span>{kol.country}</span>}
            {kol.city && kol.country && <span className="text-gray-300">·</span>}
            {kol.city && <span>{kol.city}</span>}
          </div>
          <div className="mt-2">
            <TierBadge tier={kol.kolTier} />
          </div>
        </div>
      </div>

      {/* ── Tags section ──────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-wrap content-start gap-1.5 py-5 px-3 w-[200px]">
        {kol.contentTags && kol.contentTags.length > 0 ? (
          <>
            {kol.contentTags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                {tag}
              </span>
            ))}
            {kol.contentTags.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                +{kol.contentTags.length - 4}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-300">No tags</span>
        )}
      </div>

      {/* ── Platform stats section ────────────────────────────────────────────── */}
      <div className="flex-1 py-5 px-3">
        {sortedPlatforms.length > 0 ? (
          <div className="space-y-2">
            {sortedPlatforms.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <PlatformIcon name={p.platformName} />
                <PlatformBadge platform={p.platformName} />
                <span className="text-sm font-semibold text-gray-800 tabular-nums">
                  {formatFollowers(p.followersCount)}
                </span>
                {formatEngagement(p.avgEngagementRate) && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {formatEngagement(p.avgEngagementRate)}
                    </span>
                  </>
                )}
                {p.handle && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400 truncate max-w-[80px]">@{p.handle}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-300">No platforms added</span>
        )}
      </div>

      {/* ── Rating + Actions ──────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-col items-end gap-3 py-5 px-5">
        <StarRating value={kol.collaborationRating} />
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(kol)}
            title="View details"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-100 hover:text-gray-800 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </button>
          <button
            onClick={() => onEdit(kol)}
            title="Edit"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-500 border border-primary-200 hover:bg-primary-50 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KolTable({
  data, total, page, limit, isLoading,
  onPageChange, onView, onEdit, onRowClick,
}: Props) {
  return (
    <div className="card overflow-hidden">
      {/* Column header */}
      <div className="flex items-center border-b border-gray-100 bg-gray-50 px-5 py-2.5">
        <div className="w-[300px] flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Creator
        </div>
        <div className="w-[200px] flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Categories
        </div>
        <div className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Platforms
        </div>
        <div className="flex-shrink-0 pr-5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Rating
        </div>
      </div>

      {/* List */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <Spinner className="h-7 w-7 text-primary-500" />
          </div>
        )}

        {!isLoading && !data.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg className="h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
            </svg>
            <p className="text-sm font-medium text-gray-500">No KOLs found</p>
            <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or add a new KOL</p>
          </div>
        ) : (
          data.map((kol) => (
            <KolCard
              key={kol.id}
              kol={kol}
              onView={onView}
              onEdit={onEdit}
              onRowClick={onRowClick}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-100 px-4">
        <Pagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          total={total}
          limit={limit}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
