import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import { CampaignStatus } from '@/types';

interface FormValues {
  name: string;
  clientName: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  briefDocumentUrl: string;
  budget: string;
  clientBilling: string;
  otherExpenses: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
}

export default function CampaignFormModal({ open, onClose, campaign }: Props) {
  const isEdit = Boolean(campaign);
  const qc = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    if (open) {
      setServerError('');
      reset(campaign
        ? {
            name: campaign.name,
            clientName: campaign.clientName,
            status: campaign.status as CampaignStatus,
            startDate: campaign.startDate ?? '',
            endDate: campaign.endDate ?? '',
            briefDocumentUrl: campaign.briefDocumentUrl ?? '',
            budget: campaign.budget != null ? String(campaign.budget) : '',
            clientBilling: campaign.clientBilling != null ? String(campaign.clientBilling) : '',
            otherExpenses: campaign.otherExpenses != null ? String(campaign.otherExpenses) : '',
          }
        : { status: CampaignStatus.DRAFT, startDate: '', endDate: '', briefDocumentUrl: '', budget: '', clientBilling: '', otherExpenses: '' }
      );
    }
  }, [open, campaign, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        briefDocumentUrl: values.briefDocumentUrl || undefined,
        budget: values.budget ? Number(values.budget) : undefined,
        clientBilling: values.clientBilling ? Number(values.clientBilling) : undefined,
        otherExpenses: values.otherExpenses ? Number(values.otherExpenses) : undefined,
      };
      return isEdit && campaign
        ? campaignsApi.update(campaign.id, payload)
        : campaignsApi.create(payload as Parameters<typeof campaignsApi.create>[0]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      if (isEdit && campaign) qc.invalidateQueries({ queryKey: ['campaign', campaign.id] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'An error occurred'));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${campaign?.name}` : 'New Campaign'}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>Cancel</button>
          <button form="campaign-form" type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending && <Spinner className="h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create Campaign'}
          </button>
        </>
      }
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{serverError}</div>
      )}
      <form id="campaign-form" onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Campaign Name *</label>
            <input {...register('name', { required: 'Required' })} className="input mt-1" placeholder="Q2 Toyota Launch" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div className="col-span-2">
            <label className="label">Client Name *</label>
            <input {...register('clientName', { required: 'Required' })} className="input mt-1" placeholder="Toyota Australia" />
            {errors.clientName && <p className="mt-1 text-xs text-red-500">{errors.clientName.message}</p>}
          </div>
          <div>
            <label className="label">Status</label>
            <select {...register('status')} className="input mt-1">
              {Object.values(CampaignStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div />
          <div>
            <label className="label">Start Date</label>
            <input type="date" {...register('startDate')} className="input mt-1" />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" {...register('endDate')} className="input mt-1" />
          </div>
          <div className="col-span-2">
            <label className="label">Brief Document URL</label>
            <input {...register('briefDocumentUrl')} className="input mt-1" placeholder="https://drive.google.com/…" />
          </div>
        </div>

        {/* Financial section */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials (AUD)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Client Budget</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min={0} step={100}
                  {...register('budget')}
                  className="input pl-7"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="label">Client Billing</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min={0} step={100}
                  {...register('clientBilling')}
                  className="input pl-7"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="label">Other Expenses</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min={0} step={100}
                  {...register('otherExpenses')}
                  className="input pl-7"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            Client Billing = your revenue. KOL fees are tracked per KOL record.
          </p>
        </div>
      </form>
    </Modal>
  );
}
