import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignKolRecord } from '@/api/campaigns.api';
import { CampaignKolStatus } from '@/types';

// ─── Column configuration ─────────────────────────────────────────────────────

interface ColumnConfig {
  status: CampaignKolStatus;
  label: string;
  color: string;   // ring + dot color classes
  bg: string;
}

const COLUMNS: ColumnConfig[] = [
  { status: CampaignKolStatus.SHORTLISTED,         label: 'Shortlisted',          color: 'text-slate-400',   bg: 'bg-slate-900/30' },
  { status: CampaignKolStatus.SUBMITTED_TO_CLIENT, label: 'Submitted',            color: 'text-blue-400',    bg: 'bg-blue-900/30' },
  { status: CampaignKolStatus.APPROVED_BY_CLIENT,  label: 'Client ✓',             color: 'text-green-400',   bg: 'bg-green-900/30' },
  { status: CampaignKolStatus.REJECTED_BY_CLIENT,  label: 'Client ✗',             color: 'text-red-400',     bg: 'bg-red-900/30' },
  { status: CampaignKolStatus.CONTACTED,            label: 'Contacted',            color: 'text-yellow-400',  bg: 'bg-yellow-900/30' },
  { status: CampaignKolStatus.NEGOTIATING,          label: 'Negotiating',          color: 'text-orange-400',  bg: 'bg-orange-900/30' },
  { status: CampaignKolStatus.CONTRACTED,           label: 'Contracted',           color: 'text-indigo-400',  bg: 'bg-indigo-900/30' },
  { status: CampaignKolStatus.CONTENT_SUBMITTED,   label: 'Content In',           color: 'text-purple-400',  bg: 'bg-purple-900/30' },
  { status: CampaignKolStatus.CONTENT_APPROVED,    label: 'Content ✓',            color: 'text-teal-400',    bg: 'bg-teal-900/30' },
  { status: CampaignKolStatus.PUBLISHED,            label: 'Published',            color: 'text-pink-400',    bg: 'bg-pink-900/30' },
  { status: CampaignKolStatus.COMPLETED,            label: 'Completed',            color: 'text-gray-400',    bg: 'bg-gray-800/50' },
];

// ─── Draggable KOL Card ───────────────────────────────────────────────────────

function KolCard({
  record,
  isDragOverlay = false,
  onClick,
}: {
  record: CampaignKolRecord;
  isDragOverlay?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.kolId,
    data: { record },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const kol = record.kol;
  const topPlatform = kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      onClick={(e) => {
        // Only trigger click if not dragging
        if (!isDragging && onClick) { e.stopPropagation(); onClick(); }
      }}
      className={clsx(
        'rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-sm select-none transition-shadow',
        isDragOverlay
          ? 'rotate-2 shadow-xl opacity-95 cursor-grabbing'
          : isDragging
            ? 'opacity-30'
            : 'cursor-grab hover:shadow-md hover:border-primary-500/50',
      )}
    >
      {/* KOL name + blacklist */}
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-900/50 text-primary-300 text-xs font-bold border border-primary-700/40">
          {kol.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-100 truncate">{kol.name}</p>
          {kol.nickname && <p className="text-xs text-gray-400 truncate">@{kol.nickname}</p>}
        </div>
      </div>

      {/* Platform & followers */}
      {topPlatform && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <span className="font-medium text-gray-300">{topPlatform.platformName}</span>
          {topPlatform.followersCount && (
            <span>· {topPlatform.followersCount >= 1000
              ? `${(topPlatform.followersCount / 1000).toFixed(0)}K`
              : topPlatform.followersCount
            }</span>
          )}
        </div>
      )}

      {/* Negotiated fee (if set) */}
      {record.negotiatedFee && (
        <div className="mt-2 text-xs font-semibold text-green-400">
          AUD ${record.negotiatedFee.toLocaleString()}
        </div>
      )}

      {/* Client feedback indicator */}
      {record.clientFeedback && (
        <div className={clsx('mt-2 text-xs font-medium', record.clientFeedback === 'Approved' ? 'text-green-400' : 'text-red-400')}>
          {record.clientFeedback === 'Approved' ? '✓ Client approved' : '✗ Client rejected'}
        </div>
      )}
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────────────────

function KanbanColumn({
  config,
  records,
  onCardClick,
}: {
  config: ColumnConfig;
  records: CampaignKolRecord[];
  onCardClick: (r: CampaignKolRecord) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: config.status });

  return (
    <div className="flex w-56 flex-shrink-0 flex-col rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Column header */}
      <div className={clsx('px-3 py-2.5 border-b border-gray-700', config.bg)}>
        <div className="flex items-center justify-between">
          <span className={clsx('text-xs font-semibold', config.color)}>{config.label}</span>
          <span className="text-xs font-medium text-gray-500 bg-gray-800 rounded-full px-2 py-0.5 border border-gray-700">
            {records.length}
          </span>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 space-y-2 p-2 min-h-[120px] transition-colors',
          isOver && 'bg-primary-900/20 ring-2 ring-inset ring-primary-500/40 rounded-b-xl',
        )}
      >
        {records.map((r) => (
          <KolCard key={r.kolId} record={r} onClick={() => onCardClick(r)} />
        ))}
        {records.length === 0 && (
          <div className={clsx('flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs', isOver ? 'border-primary-500/50 text-primary-400' : 'border-gray-700 text-gray-600')}>
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
  records: CampaignKolRecord[];
  onCardClick: (r: CampaignKolRecord) => void;
}

export default function CampaignKanban({ campaignId, records, onCardClick }: Props) {
  const qc = useQueryClient();
  const [activeRecord, setActiveRecord] = useState<CampaignKolRecord | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const updateMutation = useMutation({
    mutationFn: ({ kolId, status }: { kolId: string; status: CampaignKolStatus }) =>
      campaignsApi.updateCampaignKol(campaignId, kolId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] }),
  });

  const handleDragStart = (e: DragStartEvent) => {
    const rec = records.find(r => r.kolId === e.active.id);
    setActiveRecord(rec ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveRecord(null);
    if (!over) return;

    const kolId = active.id as string;
    const newStatus = over.id as CampaignKolStatus;
    const record = records.find(r => r.kolId === kolId);
    if (!record || record.status === newStatus) return;

    updateMutation.mutate({ kolId, status: newStatus });
  };

  // Group records by status
  const byStatus = Object.fromEntries(
    COLUMNS.map(c => [c.status, records.filter(r => r.status === c.status)]),
  ) as Record<CampaignKolStatus, CampaignKolRecord[]>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col.status}
            config={col}
            records={byStatus[col.status] ?? []}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Drag overlay — the floating card following the cursor */}
      <DragOverlay>
        {activeRecord && <KolCard record={activeRecord} isDragOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
