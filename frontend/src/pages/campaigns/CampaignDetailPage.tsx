import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi, type CampaignKolRecord } from '@/api/campaigns.api';
import { kolsApi } from '@/api/kols.api';
import CampaignKanban from '@/components/campaigns/CampaignKanban';
import KolDetailDrawer from '@/components/campaigns/KolDetailDrawer';
import PortalLinkModal from '@/components/campaigns/PortalLinkModal';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CampaignStatus } from '@/types';
import Modal from '@/components/ui/Modal';
import { reportingApi } from '@/api/reporting.api';

const STATUS_VARIANT: Record<string, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]: 'gray',
  [CampaignStatus.PLANNING]: 'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

// ─── Add KOLs modal ───────────────────────────────────────────────────────────

function AddKolsModal({
  campaignId,
  open,
  onClose,
}: {
  campaignId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['kols-picker', search],
    queryFn: () => kolsApi.list({ search: search || undefined, limit: 50 }),
    enabled: open,
    placeholderData: (prev) => prev,
  });

  const kols = data?.data ?? [];

  const mutation = useMutation({
    mutationFn: () => campaignsApi.addKols(campaignId, [...selected]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-kols', campaignId] });
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
      setSelected(new Set());
      onClose();
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add KOLs to Campaign"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={selected.size === 0 || mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Adding…' : `Add ${selected.size > 0 ? selected.size : ''} KOL${selected.size !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Search KOLs by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
        />

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : kols.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">No KOLs found</div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800 rounded-xl border border-gray-700">
            {kols.map((kol) => {
              const top = kol.platforms?.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
              const isChecked = selected.has(kol.id);
              return (
                <label
                  key={kol.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(kol.id)}
                    className="h-4 w-4 rounded accent-primary-500"
                  />
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-900/50 text-primary-300 text-xs font-bold border border-primary-700/40">
                    {kol.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-100 truncate">{kol.name}</p>
                    {top && (
                      <p className="text-xs text-gray-400 truncate">
                        {top.platformName}
                        {top.followersCount != null && ` · ${top.followersCount >= 1000 ? `${(top.followersCount / 1000).toFixed(0)}K` : top.followersCount}`}
                      </p>
                    )}
                  </div>
                  {kol.kolTier && (
                    <span className="flex-shrink-0 rounded-full bg-primary-900/40 px-2 py-0.5 text-xs text-primary-400">
                      {kol.kolTier}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {mutation.isError && (
          <p className="text-xs text-red-500">Failed to add KOLs. Please try again.</p>
        )}
      </div>
    </Modal>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [drawerRecord, setDrawerRecord] = useState<CampaignKolRecord | null>(null);
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addKolsOpen, setAddKolsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!campaign) return;
    setDownloading(true);
    try {
      await reportingApi.downloadCampaignReport(campaign.id, campaign.name);
    } finally {
      setDownloading(false);
    }
  };

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id!),
    enabled: !!id,
  });

  const { data: records = [], isLoading: kolsLoading } = useQuery({
    queryKey: ['campaign-kols', id],
    queryFn: () => campaignsApi.getCampaignKols(id!),
    enabled: !!id,
  });

  if (campaignLoading) return <PageSpinner />;
  if (!campaign) return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-sm">Campaign not found.</p>
      <button onClick={() => navigate('/campaigns')} className="mt-3 btn-ghost text-sm">← Back</button>
    </div>
  );

  // Summary counts by status
  const summary = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-0">
      {/* Page header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/campaigns')}
          className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Campaigns
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge variant={STATUS_VARIANT[campaign.status] ?? 'gray'}>{campaign.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{campaign.clientName}</p>
            {(campaign.startDate || campaign.endDate) && (
              <p className="mt-1 text-xs text-gray-400">
                {campaign.startDate ?? '?'} → {campaign.endDate ?? '?'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="btn-secondary gap-1.5 text-sm"
            >
              {downloading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF Report
                </>
              )}
            </button>
            {campaign.briefDocumentUrl && (
              <a
                href={campaign.briefDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary gap-1.5 text-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Brief
              </a>
            )}
            <button onClick={() => setPortalModalOpen(true)} className="btn-secondary gap-1.5 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Portal link
            </button>
            <button onClick={() => setEditModalOpen(true)} className="btn-secondary gap-1.5 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button onClick={() => setAddKolsOpen(true)} className="btn-primary gap-1.5 text-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add KOLs
            </button>
          </div>
        </div>

        {/* KOL pipeline summary chips */}
        {records.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
              {records.length} total
            </span>
            {Object.entries(summary).map(([status, count]) => (
              <span key={status} className="rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-400">
                {status.replace(/_/g, ' ')}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Kanban board */}
      {kolsLoading ? (
        <PageSpinner />
      ) : (
        <CampaignKanban
          campaignId={id!}
          records={records}
          onCardClick={setDrawerRecord}
        />
      )}

      {/* KOL detail drawer */}
      <KolDetailDrawer
        record={drawerRecord}
        campaignId={id!}
        onClose={() => setDrawerRecord(null)}
      />

      {/* Portal link modal */}
      <PortalLinkModal
        campaign={campaign}
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
      />

      {/* Edit campaign modal */}
      <CampaignFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        campaign={campaign}
      />

      {/* Add KOLs modal */}
      <AddKolsModal
        campaignId={id!}
        open={addKolsOpen}
        onClose={() => setAddKolsOpen(false)}
      />
    </div>
  );
}
