import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CampaignStatus } from '@/types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<CampaignStatus, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]: 'gray',
  [CampaignStatus.PLANNING]: 'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

const STATUS_LABELS: Record<CampaignStatus, string> = {
  [CampaignStatus.DRAFT]: 'Draft',
  [CampaignStatus.PLANNING]: 'Planning',
  [CampaignStatus.EXECUTING]: 'Executing',
  [CampaignStatus.COMPLETED]: 'Completed',
};

const KANBAN_COLUMNS: CampaignStatus[] = [
  CampaignStatus.DRAFT,
  CampaignStatus.PLANNING,
  CampaignStatus.EXECUTING,
  CampaignStatus.COMPLETED,
];

type ViewMode = 'kanban' | 'list';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getProgress(campaign: Campaign) {
  const total = campaign.kolTotal ?? 0;
  const summary = campaign.kolStatusSummary ?? {};
  const activeStatuses = ['Contracted', 'Content_Submitted', 'Content_Approved', 'Published', 'Completed'];
  const activeCount = activeStatuses.reduce((sum, s) => sum + (summary[s] ?? 0), 0);
  return total > 0 ? Math.round((activeCount / total) * 100) : 0;
}

// ─── Campaign Card (shared between kanban + grid) ───────────────────────────────

function CampaignCard({
  campaign,
  onClick,
  compact = false,
}: {
  campaign: Campaign;
  onClick: () => void;
  compact?: boolean;
}) {
  const total = campaign.kolTotal ?? 0;
  const progress = getProgress(campaign);
  const startFmt = formatDate(campaign.startDate);
  const endFmt = formatDate(campaign.endDate);

  if (compact) {
    // Kanban card — no status badge (column provides context)
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all group flex flex-col gap-2.5 select-none"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 group-hover:text-primary-600 text-sm leading-tight transition-colors truncate">
            {campaign.name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 truncate">{campaign.clientName}</p>
        </div>

        {(startFmt || endFmt) && (
          <p className="text-xs text-gray-400">
            {startFmt ?? '?'} → {endFmt ?? '?'}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          {total > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              {total}
            </span>
          )}
          {campaign.budget != null && (
            <span className="text-xs font-medium text-gray-600">AUD ${campaign.budget.toLocaleString()}</span>
          )}
        </div>

        {total > 0 && (
          <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Standard card (list-adjacent grid / old view)
  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all group flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 truncate transition-colors">
              {campaign.name}
            </h3>
            <Badge variant={STATUS_VARIANT[campaign.status as CampaignStatus] ?? 'gray'}>
              {STATUS_LABELS[campaign.status as CampaignStatus] ?? campaign.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500 truncate">{campaign.clientName}</p>
        </div>
        <svg className="h-4 w-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              {total} KOL{total !== 1 ? 's' : ''}
            </span>
            <span className="font-medium text-gray-700">{progress}% active</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        {(startFmt || endFmt) ? (
          <span>{startFmt ?? '?'} → {endFmt ?? '?'}</span>
        ) : (
          <span>No dates set</span>
        )}
        {campaign.budget != null && (
          <span className="font-medium text-gray-600">AUD ${campaign.budget.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

// ─── Draggable card wrapper ─────────────────────────────────────────────────────

function DraggableCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: campaign.id,
    data: { campaign },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <CampaignCard campaign={campaign} onClick={onClick} compact />
    </div>
  );
}

// ─── Droppable column ───────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  campaigns,
  onCardClick,
}: {
  status: CampaignStatus;
  campaigns: Campaign[];
  onCardClick: (c: Campaign) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const colorMap: Record<CampaignStatus, string> = {
    [CampaignStatus.DRAFT]: 'bg-gray-400',
    [CampaignStatus.PLANNING]: 'bg-blue-400',
    [CampaignStatus.EXECUTING]: 'bg-green-400',
    [CampaignStatus.COMPLETED]: 'bg-purple-400',
  };

  return (
    <div className="flex flex-col min-w-0 flex-1" style={{ minWidth: 220, maxWidth: 320 }}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${colorMap[status]}`} />
        <span className="font-semibold text-gray-700 text-sm truncate">{STATUS_LABELS[status]}</span>
        <span className="ml-auto flex-shrink-0 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
          {campaigns.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-xl p-2 min-h-[200px] flex-1 overflow-y-auto transition-colors ${
          isOver ? 'bg-primary-50 border-2 border-dashed border-primary-300' : 'bg-gray-50 border-2 border-transparent'
        }`}
        style={{ maxHeight: 'calc(100vh - 260px)' }}
      >
        {campaigns.map((c) => (
          <DraggableCard key={c.id} campaign={c} onClick={() => onCardClick(c)} />
        ))}
        {campaigns.length === 0 && (
          <div className="flex items-center justify-center flex-1 text-xs text-gray-300 py-6">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban board ───────────────────────────────────────────────────────────────

function KanbanBoard({
  campaigns,
  onCardClick,
  onStatusChange,
}: {
  campaigns: Campaign[];
  onCardClick: (c: Campaign) => void;
  onStatusChange: (id: string, status: CampaignStatus) => void;
}) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useCallback(() => {
    const map: Record<CampaignStatus, Campaign[]> = {
      [CampaignStatus.DRAFT]: [],
      [CampaignStatus.PLANNING]: [],
      [CampaignStatus.EXECUTING]: [],
      [CampaignStatus.COMPLETED]: [],
    };
    for (const c of campaigns) {
      const s = c.status as CampaignStatus;
      if (map[s]) map[s].push(c);
    }
    return map;
  }, [campaigns]);

  const handleDragStart = (event: DragStartEvent) => {
    const c = event.active.data.current?.campaign as Campaign | undefined;
    setActiveCampaign(c ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCampaign(null);
    const { active, over } = event;
    if (!over) return;
    const campaign = active.data.current?.campaign as Campaign | undefined;
    if (!campaign) return;
    const newStatus = over.id as CampaignStatus;
    if (newStatus === campaign.status) return;
    onStatusChange(campaign.id, newStatus);
  };

  const cols = grouped();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            campaigns={cols[status]}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCampaign && (
          <div style={{ width: 260 }}>
            <CampaignCard campaign={activeCampaign} onClick={() => {}} compact />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── List View ──────────────────────────────────────────────────────────────────

function CampaignListView({
  campaigns,
  onRowClick,
}: {
  campaigns: Campaign[];
  onRowClick: (c: Campaign) => void;
}) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No campaigns found</p>
        <p className="mt-1 text-xs text-gray-400">Try adjusting your search or filter</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">KOLs</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Budget</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {campaigns.map((c) => {
            const startFmt = formatDate(c.startDate);
            const endFmt = formatDate(c.endDate);
            const total = c.kolTotal ?? 0;
            return (
              <tr
                key={c.id}
                onClick={() => onRowClick(c)}
                className="hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                    {c.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.clientName}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANT[c.status as CampaignStatus] ?? 'gray'}>
                    {STATUS_LABELS[c.status as CampaignStatus] ?? c.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{total > 0 ? total : '—'}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.budget != null ? `AUD $${c.budget.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {startFmt || endFmt ? `${startFmt ?? '?'} → ${endFmt ?? '?'}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-primary-600 hover:underline">View</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── View Toggle ─────────────────────────────────────────────────────────────────

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5 bg-gray-50">
      <button
        onClick={() => onChange('kanban')}
        title="Kanban view"
        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
          mode === 'kanban'
            ? 'bg-white text-primary-600 shadow-sm border border-gray-200'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {/* Grid / kanban icon */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => onChange('list')}
        title="List view"
        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
          mode === 'list'
            ? 'bg-white text-primary-600 shadow-sm border border-gray-200'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        {/* List icon */}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem('campaigns-view');
      return (stored === 'kanban' || stored === 'list') ? stored : 'kanban';
    } catch {
      return 'kanban';
    }
  });

  const handleViewModeChange = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem('campaigns-view', m); } catch { /* noop */ }
  };

  // In kanban mode, always fetch all — no status/search filter on the server
  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', viewMode === 'kanban' ? '' : statusFilter, viewMode === 'kanban' ? '' : search],
    queryFn: () =>
      campaignsApi.list({
        status: viewMode === 'list' && statusFilter ? statusFilter : undefined,
        name: viewMode === 'list' && search ? search : undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const campaigns: Campaign[] = data?.data ?? [];
  const total: number = data?.total ?? campaigns.length;

  // Kanban drag-and-drop status update
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CampaignStatus }) =>
      campaignsApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const handleStatusChange = (id: string, status: CampaignStatus) => {
    statusMutation.mutate({ id, status });
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {total} campaign{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
          <button
            onClick={() => { setEditCampaign(null); setModalOpen(true); }}
            className="btn-primary gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>
      </div>

      {/* Search + status tabs — only for list view */}
      {viewMode === 'list' && (
        <div className="mb-5 space-y-3">
          <div className="relative max-w-sm">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search campaigns…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>

          <div className="flex gap-1 border-b border-gray-200">
            {(['', ...Object.values(CampaignStatus)] as string[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  statusFilter === s
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {s ? (STATUS_LABELS[s as CampaignStatus] ?? s) : 'All'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      {isLoading ? (
        <PageSpinner />
      ) : viewMode === 'kanban' ? (
        campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600">No campaigns found</p>
            <p className="mt-1 text-xs text-gray-400">Create your first campaign to get started</p>
            <button
              onClick={() => { setEditCampaign(null); setModalOpen(true); }}
              className="mt-4 btn-primary text-sm"
            >
              New Campaign
            </button>
          </div>
        ) : (
          <KanbanBoard
            campaigns={campaigns}
            onCardClick={(c) => navigate(`/campaigns/${c.id}`)}
            onStatusChange={handleStatusChange}
          />
        )
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">No campaigns found</p>
          <p className="mt-1 text-xs text-gray-400">
            {search || statusFilter ? 'Try adjusting your search or filter' : 'Create your first campaign to get started'}
          </p>
          {!search && !statusFilter && (
            <button
              onClick={() => { setEditCampaign(null); setModalOpen(true); }}
              className="mt-4 btn-primary text-sm"
            >
              New Campaign
            </button>
          )}
        </div>
      ) : (
        <CampaignListView
          campaigns={campaigns}
          onRowClick={(c) => navigate(`/campaigns/${c.id}`)}
        />
      )}

      <CampaignFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        campaign={editCampaign}
      />
    </div>
  );
}
