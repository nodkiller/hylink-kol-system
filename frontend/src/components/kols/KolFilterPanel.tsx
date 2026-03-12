import { useState } from 'react';
import { KolTier, PlatformName, type KolQueryParams } from '@/types';

interface Props {
  filters: KolQueryParams;
  onChange: (filters: KolQueryParams) => void;
  onReset: () => void;
}

const PLATFORM_OPTIONS = Object.values(PlatformName);
const TIER_OPTIONS = Object.values(KolTier);

export default function KolFilterPanel({ filters, onChange, onReset }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (key: keyof KolQueryParams, value: unknown) =>
    onChange({ ...filters, [key]: value, page: 1 });

  // Build active filter chips
  type FilterChip = { key: keyof KolQueryParams; label: string };
  const activeChips: FilterChip[] = [];
  if (filters.platform) activeChips.push({ key: 'platform', label: `Platform: ${filters.platform}` });
  if (filters.tier) activeChips.push({ key: 'tier', label: `Tier: ${filters.tier}` });
  if (filters.minFollowers) activeChips.push({ key: 'minFollowers', label: `Min followers: ${Number(filters.minFollowers).toLocaleString()}` });
  if (filters.maxFollowers) activeChips.push({ key: 'maxFollowers', label: `Max followers: ${Number(filters.maxFollowers).toLocaleString()}` });
  if (filters.minEngagement) activeChips.push({ key: 'minEngagement', label: `Min eng: ${(Number(filters.minEngagement) * 100).toFixed(1)}%` });
  if (filters.maxEngagement) activeChips.push({ key: 'maxEngagement', label: `Max eng: ${(Number(filters.maxEngagement) * 100).toFixed(1)}%` });
  if (filters.city) activeChips.push({ key: 'city', label: `City: ${filters.city}` });
  if (filters.language) activeChips.push({ key: 'language', label: `Language: ${filters.language}` });
  if (filters.tags) activeChips.push({ key: 'tags', label: `Tags: ${filters.tags}` });
  if (filters.isBlacklisted !== '' && filters.isBlacklisted !== undefined) {
    activeChips.push({ key: 'isBlacklisted', label: filters.isBlacklisted ? 'Blacklisted only' : 'Active only' });
  }

  const advancedCount = activeChips.filter(
    (c) => !['platform', 'tier'].includes(c.key as string),
  ).length;

  return (
    <div className="mb-5 space-y-3">
      {/* ── Main search row ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, nickname, or @handle…"
            value={filters.search ?? ''}
            onChange={(e) => update('search', e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition"
          />
        </div>

        {/* Platform dropdown */}
        <div className="relative">
          <select
            value={filters.platform ?? ''}
            onChange={(e) => update('platform', e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition cursor-pointer min-w-[140px]"
          >
            <option value="">All platforms</option>
            {PLATFORM_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Tier dropdown */}
        <div className="relative">
          <select
            value={filters.tier ?? ''}
            onChange={(e) => update('tier', e.target.value)}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-9 text-sm text-gray-700 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition cursor-pointer min-w-[130px]"
          >
            <option value="">All tiers</option>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm transition ${
            showAdvanced || advancedCount > 0
              ? 'border-primary-300 bg-primary-50 text-primary-600'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          More filters
          {advancedCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white font-semibold">
              {advancedCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Advanced filters panel ───────────────────────────────────────────── */}
      {showAdvanced && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div>
              <label className="label">Min Followers</label>
              <input
                type="number" min={0} placeholder="e.g. 10000"
                value={filters.minFollowers ?? ''}
                onChange={(e) => update('minFollowers', e.target.value ? Number(e.target.value) : '')}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Max Followers</label>
              <input
                type="number" min={0} placeholder="e.g. 500000"
                value={filters.maxFollowers ?? ''}
                onChange={(e) => update('maxFollowers', e.target.value ? Number(e.target.value) : '')}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Min Engagement</label>
              <div className="relative mt-1">
                <input
                  type="number" min={0} max={1} step={0.001} placeholder="e.g. 0.03"
                  value={filters.minEngagement ?? ''}
                  onChange={(e) => update('minEngagement', e.target.value ? Number(e.target.value) : '')}
                  className="input pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">dec</span>
              </div>
            </div>
            <div>
              <label className="label">Max Engagement</label>
              <div className="relative mt-1">
                <input
                  type="number" min={0} max={1} step={0.001} placeholder="e.g. 0.08"
                  value={filters.maxEngagement ?? ''}
                  onChange={(e) => update('maxEngagement', e.target.value ? Number(e.target.value) : '')}
                  className="input pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">dec</span>
              </div>
            </div>
            <div>
              <label className="label">City</label>
              <input
                type="text" placeholder="e.g. Sydney"
                value={filters.city ?? ''}
                onChange={(e) => update('city', e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Language</label>
              <input
                type="text" placeholder="e.g. English"
                value={filters.language ?? ''}
                onChange={(e) => update('language', e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Content Tags</label>
              <input
                type="text" placeholder="e.g. Automotive"
                value={filters.tags ?? ''}
                onChange={(e) => update('tags', e.target.value)}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Blacklist Status</label>
              <select
                value={String(filters.isBlacklisted ?? '')}
                onChange={(e) => {
                  const v = e.target.value;
                  update('isBlacklisted', v === '' ? '' : v === 'true');
                }}
                className="input mt-1"
              >
                <option value="">All KOLs</option>
                <option value="false">Active only</option>
                <option value="true">Blacklisted only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ──────────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm"
            >
              {chip.label}
              <button
                onClick={() => update(chip.key, chip.key === 'isBlacklisted' ? '' : '')}
                className="rounded-full text-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={onReset}
            className="text-xs font-medium text-primary-500 hover:text-primary-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
