import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import clsx from 'clsx';

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'general' | 'team' | 'clients' | 'integrations';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'team', label: 'Team' },
  { id: 'clients', label: 'Clients' },
  { id: 'integrations', label: 'Integrations' },
];

// ─── General Tab ──────────────────────────────────────────────────────────────

const CURRENCIES = ['AUD', 'USD', 'CNY', 'EUR', 'GBP', 'SGD'];
const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Asia/Shanghai',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

function GeneralTab() {
  const [currency, setCurrency] = useState(() => localStorage.getItem('app-currency') || 'AUD');
  const [timezone, setTimezone] = useState(() => localStorage.getItem('app-timezone') || 'Australia/Sydney');
  const [language, setLanguage] = useState(() => localStorage.getItem('app-language') || 'en');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('app-currency', currency);
    localStorage.setItem('app-timezone', timezone);
    localStorage.setItem('app-language', language);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="card p-6 space-y-5">
        <h3 className="text-sm font-semibold text-gray-700">Preferences</h3>

        <div>
          <label className="label">Default Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="input mt-1"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="input mt-1"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input mt-1"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {!saved && <span />}
          <button onClick={handleSave} className="btn-primary text-sm">Save preferences</button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Platform</h3>
        <p className="text-xs text-gray-400 mb-4">Hylink KOL Management System · v1.0</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Deployment</p>
            <p className="text-gray-700">Vercel (Frontend) · Railway (Backend)</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Database</p>
            <p className="text-gray-700">PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  specialist: 'bg-green-50 text-green-700 border-green-200',
  viewer: 'bg-gray-50 text-gray-600 border-gray-200',
};

function TeamTab() {
  const user = useAuthStore((s) => s.user);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('specialist');
  const [inviteSent, setInviteSent] = useState(false);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    // In production, this would call an API
    setInviteSent(true);
    setInviteEmail('');
    setTimeout(() => setInviteSent(false), 3000);
  };

  const currentMembers = user
    ? [{ id: user.id ?? '1', fullName: user.fullName, email: user.email, role: 'admin', status: 'active' }]
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Current members */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Team Members</h3>
          <p className="text-xs text-gray-400 mt-0.5">{currentMembers.length} member{currentMembers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="divide-y divide-gray-100">
          {currentMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex-shrink-0">
                {m.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.fullName}</p>
                <p className="text-xs text-gray-400">{m.email}</p>
              </div>
              <span className={clsx('rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize', ROLE_COLORS[m.role])}>
                {m.role}
              </span>
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invite form */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Invite Team Member</h3>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="input mt-1"
              />
            </div>
            <div className="w-36">
              <label className="label">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="input mt-1"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="specialist">Specialist</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {inviteSent && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Invitation sent!
              </span>
            )}
            {!inviteSent && <span />}
            <button type="submit" disabled={!inviteEmail.trim()} className="btn-primary text-sm">
              Send Invite
            </button>
          </div>
        </form>

        {/* Role descriptions */}
        <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Role Permissions</p>
          {[
            { role: 'Admin', desc: 'Full access — manage team, campaigns, KOLs, and settings' },
            { role: 'Manager', desc: 'Create & edit campaigns, manage KOL pipeline' },
            { role: 'Specialist', desc: 'View & update KOL records and campaign details' },
            { role: 'Viewer', desc: 'Read-only access to all data' },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-start gap-2 text-xs">
              <span className={clsx('rounded-full border px-2 py-0.5 font-medium flex-shrink-0', ROLE_COLORS[role.toLowerCase()])}>
                {role}
              </span>
              <span className="text-gray-500 pt-0.5">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab() {
  const { data } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const campaigns: Campaign[] = data?.data ?? [];

  // Derive unique clients
  const clientMap = new Map<string, { name: string; campaigns: typeof campaigns }>();
  campaigns.forEach((c) => {
    if (!clientMap.has(c.clientName)) {
      clientMap.set(c.clientName, { name: c.clientName, campaigns: [] });
    }
    clientMap.get(c.clientName)!.campaigns.push(c);
  });
  const clients = Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''} — derived from campaign records</p>
      </div>

      {clients.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm">No clients yet</p>
          <p className="text-xs mt-1">Clients appear automatically when you create campaigns</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {clients.map((client) => {
              const active = client.campaigns.filter((c) => c.status === 'Executing').length;
              const total = client.campaigns.length;
              return (
                <div key={client.name} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 text-sm font-bold flex-shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-400">
                      {total} campaign{total !== 1 ? 's' : ''}
                      {active > 0 && ` · ${active} active`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                    {client.campaigns.slice(0, 3).map((c) => (
                      <span key={c.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 truncate max-w-[120px]">
                        {c.name}
                      </span>
                    ))}
                    {client.campaigns.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{client.campaigns.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    {
      name: 'Instagram via RapidAPI',
      description: 'Search Instagram creators for KOL Discovery',
      status: 'connected',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      name: 'TikTok API',
      description: 'Search TikTok creators and track performance',
      status: 'coming_soon',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.88a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" />
        </svg>
      ),
    },
    {
      name: 'YouTube Data API',
      description: 'Search YouTube creators and analytics',
      status: 'coming_soon',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      name: 'Xiaohongshu (小红书)',
      description: 'Search Chinese KOLs on RED platform',
      status: 'coming_soon',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <rect width="24" height="24" rx="6" fill="#FE2C55" opacity="0.1" />
          <text x="4" y="17" fontSize="14" fontWeight="bold" fill="#FE2C55">R</text>
        </svg>
      ),
    },
    {
      name: 'Slack Notifications',
      description: 'Get campaign alerts in your Slack workspace',
      status: 'coming_soon',
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
        </svg>
      ),
    },
  ];

  const statusBadge = (status: string) => {
    if (status === 'connected') return <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium">Connected</span>;
    return <span className="rounded-full bg-gray-50 text-gray-400 border border-gray-200 px-2.5 py-0.5 text-xs font-medium">Coming Soon</span>;
  };

  return (
    <div className="max-w-2xl space-y-3">
      {integrations.map((int) => (
        <div key={int.name} className="card flex items-center gap-4 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-600 flex-shrink-0">
            {int.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{int.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{int.description}</p>
          </div>
          {statusBadge(int.status)}
        </div>
      ))}
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your workspace preferences and team</p>
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'team' && <TeamTab />}
      {activeTab === 'clients' && <ClientsTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
    </div>
  );
}
