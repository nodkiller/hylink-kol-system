import { useState, useRef } from 'react';
import { influencerSearchApi, type InstagramUser } from '@/api/influencer-search.api';

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function VerifiedBadge() {
  return (
    <svg className="h-4 w-4 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function UserCard({ user, onAdd }: { user: InstagramUser; onAdd: (u: InstagramUser) => void }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-5 gap-4 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        {user.profile_pic_url ? (
          <img
            src={user.profile_pic_url}
            alt={user.username}
            className="h-14 w-14 rounded-full object-cover flex-shrink-0 bg-gray-800"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xl text-gray-400 font-bold">
              {user.username[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white truncate">@{user.username}</span>
            {user.is_verified && <VerifiedBadge />}
            {user.is_business_account && (
              <span className="text-xs bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-700/50">
                Business
              </span>
            )}
          </div>
          {user.full_name && (
            <p className="text-sm text-gray-400 mt-0.5 truncate">{user.full_name}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-800/60 px-3 py-2.5">
        <div className="text-center">
          <p className="text-base font-bold text-white">{formatCount(user.follower_count)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Followers</p>
        </div>
        <div className="text-center border-x border-gray-700">
          <p className="text-base font-bold text-white">{formatCount(user.following_count)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Following</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-white">{formatCount(user.media_count)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Posts</p>
        </div>
      </div>

      {/* Bio */}
      {user.biography && (
        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{user.biography}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <a
          href={`https://instagram.com/${user.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-center text-sm py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          View Profile
        </a>
        <button
          onClick={() => onAdd(user)}
          className="flex-1 text-sm py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors"
        >
          + Add to KOL DB
        </button>
      </div>
    </div>
  );
}

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
    try {
      const data = await influencerSearchApi.search(q);
      setResults(data);
      if (data.length === 0) setError('No results found. Try a different keyword.');
    } catch {
      setError('Search failed. Please check your API key configuration.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (user: InstagramUser) => {
    setAdded((prev) => new Set(prev).add(user.username));
    // TODO: wire up to KOL create API
    alert(`Added @${user.username} to KOL Database (coming soon: auto-fill KOL form)`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Influencer Search</h1>
        <p className="mt-1 text-sm text-gray-400">
          Search Instagram influencers by username or keyword · Powered by RapidAPI
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or keyword (e.g. travel, beauty...)"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Searching…
              </>
            ) : 'Search'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-sm text-red-300 max-w-2xl">
          {error}
        </div>
      )}

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-24 text-gray-600">
          <svg className="mx-auto h-12 w-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Enter a keyword or username to find Instagram influencers</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="mb-4 text-sm text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((user) => (
              <UserCard
                key={user.pk || user.username}
                user={user}
                onAdd={handleAdd}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
