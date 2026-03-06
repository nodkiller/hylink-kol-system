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
  const [expanded, setExpanded] = useState(true);

  const update = (key: keyof KolQueryParams, value: unknown) =>
    onChange({ ...filters, [key]: value, page: 1 });

  const activeCount = [
    filters.search, filters.platform, filters.tier, filters.city,
    filters.language, filters.tags, filters.minFollowers, filters.maxFollowers,
    filters.minEngagement, filters.maxEngagement,
    filters.isBlacklisted !== '' && filters.isBlacklisted !== undefined,
  ].filter(Boolean).length;

  return (
    <div className="card mb-5">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:bg-gray-800/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span>Filters</span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white font-medium">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 px-5 pb-5 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {/* Search */}
            <div className="lg:col-span-2">
              <label className="label">Keyword Search</label>
              <div className="relative mt-1">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search name or nickname…"
                  value={filters.search ?? ''}
                  onChange={(e) => update('search', e.target.value)}
                  className="input pl-9"
                />
              </div>
            </div>

            {/* Platform */}
            <div>
              <label className="label">Platform</label>
              <select
                value={filters.platform ?? ''}
                onChange={(e) => update('platform', e.target.value)}
                className="input mt-1"
              >
                <option value="">All platforms</option>
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Tier */}
            <div>
              <label className="label">KOL Tier</label>
              <select
                value={filters.tier ?? ''}
                onChange={(e) => update('tier', e.target.value)}
                className="input mt-1"
              >
                <option value="">All tiers</option>
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Followers range */}
            <div>
              <label className="label">Min Followers</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 10000"
                value={filters.minFollowers ?? ''}
                onChange={(e) => update('minFollowers', e.target.value ? Number(e.target.value) : '')}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="label">Max Followers</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 500000"
                value={filters.maxFollowers ?? ''}
                onChange={(e) => update('maxFollowers', e.target.value ? Number(e.target.value) : '')}
                className="input mt-1"
              />
            </div>

            {/* Engagement range */}
            <div>
              <label className="label">Min Engagement Rate</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  placeholder="e.g. 0.03"
                  value={filters.minEngagement ?? ''}
                  onChange={(e) => update('minEngagement', e.target.value ? Number(e.target.value) : '')}
                  className="input pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">dec</span>
              </div>
            </div>
            <div>
              <label className="label">Max Engagement Rate</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.001}
                  placeholder="e.g. 0.08"
                  value={filters.maxEngagement ?? ''}
                  onChange={(e) => update('maxEngagement', e.target.value ? Number(e.target.value) : '')}
                  className="input pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">dec</span>
              </div>
            </div>

            {/* City */}
            <div>
              <label className="label">City</label>
              <input
                type="text"
                placeholder="e.g. Sydney"
                value={filters.city ?? ''}
                onChange={(e) => update('city', e.target.value)}
                className="input mt-1"
              />
            </div>

            {/* Language */}
            <div>
              <label className="label">Primary Language</label>
              <input
                type="text"
                placeholder="e.g. English, Chinese"
                value={filters.language ?? ''}
                onChange={(e) => update('language', e.target.value)}
                className="input mt-1"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="label">
                Content Tags
                <span className="ml-1 text-xs font-normal text-gray-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Automotive, Lifestyle"
                value={filters.tags ?? ''}
                onChange={(e) => update('tags', e.target.value)}
                className="input mt-1"
              />
            </div>

            {/* Blacklist status */}
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

          {/* Reset */}
          {activeCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button onClick={onReset} className="btn-ghost text-sm gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
