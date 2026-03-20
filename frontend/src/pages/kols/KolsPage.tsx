import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SortingState, Updater } from '@tanstack/react-table';
import { kolsApi } from '@/api/kols.api';
import KolFilterPanel from '@/components/kols/KolFilterPanel';
import KolTable from '@/components/kols/KolTable';
import KolFormModal from '@/components/kols/KolFormModal';
import KolViewDrawer from '@/components/kols/KolViewDrawer';
import Modal from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Kol, KolQueryParams, CreateKolPayload } from '@/types';
import { PlatformName } from '@/types';
import clsx from 'clsx';

const DEFAULT_FILTERS: KolQueryParams = {
  search: '',
  platform: '',
  minFollowers: '',
  maxFollowers: '',
  minEngagement: '',
  maxEngagement: '',
  city: '',
  language: '',
  tags: '',
  tier: '',
  isBlacklisted: '',
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  order: 'DESC',
};

type KolViewMode = 'table' | 'grid';

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function kolsToCsv(kols: Kol[]): string {
  const headers = ['Name', 'Nickname', 'Country', 'City', 'Tier', 'Email', 'Tags', 'Rating', 'Blacklisted', 'Platform', 'Handle', 'Followers', 'Engagement'];
  const rows = kols.flatMap((k) => {
    if (k.platforms.length === 0) {
      return [[k.name, k.nickname ?? '', k.country, k.city ?? '', k.kolTier ?? '', k.contactEmail ?? '', k.contentTags.join(';'), k.collaborationRating ?? '', k.isBlacklisted ? 'Yes' : 'No', '', '', '', '']];
    }
    return k.platforms.map((p) => [
      k.name, k.nickname ?? '', k.country, k.city ?? '', k.kolTier ?? '', k.contactEmail ?? '',
      k.contentTags.join(';'), k.collaborationRating ?? '', k.isBlacklisted ? 'Yes' : 'No',
      p.platformName, p.handle, p.followersCount ?? '', p.avgEngagementRate != null ? (p.avgEngagementRate * 100).toFixed(2) + '%' : '',
    ]);
  });
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function fmtF(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const CSV_TEMPLATE = `Name,Nickname,Country,City,Tier,Email,Tags,Platform,Handle,Followers,EngagementRate
Jane Smith,janesmith,Australia,Sydney,Micro,jane@example.com,Lifestyle;Beauty,Instagram,@janesmith,85000,0.045
Tom Lee,tomlee_au,Australia,Melbourne,Macro,tom@example.com,Travel;Food,TikTok,@tomlee,320000,0.03`;

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function CsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CreateKolPayload[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);

  const reset = () => { setRows([]); setParseError(''); setImporting(false); setDone(0); setFailed(0); };

  useEffect(() => { if (open) reset(); }, [open]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) { setParseError('CSV must have a header row and at least one data row.'); return; }
        const parsed: CreateKolPayload[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          const [name, nickname, country, city, tier, email, tags, platform, handle, followers, engRate] = cols;
          if (!name) continue;
          const payload: CreateKolPayload = {
            name,
            nickname: nickname || undefined,
            country: country || 'Australia',
            city: city || undefined,
            kolTier: tier as CreateKolPayload['kolTier'] || undefined,
            contactEmail: email || undefined,
            contentTags: tags ? tags.split(';').map((t) => t.trim()).filter(Boolean) : [],
          };
          if (platform && handle) {
            payload.platforms = [{
              platformName: platform as PlatformName,
              handle: handle.replace(/^@/, ''),
              followersCount: followers ? Number(followers) : undefined,
              avgEngagementRate: engRate ? parseFloat(engRate) : undefined,
            }];
          }
          parsed.push(payload);
        }
        if (parsed.length === 0) { setParseError('No valid rows found.'); return; }
        setRows(parsed);
        setParseError('');
      } catch {
        setParseError('Failed to parse CSV. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    let ok = 0, fail = 0;
    for (const payload of rows) {
      try { await kolsApi.create(payload); ok++; } catch { fail++; }
    }
    setDone(ok);
    setFailed(fail);
    setImporting(false);
    qc.invalidateQueries({ queryKey: ['kols'] });
  };

  return (
    <Modal open={open} onClose={onClose} title="Import KOLs from CSV" size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          {rows.length > 0 && !done && (
            <button onClick={handleImport} disabled={importing} className="btn-primary gap-2">
              {importing && <Spinner className="h-4 w-4" />}
              Import {rows.length} KOL{rows.length !== 1 ? 's' : ''}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {done > 0 ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4 text-center">
            <p className="text-emerald-700 font-semibold">{done} KOL{done !== 1 ? 's' : ''} imported successfully!</p>
            {failed > 0 && <p className="text-amber-600 text-sm mt-1">{failed} row{failed !== 1 ? 's' : ''} failed (may already exist)</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Upload a CSV file to bulk-import KOLs. <button onClick={() => downloadCsv(CSV_TEMPLATE, 'kol-import-template.csv')} className="text-primary-600 hover:underline font-medium">Download template</button></p>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
            >
              <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-400 mt-0.5">.csv files only</p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            {parseError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parseError}</p>}

            {rows.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500">{rows.length} row{rows.length !== 1 ? 's' : ''} ready to import</p>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="font-medium text-gray-800 min-w-[120px] truncate">{r.name}</span>
                      {r.nickname && <span className="text-gray-400 text-xs">@{r.nickname}</span>}
                      {r.platforms?.[0] && <span className="text-xs text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">{r.platforms[0].platformName}</span>}
                      {r.kolTier && <span className="text-xs text-gray-400">{r.kolTier}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── KOL Compare Modal ────────────────────────────────────────────────────────

function KolCompareModal({ open, onClose, kols }: { open: boolean; onClose: () => void; kols: Kol[] }) {
  const allPlatforms = Array.from(new Set(kols.flatMap((k) => k.platforms.map((p) => p.platformName))));

  return (
    <Modal open={open} onClose={onClose} title={`KOL Comparison (${kols.length})`} size="xl"
      footer={<button onClick={onClose} className="btn-secondary">Close</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <td className="w-28 py-3 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wide" />
              {kols.map((k) => (
                <th key={k.id} className="py-3 px-3 text-center align-top min-w-[140px]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary-50 text-primary-600 text-sm font-bold flex items-center justify-center border border-primary-100">
                      {k.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 whitespace-nowrap">{k.name}</p>
                      {k.nickname && <p className="text-xs text-gray-400">@{k.nickname}</p>}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Tier */}
            <tr className="bg-gray-50/50">
              <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tier</td>
              {kols.map((k) => (
                <td key={k.id} className="py-3 px-3 text-center">
                  <span className="inline-block rounded-full bg-primary-50 text-primary-700 text-xs font-medium px-2.5 py-0.5">
                    {k.kolTier?.split('(')[0] ?? '—'}
                  </span>
                </td>
              ))}
            </tr>
            {/* Location */}
            <tr>
              <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</td>
              {kols.map((k) => (
                <td key={k.id} className="py-3 px-3 text-center text-gray-700">
                  {[k.city, k.country].filter(Boolean).join(', ') || '—'}
                </td>
              ))}
            </tr>
            {/* Rating */}
            <tr className="bg-gray-50/50">
              <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rating</td>
              {kols.map((k) => (
                <td key={k.id} className="py-3 px-3 text-center">
                  {k.collaborationRating != null
                    ? <span className="font-semibold text-amber-500">{k.collaborationRating}/5</span>
                    : '—'}
                </td>
              ))}
            </tr>
            {/* Per-platform rows */}
            {allPlatforms.map((platform) => (
              <tr key={platform}>
                <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{platform}</td>
                {kols.map((k) => {
                  const p = k.platforms.find((pl) => pl.platformName === platform);
                  return (
                    <td key={k.id} className="py-3 px-3 text-center">
                      {p ? (
                        <div className="space-y-0.5">
                          {p.followersCount != null && (
                            <p className="font-semibold text-gray-900">{fmtF(p.followersCount)}</p>
                          )}
                          {p.avgEngagementRate != null && (
                            <p className="text-xs text-emerald-600">{(p.avgEngagementRate * 100).toFixed(1)}% eng</p>
                          )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Tags */}
            <tr className="bg-gray-50/50">
              <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags</td>
              {kols.map((k) => (
                <td key={k.id} className="py-3 px-3 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {k.contentTags.slice(0, 3).map((tag) => (
                      <span key={tag} className="inline-block rounded-full bg-amber-50 text-amber-700 text-xs px-2 py-0.5">{tag}</span>
                    ))}
                    {k.contentTags.length > 3 && <span className="text-xs text-gray-400">+{k.contentTags.length - 3}</span>}
                    {k.contentTags.length === 0 && <span className="text-gray-300">—</span>}
                  </div>
                </td>
              ))}
            </tr>
            {/* Email */}
            <tr>
              <td className="py-3 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</td>
              {kols.map((k) => (
                <td key={k.id} className="py-3 px-3 text-center">
                  {k.contactEmail
                    ? <span className="text-xs text-gray-600 font-mono break-all">{k.contactEmail}</span>
                    : '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// ─── Email Generator Modal ────────────────────────────────────────────────────

type EmailTemplate = 'outreach' | 'partnership' | 'followup';

function generateEmail(template: EmailTemplate, kol: Kol): string {
  const name = kol.name;
  const handle = kol.platforms[0]?.handle ? `@${kol.platforms[0].handle}` : '';
  const platform = kol.platforms[0]?.platformName ?? 'social media';
  const tier = kol.kolTier?.split('(')[0] ?? '';
  const tags = kol.contentTags.slice(0, 2).join(' & ') || 'content';
  const followerStr = kol.platforms[0]?.followersCount ? fmtF(kol.platforms[0].followersCount) + ' followers' : '[followers]';

  switch (template) {
    case 'outreach':
      return `Hi ${name},

I hope this message finds you well! My name is [Your Name] from Hylink Australia, a leading influencer marketing agency specialising in connecting brands with authentic voices across Australia.

We've been following your ${platform} journey${handle ? ` (${handle})` : ''} and are genuinely impressed by the engaging ${tags} content you create. Your audience connection is exactly what our clients are looking for.

We'd love to explore collaboration opportunities that align with your brand values and audience. Our campaigns give you full creative freedom while delivering measurable results for our partners.

Would you be open to a quick chat or email exchange to explore possibilities?

Looking forward to hearing from you!

Best regards,
[Your Name]
Hylink Australia
[Your Email] | [Your Phone]`;

    case 'partnership':
      return `Hi ${name},

I'm reaching out from Hylink Australia regarding an exciting partnership opportunity with [Brand Name], a [brand description] that I believe would resonate perfectly with your audience.

Campaign Overview:
• Campaign: [Campaign Name]
• Duration: [Start Date] – [End Date]
• Deliverables: [e.g., 2× Reels, 3× Stories]
• Compensation: [Fee / Product + Fee]

Why we think you're a great fit:
• Your ${tier ? tier + '-tier ' : ''}presence on ${platform} aligns with the brand's target demographic
• Your authentic ${tags} content style matches the campaign creative direction
• Estimated reach: ${followerStr}

We'd love to send over a full brief if you're interested. Please reply to this email or book a call at [Calendly Link].

Excited about the potential here!

Best,
[Your Name]
Hylink Australia`;

    case 'followup':
      return `Hi ${name},

I wanted to follow up on my previous message about a collaboration opportunity with Hylink Australia.

I understand you're busy — we'd need just 10 minutes to share what we have in mind. The campaign is a strong fit for your ${tags} content and ${platform} audience.

If the timing isn't right at the moment, no worries at all! I'd still love to add you to our network for future campaigns.

Would a quick call this week work for you? Alternatively, feel free to reply with any questions.

Thanks for your time, ${name}!

Warm regards,
[Your Name]
Hylink Australia
[Your Email]`;
  }
}

function EmailGeneratorModal({ open, onClose, kol }: { open: boolean; onClose: () => void; kol: Kol | null }) {
  const [template, setTemplate] = useState<EmailTemplate>('outreach');
  const [copied, setCopied] = useState(false);

  const emailText = kol ? generateEmail(template, kol) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const templates: { id: EmailTemplate; label: string }[] = [
    { id: 'outreach', label: 'Cold Outreach' },
    { id: 'partnership', label: 'Partnership Pitch' },
    { id: 'followup', label: 'Follow-up' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Email Generator${kol ? ` — ${kol.name}` : ''}`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={handleCopy} className="btn-primary gap-2">
            {copied ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy to clipboard
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Template selector */}
        <div className="flex gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={clsx(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                template === t.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Email preview */}
        <textarea
          value={emailText}
          readOnly
          rows={18}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
        <p className="text-xs text-gray-400">Fill in bracketed placeholders [like this] before sending.</p>
      </div>
    </Modal>
  );
}

// ─── KOL Grid Card ────────────────────────────────────────────────────────────

function KolGridCard({
  kol,
  isSelected,
  onView,
  onEdit,
  onToggleSelect,
}: {
  kol: Kol;
  isSelected: boolean;
  onView: (kol: Kol) => void;
  onEdit: (kol: Kol) => void;
  onToggleSelect: (id: string) => void;
}) {
  const primaryPlatform = kol.platforms[0];
  const totalFollowers = kol.platforms.reduce((sum, p) => sum + (p.followersCount ?? 0), 0);
  const avgEngagement = primaryPlatform?.avgEngagementRate;
  const location = [kol.city, kol.country].filter(Boolean).join(', ');
  const visibleTags = kol.contentTags.slice(0, 3);
  const extraTags = kol.contentTags.length - visibleTags.length;

  // Platform icon abbreviations
  const platformAbbr: Record<string, string> = {
    Instagram: 'IG',
    TikTok: 'TK',
    YouTube: 'YT',
    Xiaohongshu: 'XHS',
    Weibo: 'WB',
  };

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white flex flex-col overflow-hidden transition-all',
        isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm',
      )}
    >
      {/* Top section */}
      <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-4 text-center">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-700 text-lg font-bold flex items-center justify-center flex-shrink-0">
          {kol.name.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <div className="min-w-0 w-full">
          <p className="font-semibold text-gray-900 text-sm truncate">{kol.name}</p>
          <div className="flex items-center justify-center gap-1.5 mt-0.5 flex-wrap">
            {kol.nickname && (
              <span className="text-xs text-gray-400 truncate max-w-[80px]">@{kol.nickname}</span>
            )}
            {primaryPlatform && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {platformAbbr[primaryPlatform.platformName] ?? primaryPlatform.platformName}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {location && (
          <p className="text-xs text-gray-400 truncate w-full">{location}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Stats row */}
      <div className="flex items-center justify-around gap-1 px-3 py-3 text-xs">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-gray-400">Followers</span>
          <span className="font-semibold text-gray-800">
            {totalFollowers > 0 ? fmtF(totalFollowers) : '—'}
          </span>
        </div>
        <div className="w-px h-6 bg-gray-100" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-gray-400">Eng%</span>
          <span className="font-semibold text-emerald-600">
            {avgEngagement != null ? `${(avgEngagement * 100).toFixed(1)}%` : '—'}
          </span>
        </div>
        <div className="w-px h-6 bg-gray-100" />
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-gray-400">Rating</span>
          <span className="font-semibold text-amber-500">
            {kol.collaborationRating != null ? `${kol.collaborationRating} ★` : '—'}
          </span>
        </div>
      </div>

      {/* Tags */}
      {(visibleTags.length > 0 || extraTags > 0) && (
        <>
          <div className="border-t border-gray-100" />
          <div className="flex flex-wrap gap-1 px-3 py-2.5">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-amber-50 text-amber-700 text-xs px-2 py-0.5 truncate max-w-[80px]"
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="text-xs text-gray-400">+{extraTags} more</span>
            )}
          </div>
        </>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 mt-auto" />

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2.5">
        <button
          onClick={() => onView(kol)}
          className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors text-center"
        >
          View
        </button>
        <button
          onClick={() => onEdit(kol)}
          className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors text-center"
        >
          Edit
        </button>
        <button
          onClick={() => onToggleSelect(kol.id)}
          className={clsx(
            'flex items-center justify-center rounded-lg p-1.5 transition-colors',
            isSelected
              ? 'bg-primary-100 text-primary-600 hover:bg-primary-200'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
          )}
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── KOL Grid View ────────────────────────────────────────────────────────────

function KolGridView({
  kols,
  selectedIds,
  onView,
  onEdit,
  onToggleSelect,
}: {
  kols: Kol[];
  selectedIds: Set<string>;
  onView: (kol: Kol) => void;
  onEdit: (kol: Kol) => void;
  onToggleSelect: (id: string) => void;
}) {
  if (kols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-gray-600">No KOLs found</p>
        <p className="mt-1 text-xs text-gray-400">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {kols.map((kol) => (
        <KolGridCard
          key={kol.id}
          kol={kol}
          isSelected={selectedIds.has(kol.id)}
          onView={onView}
          onEdit={onEdit}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

// ─── View Toggle ──────────────────────────────────────────────────────────────

function KolViewToggle({ mode, onChange }: { mode: KolViewMode; onChange: (m: KolViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
      <button
        onClick={() => onChange('table')}
        title="Table view"
        className={clsx(
          'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
          mode === 'table'
            ? 'bg-white text-primary-600 shadow-sm border border-gray-200'
            : 'text-gray-400 hover:text-gray-600',
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
        </svg>
      </button>
      <button
        onClick={() => onChange('grid')}
        title="Grid view"
        className={clsx(
          'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
          mode === 'grid'
            ? 'bg-white text-primary-600 shadow-sm border border-gray-200'
            : 'text-gray-400 hover:text-gray-600',
        )}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KolsPage() {
  const [filters, setFilters] = useState<KolQueryParams>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKol, setEditingKol] = useState<Kol | null>(null);
  const [viewingKol, setViewingKol] = useState<Kol | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailKol, setEmailKol] = useState<Kol | null>(null);

  const [viewMode, setViewMode] = useState<KolViewMode>(() => {
    try {
      const stored = localStorage.getItem('kols-view');
      return (stored === 'table' || stored === 'grid') ? stored : 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (m: KolViewMode) => {
    setViewMode(m);
    try { localStorage.setItem('kols-view', m); } catch { /* noop */ }
  };

  const debouncedFilters = useDebounce(filters, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['kols', debouncedFilters],
    queryFn: () => kolsApi.list(debouncedFilters),
    placeholderData: (prev) => prev,
  });

  const handleSortingChange = useCallback((updater: Updater<SortingState>) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    if (newSorting.length > 0) {
      setFilters((f) => ({ ...f, sortBy: newSorting[0].id, order: newSorting[0].desc ? 'DESC' : 'ASC', page: 1 }));
    } else {
      setFilters((f) => ({ ...f, sortBy: 'created_at', order: 'DESC', page: 1 }));
    }
  }, [sorting]);

  const handleOpenCreate = () => { setEditingKol(null); setModalOpen(true); };
  const handleOpenEdit = (kol: Kol) => { setViewingKol(null); setEditingKol(kol); setModalOpen(true); };

  const kolList = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  // Bulk select
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allIds = kolList.map((k) => k.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); allIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); allIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const handleExportSelected = () => {
    const selected = kolList.filter((k) => selectedIds.has(k.id));
    const csv = kolsToCsv(selected);
    downloadCsv(csv, `kol-export-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportAll = () => {
    const csv = kolsToCsv(kolList);
    downloadCsv(csv, `kol-export-all-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">KOL Database</h1>
          {meta.total > 0 && (
            <span className="flex items-center justify-center rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              {meta.total.toLocaleString()}
            </span>
          )}
          {isFetching && !isLoading && (
            <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <KolViewToggle mode={viewMode} onChange={handleViewModeChange} />

          {/* Export dropdown */}
          <div className="relative group">
            <button className="btn-secondary gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
            <div className="absolute right-0 top-full mt-1.5 z-30 hidden group-hover:block w-48 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
              <button onClick={handleExportAll} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                Export current page
              </button>
              {selectedIds.size > 0 && (
                <button onClick={handleExportSelected} className="w-full text-left px-4 py-2.5 text-sm text-primary-600 hover:bg-primary-50">
                  Export selected ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Import */}
          <button onClick={() => setImportOpen(true)} className="btn-secondary gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import CSV
          </button>

          <button onClick={handleOpenCreate} className="btn-primary gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add KOL
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-primary-50 border border-primary-200 px-4 py-2.5">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-3 ml-auto">
            {/* Email — only when exactly 1 selected */}
            {selectedIds.size === 1 && (() => {
              const kol = kolList.find((k) => selectedIds.has(k.id)) ?? null;
              return (
                <button
                  onClick={() => { setEmailKol(kol); setEmailOpen(true); }}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Generate Email
                </button>
              );
            })()}
            {/* Compare — when 2–4 selected */}
            {selectedIds.size >= 2 && selectedIds.size <= 4 && (
              <button
                onClick={() => setCompareOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare
              </button>
            )}
            <button onClick={handleExportSelected} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <KolFilterPanel
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* KOL content */}
      {viewMode === 'table' ? (
        <KolTable
          data={kolList}
          total={meta.total}
          page={meta.page}
          limit={meta.limit}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onView={setViewingKol}
          onEdit={handleOpenEdit}
          onRowClick={setViewingKol}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      ) : (
        <KolGridView
          kols={kolList}
          selectedIds={selectedIds}
          onView={setViewingKol}
          onEdit={handleOpenEdit}
          onToggleSelect={handleToggleSelect}
        />
      )}

      {/* KOL detail drawer */}
      <KolViewDrawer
        kol={viewingKol}
        onClose={() => setViewingKol(null)}
        onEdit={handleOpenEdit}
      />

      {/* Add / Edit modal */}
      <KolFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kol={editingKol}
      />

      {/* CSV Import modal */}
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* KOL Compare modal */}
      <KolCompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        kols={kolList.filter((k) => selectedIds.has(k.id))}
      />

      {/* Email Generator modal */}
      <EmailGeneratorModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        kol={emailKol}
      />
    </div>
  );
}
