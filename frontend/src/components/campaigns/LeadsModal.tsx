import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '@/api/leads.api';
import { LeadStatus, type Lead } from '@/types';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
  campaignKolId: string;
  kolName: string;
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'New',
  [LeadStatus.CONTACTED]: 'Contacted',
  [LeadStatus.TEST_DRIVE_BOOKED]: 'Test Drive Booked',
  [LeadStatus.TEST_DRIVE_COMPLETED]: 'Test Drive Done',
  [LeadStatus.CONVERTED]: 'Converted',
  [LeadStatus.LOST]: 'Lost',
};

const STATUS_COLOR: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'bg-blue-50 text-blue-700 ring-blue-200',
  [LeadStatus.CONTACTED]: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  [LeadStatus.TEST_DRIVE_BOOKED]: 'bg-purple-50 text-purple-700 ring-purple-200',
  [LeadStatus.TEST_DRIVE_COMPLETED]: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  [LeadStatus.CONVERTED]: 'bg-green-50 text-green-700 ring-green-200',
  [LeadStatus.LOST]: 'bg-gray-100 text-gray-500 ring-gray-200',
};

function LeadRow({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead.notes ?? '');

  const mutation = useMutation({
    mutationFn: (payload: { status?: LeadStatus; notes?: string }) =>
      leadsApi.update(lead.id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', lead.campaignKolId] }),
  });

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div className="border-b border-gray-100 last:border-0 py-3.5 px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 text-sm">{fullName}</span>
            {lead.email && <span className="text-xs text-gray-400">{lead.email}</span>}
            {lead.phone && <span className="text-xs text-gray-400">{lead.phone}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(lead.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          {lead.notes && !editingNotes && (
            <p className="text-xs text-gray-500 mt-1 italic">"{lead.notes}"</p>
          )}
          {editingNotes && (
            <div className="mt-1.5 flex gap-1.5">
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input text-xs flex-1 py-1"
                placeholder="Add notes…"
                autoFocus
              />
              <button
                onClick={() => {
                  mutation.mutate({ notes });
                  setEditingNotes(false);
                }}
                className="rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setNotes(lead.notes ?? ''); setEditingNotes(false); }}
                className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={lead.status}
            onChange={e => mutation.mutate({ status: e.target.value as LeadStatus })}
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset appearance-none cursor-pointer border-0 outline-none',
              STATUS_COLOR[lead.status],
            )}
          >
            {Object.values(LeadStatus).map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button
            onClick={() => setEditingNotes(v => !v)}
            title="Edit notes"
            className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsModal({ open, onClose, campaignKolId, kolName }: Props) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', campaignKolId],
    queryFn: () => leadsApi.getByKol(campaignKolId),
    enabled: open,
  });

  // Count by status
  const counts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1;
    return acc;
  }, {} as Partial<Record<LeadStatus, number>>);

  return (
    <Modal open={open} onClose={onClose} title={`Leads — ${kolName}`} size="lg">
      {/* Summary funnel */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Leads', value: leads.length, color: 'text-gray-900' },
          { label: 'Test Drives', value: (counts[LeadStatus.TEST_DRIVE_BOOKED] ?? 0) + (counts[LeadStatus.TEST_DRIVE_COMPLETED] ?? 0), color: 'text-purple-600' },
          { label: 'Converted', value: counts[LeadStatus.CONVERTED] ?? 0, color: 'text-green-600' },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center">
            <p className={clsx('text-2xl font-bold', item.color)}>{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Lead list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-gray-500">No leads yet</p>
            <p className="text-xs text-gray-400 mt-1">Leads will appear here when visitors use the tracking link</p>
          </div>
        ) : (
          leads.map(lead => <LeadRow key={lead.id} lead={lead} />)
        )}
      </div>
    </Modal>
  );
}
