import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { influencerSearchApi, type InstagramUser } from '@/api/influencer-search.api';
import { kolsApi } from '@/api/kols.api';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import { PlatformName } from '@/types';
import clsx from 'clsx';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

// ─── Follower range filter options ────────────────────────────────────────────

const FOLLOWER_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: 'Nano (< 10K)', min: 0, max: 10_000 },
  { label: 'Micro (10K–100K)', min: 10_000, max: 100_000 },
  { label: 'Mid (100K–500K)', min: 100_000, max: 500_000 },
  { label: 'Macro (500K–1M)', min: 500_000, max: 1_000_000 },
  { label: 'Mega (1M+)', min: 1_000_000, max: Infinity },
];

// ─── Engagement rate filter options ───────────────────────────────────────────

const ENGAGEMENT_OPTIONS = [
  { label: 'Any', threshold: 0 },
  { label: '> 1%', threshold: 0.01 },
  { label: '> 2%', threshold: 0.02 },
  { label: '> 3%', threshold: 0.03 },
  { label: '> 5%', threshold: 0.05 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <svg className="h-[14px] w-[14px] flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="url(#vbg)" />
      <path d="M7.5 12.5l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="vbg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Avatar({ user }: { user: InstagramUser }) {
  const [failed, setFailed] = useState(false);
  const initial = (user.full_name?.[0] || user.username[0])?.toUpperCase();
  if (user.profile_pic_url && !failed) {
    return (
      <img
        src={user.profile_pic_url}
        alt={user.username}
        className="h-14 w-14 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
      <span className="text-lg font-semibold text-primary-600">{initial}</span>
    </div>
  );
}

// ─── Add to Campaign dropdown ─────────────────────────────────────────────────

function AddToCampaignDropdown({
  user,
  onSuccess,
}: {
  user: InstagramUser;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['campaigns-picker'],
    queryFn: () => campaignsApi.list({ limit: 50 }),
    enabled: open,
    staleTime: 60_000,
  });
  const campaigns = data?.data ?? [];

  const handleAdd = async (campaignId: string, campaignName: string) => {
    setAdding(true);
    try {
      // 1. Create KOL in DB
      const kol = await kolsApi.create({
        name: user.full_name || `@${user.username}`,
        nickname: user.username,
        country: 'Australia',
        avatarUrl: user.profile_pic_url || undefined,
        platforms: [{
          platformName: PlatformName.INSTAGRAM,
          handle: user.username,
          followersCount: user.follower_count,
          profileUrl: `https://instagram.com/${user.username}`,
        }],
      });
      // 2. Add KOL to campaign
      await campaignsApi.addKols(campaignId, [kol.id]);
      setDone(campaignName);
      onSuccess();
      setTimeout(() => { setOpen(false); setDone(null); }, 1500);
    } catch {
      // KOL might already exist — best effort
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Campaign
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 bottom-full mb-1.5 z-20 w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-600">Add to Campaign</p>
            </div>
            {done ? (
              <div className="px-3 py-3 text-xs text-green-600 font-medium flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added to {done}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400">No campaigns found</div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {campaigns.map((c: Campaign) => (
                  <button
                    key={c.id}
                    disabled={adding}
                    onClick={() => handleAdd(c.id, c.name)}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{c.clientName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Generic filter chip with dropdown panel ──────────────────────────────────

function FilterChip({
  label,
  active,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  onClear: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center">
        <button
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'flex items-center gap-1.5 rounded-l-full px-3 py-1.5 text-xs font-medium border transition-colors',
            active
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300',
            !active && 'rounded-r-full',
          )}
        >
          {label}
          <svg
            className={clsx('h-3 w-3 transition-transform', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {active && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); setOpen(false); }}
            className="flex items-center justify-center h-full px-2 rounded-r-full bg-primary-700 border border-primary-700 text-white hover:bg-primary-800 transition-colors"
            aria-label="Clear filter"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[180px] rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Text input filter chip ───────────────────────────────────────────────────

function TextFilterChip({
  label,
  value,
  placeholder,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const active = value.trim().length > 0;
  const displayLabel = active ? `${label}: ${value}` : label;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FilterChip
      label={displayLabel}
      active={active}
      onClear={onClear}
    >
      <div className="px-3 py-2.5">
        <div className="relative flex items-center">
          <svg
            className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 w-full rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-100"
          />
        </div>
      </div>
    </FilterChip>
  );
}

// ─── User card ────────────────────────────────────────────────────────────────

function UserCard({
  user,
  isAdded,
  onAdd,
  view,
}: {
  user: InstagramUser;
  isAdded: boolean;
  onAdd: () => void;
  view: 'grid' | 'list';
}) {
  if (view === 'list') {
    return (
      <div className="card flex items-center gap-4 px-4 py-3 hover:shadow-sm transition-shadow">
        <Avatar user={user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">@{user.username}</span>
            {user.is_verified && <VerifiedBadge />}
          </div>
          {user.full_name && <p className="text-xs text-gray-400">{user.full_name}</p>}
          {user.biography && <p className="text-xs text-gray-500 truncate mt-0.5 max-w-md">{user.biography}</p>}
        </div>
        <div className="hidden sm:flex items-center gap-6 text-center flex-shrink-0">
          {[
            { val: user.follower_count, label: 'Followers' },
            { val: user.following_count, label: 'Following' },
            { val: user.media_count, label: 'Posts' },
          ].map(({ val, label }) => (
            <div key={label}>
              <p className="text-sm font-semibold text-gray-800">{formatCount(val)}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`https://instagram.com/${user.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Profile
          </a>
          <AddToCampaignDropdown user={user} onSuccess={onAdd} />
          <button
            onClick={onAdd}
            disabled={isAdded}
            className={clsx(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all',
              isAdded
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default'
                : 'bg-primary-600 hover:bg-primary-700 text-white',
            )}
          >
            {isAdded ? (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              'Save to Library'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate">@{user.username}</span>
              {user.is_verified && <VerifiedBadge />}
            </div>
            {user.full_name && <p className="mt-0.5 text-xs text-gray-400 truncate">{user.full_name}</p>}
            {user.is_business_account && (
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                Business
              </span>
            )}
          </div>
        </div>
        {user.biography ? (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{user.biography}</p>
        ) : (
          <div className="h-7" />
        )}
      </div>

      <div className="flex border-t border-gray-100 bg-gray-50">
        {[
          { val: user.follower_count, label: 'Followers' },
          { val: user.following_count, label: 'Following' },
          { val: user.media_count, label: 'Posts' },
        ].map(({ val, label }, i) => (
          <div key={label} className={clsx('flex-1 py-3 text-center', i > 0 && 'border-l border-gray-100')}>
            <p className="text-sm font-semibold text-gray-800 leading-none">{formatCount(val)}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100">
        <a
          href={`https://instagram.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Profile
        </a>
        <AddToCampaignDropdown user={user} onSuccess={onAdd} />
        <button
          onClick={onAdd}
          disabled={isAdded}
          className={clsx(
            'ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200',
            isAdded
              ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100'
              : 'bg-primary-600 hover:bg-primary-700 active:scale-95 text-white',
          )}
        >
          {isAdded ? (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Save to Library
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded-full w-3/5" />
            <div className="h-2.5 bg-gray-100 rounded-full w-2/5" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-gray-100 rounded-full w-full" />
          <div className="h-2.5 bg-gray-100 rounded-full w-4/6" />
        </div>
      </div>
      <div className="h-12 border-t border-gray-100 bg-gray-50" />
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
        <div className="h-3 bg-gray-100 rounded-full w-12" />
        <div className="h-7 bg-gray-100 rounded-full w-24" />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function InfluencerSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstagramUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [followerRange, setFollowerRange] = useState(0); // index into FOLLOWER_RANGES
  const [engagementIdx, setEngagementIdx] = useState(0); // index into ENGAGEMENT_OPTIONS
  const [locationFilter, setLocationFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setResults([]);
    try {
      const data = await influencerSearchApi.search(q);
      setResults(data);
      if (data.length === 0) setError('No results found. Try a different keyword or username.');
    } catch {
      setError('Search failed. Please check your API key configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (user: InstagramUser) => {
    kolsApi.create({
      name: user.full_name || `@${user.username}`,
      nickname: user.username,
      country: 'Australia',
      avatarUrl: user.profile_pic_url || undefined,
      platforms: [{
        platformName: PlatformName.INSTAGRAM,
        handle: user.username,
        followersCount: user.follower_count,
        profileUrl: `https://instagram.com/${user.username}`,
      }],
    }).then(() => {
      setAdded((prev) => new Set(prev).add(user.username));
    }).catch(() => {
      // Already exists or other error — still mark as added
      setAdded((prev) => new Set(prev).add(user.username));
    });
  };

  // Apply all active filters
  const range = FOLLOWER_RANGES[followerRange];
  const engagementThreshold = ENGAGEMENT_OPTIONS[engagementIdx].threshold;

  const filtered = results.filter((u) => {
    // Follower range
    if (u.follower_count < range.min || u.follower_count >= range.max) return false;

    // Engagement rate (only filter when a threshold is set and the field exists)
    if (engagementThreshold > 0) {
      const rate = u.engagement_rate ?? 0;
      if (rate < engagementThreshold) return false;
    }

    // Location (case-insensitive substring match)
    if (locationFilter.trim()) {
      const loc = (u.location ?? '').toLowerCase();
      if (!loc.includes(locationFilter.trim().toLowerCase())) return false;
    }

    // Category / keyword in bio
    if (categoryFilter.trim()) {
      const bio = (u.biography ?? '').toLowerCase();
      if (!bio.includes(categoryFilter.trim().toLowerCase())) return false;
    }

    return true;
  });

  const anyFilterActive =
    followerRange > 0 ||
    engagementIdx > 0 ||
    locationFilter.trim().length > 0 ||
    categoryFilter.trim().length > 0;

  const clearAllFilters = () => {
    setFollowerRange(0);
    setEngagementIdx(0);
    setLocationFilter('');
    setCategoryFilter('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KOL Discovery</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Search Instagram creators by username or keyword · Powered by RapidAPI
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center max-w-2xl">
          <svg
            className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by @username or keyword (e.g. 'beauty australia')…"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-32 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            {loading && (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {/* Filter chips — shown once a search has been performed */}
      {searched && results.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Followers chip */}
          <FilterChip
            label={followerRange === 0 ? 'Followers' : `Followers: ${FOLLOWER_RANGES[followerRange].label}`}
            active={followerRange > 0}
            onClear={() => setFollowerRange(0)}
          >
            <div className="py-1">
              {FOLLOWER_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setFollowerRange(i)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-xs transition-colors',
                    followerRange === i
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </FilterChip>

          {/* Engagement chip */}
          <FilterChip
            label={engagementIdx === 0 ? 'Engagement' : `Engagement ${ENGAGEMENT_OPTIONS[engagementIdx].label}`}
            active={engagementIdx > 0}
            onClear={() => setEngagementIdx(0)}
          >
            <div className="py-1">
              {ENGAGEMENT_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => setEngagementIdx(i)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-xs transition-colors',
                    engagementIdx === i
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterChip>

          {/* Location chip */}
          <TextFilterChip
            label="Location"
            value={locationFilter}
            placeholder="e.g. Sydney, Melbourne…"
            onChange={setLocationFilter}
            onClear={() => setLocationFilter('')}
          />

          {/* Category chip */}
          <TextFilterChip
            label="Category"
            value={categoryFilter}
            placeholder="e.g. beauty, fitness…"
            onChange={setCategoryFilter}
            onClear={() => setCategoryFilter('')}
          />

          {/* Clear all */}
          {anyFilterActive && (
            <button
              onClick={clearAllFilters}
              className="ml-1 text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Error notice */}
      {error && !loading && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-lg">
          <svg className="h-4 w-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p>{error}</p>
            <p className="mt-1 text-xs text-red-400">
              Or{' '}
              <a href="/kols" className="underline hover:text-red-600">add this KOL manually →</a>
            </p>
          </div>
        </div>
      )}

      {/* Empty / pre-search state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-400 mb-4">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-700">Discover Instagram Creators</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            Search by @username or keyword. Save creators directly to your KOL Library or add them to a campaign.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['beauty australia', 'fitness sydney', 'lifestyle melbourne', 'food blogger'].map((kw) => (
              <button
                key={kw}
                onClick={() => { setQuery(kw); inputRef.current?.focus(); }}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Results toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-800">{filtered.length}</span> creator{filtered.length !== 1 ? 's' : ''} found
              {anyFilterActive && ` · filters active`}
            </p>
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setView('grid')}
                className={clsx('flex items-center justify-center h-8 w-9 transition-colors', view === 'grid' ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50')}
                title="Grid view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={clsx('flex items-center justify-center h-8 w-9 border-l border-gray-200 transition-colors', view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50')}
                title="List view"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-2'}>
            {filtered.map((user) => (
              <UserCard
                key={user.pk || user.username}
                user={user}
                isAdded={added.has(user.username)}
                onAdd={() => handleAdd(user)}
                view={view}
              />
            ))}
          </div>
        </>
      )}

      {/* No results after filter */}
      {!loading && searched && results.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-sm">No creators match the active filters.</p>
          <button onClick={clearAllFilters} className="mt-2 text-xs text-primary-600 hover:underline">
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
