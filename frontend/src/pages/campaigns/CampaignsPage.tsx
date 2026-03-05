import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import CampaignFormModal from '@/components/campaigns/CampaignFormModal';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CampaignStatus } from '@/types';

const STATUS_VARIANT: Record<CampaignStatus, 'gray' | 'blue' | 'green' | 'purple'> = {
  [CampaignStatus.DRAFT]: 'gray',
  [CampaignStatus.PLANNING]: 'blue',
  [CampaignStatus.EXECUTING]: 'green',
  [CampaignStatus.COMPLETED]: 'purple',
};

function CampaignCard({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) {
  const summary = campaign.kolStatusSummary ?? {};
  const total = campaign.kolTotal ?? 0;

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer hover:shadow-md hover:border-primary-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 truncate transition-colors">
              {campaign.name}
            </h3>
            <Badge variant={STATUS_VARIANT[campaign.status as CampaignStatus] ?? 'gray'}>
              {campaign.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">{campaign.clientName}</p>
        </div>
        <svg className="h-5 w-5 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* KOL pipeline mini-summary */}
      {total > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {Object.entries(summary).map(([status, count]) => (
            <span key={status} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {status.replace(/_/g, ' ')}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* Dates */}
      {(campaign.startDate || campaign.endDate) && (
        <p className="mt-3 text-xs text-gray-400">
          {campaign.startDate ?? '?'} → {campaign.endDate ?? '?'}
        </p>
      )}

      {/* KOL count badge */}
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
        </svg>
        {total} KOL{total !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: () => campaignsApi.list({ status: statusFilter || undefined }),
  });

  const campaigns: Campaign[] = data?.data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="mt-0.5 text-sm text-gray-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditCampaign(null); setModalOpen(true); }} className="btn-primary gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Campaign
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {['', ...Object.values(CampaignStatus)].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              statusFilter === s
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="h-10 w-10 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onClick={() => navigate(`/campaigns/${c.id}`)}
            />
          ))}
        </div>
      )}

      <CampaignFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        campaign={editCampaign}
      />
    </div>
  );
}
