import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { kolsApi } from '@/api/kols.api';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import { reportingApi } from '@/api/reporting.api';
import clsx from 'clsx';

// ─── Route label map ───────────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  kols: 'KOL Database',
  campaigns: 'Campaigns',
  'influencer-search': 'KOL Discovery',
  roi: 'Analytics',
  settings: 'Settings',
  reports: 'Reports',
  payments: 'Payments',
  calendar: 'Calendar',
};

// ─── Breadcrumbs ───────────────────────────────────────────────────────────────

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const isUUID = /^[0-9a-f-]{36}$/i.test(segment);
        const label = isUUID
          ? 'Detail'
          : (ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '));
        const href = '/' + segments.slice(0, index + 1).join('/');

        return (
          <span key={href} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="font-semibold text-gray-900">{label}</span>
            ) : (
              <Link to={href} className="text-gray-400 hover:text-gray-700 transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ─── Global Search ─────────────────────────────────────────────────────────────

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debouncedQuery.trim().length >= 2;

  const { data: kolResults } = useQuery({
    queryKey: ['global-search-kols', debouncedQuery],
    queryFn: () => kolsApi.list({ search: debouncedQuery, limit: 5 }),
    enabled,
    staleTime: 10_000,
  });

  const { data: campaignResults } = useQuery({
    queryKey: ['global-search-campaigns', debouncedQuery],
    queryFn: () => campaignsApi.list({ name: debouncedQuery, limit: 5 }),
    enabled,
    staleTime: 10_000,
  });

  const kols = kolResults?.data ?? [];
  const campaigns = campaignResults?.data ?? [];
  const hasResults = kols.length > 0 || campaigns.length > 0;

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        open ? handleClose() : handleOpen();
      }
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:border-gray-300 hover:bg-gray-100 transition-colors w-48 sm:w-56"
      >
        <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left text-xs">Search everything…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
          ⌘K
        </kbd>
      </button>

      {/* Search modal */}
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

          {/* Search box */}
          <div className="relative mx-auto mt-20 w-full max-w-xl px-4">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search KOLs, campaigns…"
                  className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none bg-transparent"
                />
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xs">
                  ESC
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {!enabled && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    Type at least 2 characters to search
                  </div>
                )}

                {enabled && !hasResults && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No results for "{debouncedQuery}"
                  </div>
                )}

                {kols.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">
                      KOLs
                    </div>
                    {kols.map((kol) => (
                      <button
                        key={kol.id}
                        onClick={() => handleNavigate(`/kols/${kol.id}`)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-primary-50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {kol.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{kol.name}</p>
                          {kol.nickname && <p className="text-xs text-gray-400">@{kol.nickname}</p>}
                        </div>
                        {kol.kolTier && (
                          <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{kol.kolTier}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {campaigns.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">
                      Campaigns
                    </div>
                    {campaigns.map((c: Campaign) => (
                      <button
                        key={c.id}
                        onClick={() => handleNavigate(`/campaigns/${c.id}`)}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-primary-50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.clientName}</p>
                        </div>
                        <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{c.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer shortcuts */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 bg-gray-50 text-[10px] text-gray-400">
                <span>↑↓ navigate</span>
                <span>↵ open</span>
                <span>ESC close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Notification Panel ────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  body: string;
  link?: string;
}

function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Derive notifications from dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportingApi.getDashboardStats,
    staleTime: 60_000,
  });

  const notifications: Notification[] = [];

  if (stats) {
    const unpaid = stats.pipelineByStatus?.Contracted ?? 0;
    if (unpaid > 0) {
      notifications.push({
        id: 'unpaid',
        type: 'warning',
        title: `${unpaid} KOL${unpaid !== 1 ? 's' : ''} awaiting payment`,
        body: 'Review contracted KOLs with outstanding fees.',
        link: '/campaigns',
      });
    }
    if (stats.activeCampaigns > 0) {
      notifications.push({
        id: 'active',
        type: 'info',
        title: `${stats.activeCampaigns} active campaign${stats.activeCampaigns !== 1 ? 's' : ''}`,
        body: 'Check progress and update KOL pipeline statuses.',
        link: '/campaigns',
      });
    }
    const published = stats.pipelineByStatus?.Published ?? 0;
    if (published > 0) {
      notifications.push({
        id: 'published',
        type: 'success',
        title: `${published} post${published !== 1 ? 's' : ''} recently published`,
        body: 'Content is live — update performance metrics.',
        link: '/campaigns',
      });
    }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const typeStyles = {
    warning: { dot: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-100' },
    info: { dot: 'bg-blue-400', bg: 'bg-blue-50', border: 'border-blue-100' },
    success: { dot: 'bg-emerald-400', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        title="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary-600 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {notifications.length > 0 && (
              <span className="rounded-full bg-primary-100 text-primary-700 text-xs font-semibold px-2 py-0.5">
                {notifications.length}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">All clear!</p>
                <p className="text-xs text-gray-400 mt-0.5">No pending actions</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => {
                  const s = typeStyles[n.type];
                  return (
                    <div key={n.id} className={clsx('px-4 py-3', s.bg)}>
                      <div className="flex items-start gap-2.5">
                        <span className={clsx('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', s.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                          {n.link && (
                            <Link
                              to={n.link}
                              onClick={() => setOpen(false)}
                              className="mt-1 inline-block text-xs text-primary-600 hover:underline"
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Topbar ────────────────────────────────────────────────────────────────────

export default function Topbar({ onMobileMenu }: { onMobileMenu?: () => void }) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] gap-3">
      {/* Left — hamburger (mobile) + breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMobileMenu}
          className="md:hidden flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Breadcrumbs />
      </div>

      {/* Center — global search */}
      <div className="hidden md:flex flex-1 justify-center max-w-xs mx-auto">
        <GlobalSearch />
      </div>

      {/* Right — notifications + user */}
      <div className="flex items-center gap-2">
        <NotificationPanel />

        {user && (
          <div className="flex items-center gap-2.5 pl-1">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-800 leading-tight">{user.fullName}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
