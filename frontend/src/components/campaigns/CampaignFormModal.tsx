import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import { CampaignStatus } from '@/types';
import clsx from 'clsx';

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

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Dates & Budget', 'Confirm'];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
            i < current
              ? 'bg-primary-600 text-white'
              : i === current
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
                : 'bg-gray-100 text-gray-400',
          )}>
            {i < current ? (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              i + 1
            )}
          </div>
          <span className={clsx(
            'text-xs font-medium hidden sm:block',
            i === current ? 'text-gray-900' : 'text-gray-400',
          )}>
            {STEPS[i]}
          </span>
          {i < total - 1 && (
            <div className={clsx(
              'h-px w-6 sm:w-10 transition-colors',
              i < current ? 'bg-primary-600' : 'bg-gray-200',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Basic Info ───────────────────────────────────────────────────────

function Step1({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<FormValues>>['register'];
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Campaign Name *</label>
        <input
          {...register('name', { required: 'Campaign name is required' })}
          className="input mt-1"
          placeholder="Q2 Brand Launch 2025"
          autoFocus
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="label">Client Name *</label>
        <input
          {...register('clientName', { required: 'Client name is required' })}
          className="input mt-1"
          placeholder="Acme Corporation"
        />
        {errors.clientName && <p className="mt-1 text-xs text-red-500">{errors.clientName.message}</p>}
      </div>

      <div>
        <label className="label">Status</label>
        <select {...register('status')} className="input mt-1">
          {Object.values(CampaignStatus).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ─── Step 2: Dates & Budget ───────────────────────────────────────────────────

function Step2({
  register,
}: {
  register: ReturnType<typeof useForm<FormValues>>['register'];
}) {
  return (
    <div className="space-y-4">
      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Start Date</label>
          <input type="date" {...register('startDate')} className="input mt-1" />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" {...register('endDate')} className="input mt-1" />
        </div>
      </div>

      {/* Brief URL */}
      <div>
        <label className="label">Brief Document URL</label>
        <input
          {...register('briefDocumentUrl')}
          className="input mt-1"
          placeholder="https://drive.google.com/…"
        />
      </div>

      {/* Financials */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financials (AUD)</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'budget' as const, label: 'Client Budget' },
            { name: 'clientBilling' as const, label: 'Client Billing' },
            { name: 'otherExpenses' as const, label: 'Other Expenses' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="label">{label}</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number" min={0} step={100}
                  {...register(name)}
                  className="input pl-7"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          Client Billing = your revenue. KOL fees are tracked per KOL record.
        </p>
      </div>
    </div>
  );
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

function Step3({ values }: { values: FormValues }) {
  const fields = [
    { label: 'Campaign Name', value: values.name },
    { label: 'Client', value: values.clientName },
    { label: 'Status', value: values.status },
    { label: 'Start Date', value: values.startDate || '—' },
    { label: 'End Date', value: values.endDate || '—' },
    { label: 'Brief URL', value: values.briefDocumentUrl || '—' },
    { label: 'Budget', value: values.budget ? `AUD $${Number(values.budget).toLocaleString()}` : '—' },
    { label: 'Client Billing', value: values.clientBilling ? `AUD $${Number(values.clientBilling).toLocaleString()}` : '—' },
    { label: 'Other Expenses', value: values.otherExpenses ? `AUD $${Number(values.otherExpenses).toLocaleString()}` : '—' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">Please review the campaign details before creating.</p>
      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between px-4 py-3 text-sm">
            <span className="text-gray-400 font-medium w-32 flex-shrink-0">{label}</span>
            <span className="text-gray-900 text-right flex-1 break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function CampaignFormModal({ open, onClose, campaign }: Props) {
  const isEdit = Boolean(campaign);
  const qc = useQueryClient();
  const [serverError, setServerError] = useState('');
  // In edit mode, skip the wizard and show all fields at once
  const [step, setStep] = useState(0);

  const { register, handleSubmit, reset, watch, trigger, formState: { errors } } = useForm<FormValues>();
  const watchedValues = watch();

  useEffect(() => {
    if (open) {
      setServerError('');
      setStep(0);
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

  const handleNext = async () => {
    // Validate current step fields
    const step1Fields: (keyof FormValues)[] = ['name', 'clientName', 'status'];
    const valid = await trigger(step === 0 ? step1Fields : undefined);
    if (valid) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  // Edit mode: show all in one step
  if (isEdit) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={`Edit — ${campaign?.name}`}
        size="lg"
        footer={
          <>
            <button onClick={onClose} className="btn-secondary" disabled={mutation.isPending}>Cancel</button>
            <button form="campaign-form" type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Spinner className="h-4 w-4" />}
              Save changes
            </button>
          </>
        }
      >
        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{serverError}</div>
        )}
        <form id="campaign-form" onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4" noValidate>
          <Step1 register={register} errors={errors} />
          <Step2 register={register} />
        </form>
      </Modal>
    );
  }

  // Create mode: wizard
  const totalSteps = STEPS.length;
  const isLastStep = step === totalSteps - 1;

  const footer = (
    <div className="flex items-center justify-between w-full">
      <button
        type="button"
        onClick={step === 0 ? onClose : handleBack}
        className="btn-secondary"
        disabled={mutation.isPending}
      >
        {step === 0 ? 'Cancel' : '← Back'}
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={() => handleSubmit(v => mutation.mutate(v))()}
          className="btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Spinner className="h-4 w-4" />}
          Create Campaign
        </button>
      ) : (
        <button
          type="button"
          onClick={handleNext}
          className="btn-primary"
        >
          Next →
        </button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Campaign"
      size="lg"
      footer={footer}
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{serverError}</div>
      )}

      <StepIndicator current={step} total={totalSteps} />

      <form noValidate>
        {step === 0 && <Step1 register={register} errors={errors} />}
        {step === 1 && <Step2 register={register} />}
        {step === 2 && <Step3 values={watchedValues as FormValues} />}
      </form>
    </Modal>
  );
}
