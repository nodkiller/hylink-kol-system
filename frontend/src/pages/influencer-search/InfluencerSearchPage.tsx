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
    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0">
      <span className="text-lg font-semibold text-gray-500">{initial}</span>
    </div>
  );
}

function Stat({ value, label, border }: { value: number; label: string; border?: boolean }) {
  return (
    <div className={`flex-1 py-3 text-center ${border ? 'border-l border-gray-100' : ''}`}>
      <p className="text-sm font-semibold text-gray-800 leading-none">{formatCount(value)}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
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
    <div className="card flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 truncate">
                @{user.username}
              </span>
              {user.is_verified && <VerifiedBadge />}
            </div>
            {user.full_name && (
              <p className="mt-0.5 text-xs text-gray-400 truncate">{user.full_name}</p>
            )}
            {user.is_business_account && (
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                Business
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.biography ? (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{user.biography}</p>
        ) : (
          <div className="h-7" />
        )}
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-gray-100 bg-gray-50">
        <Stat value={user.follower_count} label="Followers" />
        <Stat value={user.following_count} label="Following" border />
        <Stat value={user.media_count} label="Posts" border />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100">
        <a
          href={`https://instagram.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Profile
        </a>

        <button
          onClick={onAdd}
          disabled={isAdded}
          className={`ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 ${
            isAdded
              ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-100'
              : 'bg-primary-500 hover:bg-primary-600 active:scale-95 text-white'
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Influencer Discovery</h1>
        <p className="mt-0.5 text-sm text-gray-400">
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
            placeholder="Enter an @username to search…"
            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-28 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-1.5 flex h-8 items-center gap-1.5 rounded-lg bg-primary-500 px-4 text-xs font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
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

      {/* Error notice */}
      {error && !loading && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 max-w-lg">
          <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-gray-400">Enter a keyword or @username above to discover creators</p>
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
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
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
  );
}
