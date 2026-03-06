import { useState, useRef } from 'react';
import { influencerSearchApi, type InstagramUser } from '@/api/influencer-search.api';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <svg className="h-[15px] w-[15px] flex-shrink-0" viewBox="0 0 24 24" fill="none">
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
        className="h-[60px] w-[60px] rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="h-[60px] w-[60px] rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
      <span className="text-lg font-semibold text-white/50">{initial}</span>
    </div>
  );
}

function Stat({ value, label, border }: { value: number; label: string; border?: boolean }) {
  return (
    <div className={`flex-1 py-3 text-center ${border ? 'border-l border-white/[0.06]' : ''}`}>
      <p className="text-[15px] font-semibold tracking-tight text-white leading-none">{formatCount(value)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.07em] text-white/30">{label}</p>
    </div>
  );
}

function UserCard({
  user,
  isAdded,
  onAdd,
}: {
  user: InstagramUser;
  isAdded: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.13] hover:bg-white/[0.05] transition-all duration-300 overflow-hidden">
      {/* Body */}
      <div className="p-5 flex flex-col gap-3.5 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-3.5">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] font-semibold text-white truncate leading-none">
                @{user.username}
              </span>
              {user.is_verified && <VerifiedBadge />}
            </div>
            {user.full_name && (
              <p className="mt-1 text-[12px] text-white/40 truncate leading-none">{user.full_name}</p>
            )}
            {user.is_business_account && (
              <p className="mt-1.5 text-[10px] uppercase tracking-[0.08em] font-medium text-blue-400/70">Business</p>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.biography ? (
          <p className="text-[12.5px] text-white/40 line-clamp-2 leading-relaxed">{user.biography}</p>
        ) : (
          <div className="h-8" />
        )}
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-white/[0.06] bg-white/[0.015]">
        <Stat value={user.follower_count} label="Followers" />
        <Stat value={user.following_count} label="Following" border />
        <Stat value={user.media_count} label="Posts" border />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06]">
        <a
          href={`https://instagram.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Profile
        </a>

        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`ml-auto flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
            isAdded
              ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
              : 'bg-blue-500 hover:bg-blue-400 active:scale-95 text-white'
          }`}
        >
          {isAdded ? (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Added
            </>
          ) : (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add to KOL DB
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden animate-pulse">
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-[60px] w-[60px] rounded-full bg-white/[0.07] flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-white/[0.07] rounded-full w-3/5" />
            <div className="h-2.5 bg-white/[0.04] rounded-full w-2/5" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2.5 bg-white/[0.04] rounded-full w-full" />
          <div className="h-2.5 bg-white/[0.04] rounded-full w-4/6" />
        </div>
      </div>
      <div className="h-[52px] border-t border-white/[0.06] bg-white/[0.015]" />
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
        <div className="h-3 bg-white/[0.04] rounded-full w-12" />
        <div className="h-7 bg-white/[0.06] rounded-full w-24" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InfluencerSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstagramUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState<Set<string>>(new Set());
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
    setAdded((prev) => new Set(prev).add(user.username));
    alert(`Added @${user.username} to KOL Database`);
  };

  const heroMode = !searched;

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Hero / search header ──────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center text-center px-6 pt-14 pb-10">
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -5%, rgba(59,130,246,0.07) 0%, transparent 70%)',
          }}
        />

        {/* Title — only shown before first search */}
        {heroMode && (
          <div className="mb-7 relative z-10">
            <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-white leading-tight">
              Influencer Discovery
            </h1>
            <p className="mt-2 text-[14px] text-white/40 tracking-[-0.01em]">
              Search Instagram creators by username or keyword · Powered by RapidAPI
            </p>
          </div>
        )}

        {/* Compact title when results are shown */}
        {!heroMode && (
          <p className="mb-4 relative z-10 text-[12px] uppercase tracking-[0.1em] text-white/20 font-medium">
            Influencer Discovery
          </p>
        )}

        {/* Search bar */}
        <form
          onSubmit={handleSearch}
          className={`relative z-10 w-full transition-all duration-500 ${heroMode ? 'max-w-xl' : 'max-w-2xl'}`}
        >
          <div className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-4 h-[17px] w-[17px] text-white/25"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={heroMode ? 'Try "beauty", "travel", or a @username…' : 'Search again…'}
              className="h-[46px] w-full rounded-full border border-white/[0.1] bg-white/[0.06] pl-11 pr-28 text-[13.5px] text-white placeholder-white/25 transition-all focus:border-white/[0.2] focus:bg-white/[0.08] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-1.5 flex h-[34px] items-center gap-1.5 rounded-full bg-blue-500 px-5 text-[12.5px] font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? 'Searching' : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 pb-10 max-w-7xl w-full mx-auto">

        {/* Error notice */}
        {error && !loading && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-[13px] text-red-400 max-w-lg mx-auto">
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        {/* Empty state (before first search) */}
        {!searched && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03]">
              <svg className="h-7 w-7 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="mt-4 text-[13px] text-white/20">Enter a keyword or @username above to discover creators</p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.07em] text-white/20">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((user) => (
                <UserCard
                  key={user.pk || user.username}
                  user={user}
                  isAdded={added.has(user.username)}
                  onAdd={() => handleAdd(user)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
