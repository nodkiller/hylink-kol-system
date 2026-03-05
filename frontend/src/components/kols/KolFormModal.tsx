import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { kolsApi } from '@/api/kols.api';
import { KolTier, PlatformName, type Kol } from '@/types';
import clsx from 'clsx';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const platformSchema = z.object({
  platformName: z.nativeEnum(PlatformName),
  handle: z.string().min(1, 'Handle is required'),
  profileUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  followersCount: z.coerce.number().int().min(0).optional().or(z.literal('')),
  avgEngagementRate: z.coerce.number().min(0).max(1).optional().or(z.literal('')),
});

const kolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nickname: z.string().optional(),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  ethnicityBackground: z.string().optional(),
  primaryLanguage: z.string().optional(),
  contentTagsInput: z.string().optional(), // comma-separated, parsed before submit
  kolTier: z.nativeEnum(KolTier).optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  talentAgencyName: z.string().optional(),
  talentAgencyContact: z.string().optional(),
  agencyInternalNotes: z.string().optional(),
  collaborationRating: z.coerce.number().min(0).max(5).optional().or(z.literal('')),
  isBlacklisted: z.boolean().optional(),
  platforms: z.array(platformSchema).optional(),
});

type FormValues = z.infer<typeof kolSchema>;

// ─── Tab system ───────────────────────────────────────────────────────────────

const TABS = ['Basic Info', 'Platforms', 'Notes & Rating'] as const;
type Tab = (typeof TABS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fieldError(msg?: string) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500">{msg}</p>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="label">{children}</label>;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  kol?: Kol | null;
}

export default function KolFormModal({ open, onClose, kol }: Props) {
  const isEdit = Boolean(kol);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Basic Info');
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(kolSchema),
    defaultValues: { platforms: [], isBlacklisted: false },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'platforms' });

  // Pre-populate form when editing
  useEffect(() => {
    if (open) {
      setActiveTab('Basic Info');
      setServerError('');
      if (kol) {
        reset({
          name: kol.name,
          nickname: kol.nickname ?? '',
          avatarUrl: kol.avatarUrl ?? '',
          country: kol.country ?? 'Australia',
          city: kol.city ?? '',
          ethnicityBackground: kol.ethnicityBackground ?? '',
          primaryLanguage: kol.primaryLanguage ?? '',
          contentTagsInput: kol.contentTags?.join(', ') ?? '',
          kolTier: kol.kolTier ?? '',
          contactEmail: kol.contactEmail ?? '',
          talentAgencyName: kol.talentAgencyName ?? '',
          talentAgencyContact: kol.talentAgencyContact ?? '',
          agencyInternalNotes: kol.agencyInternalNotes ?? '',
          collaborationRating: kol.collaborationRating ?? '',
          isBlacklisted: kol.isBlacklisted ?? false,
          platforms: kol.platforms?.map((p) => ({
            platformName: p.platformName,
            handle: p.handle,
            profileUrl: p.profileUrl ?? '',
            followersCount: p.followersCount ?? '',
            avgEngagementRate: p.avgEngagementRate ?? '',
          })) ?? [],
        });
      } else {
        reset({ platforms: [], isBlacklisted: false, country: 'Australia' });
      }
    }
  }, [open, kol, reset]);

  const createMutation = useMutation({
    mutationFn: kolsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kols'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'An error occurred'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof kolsApi.update>[1] }) =>
      kolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kols'] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : (msg ?? 'An error occurred'));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: FormValues) => {
    setServerError('');
    const contentTags = values.contentTagsInput
      ? values.contentTagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = {
      name: values.name,
      nickname: values.nickname || undefined,
      avatarUrl: values.avatarUrl || undefined,
      country: values.country || undefined,
      city: values.city || undefined,
      ethnicityBackground: values.ethnicityBackground || undefined,
      primaryLanguage: values.primaryLanguage || undefined,
      contentTags,
      kolTier: values.kolTier || undefined,
      contactEmail: values.contactEmail || undefined,
      talentAgencyName: values.talentAgencyName || undefined,
      talentAgencyContact: values.talentAgencyContact || undefined,
      agencyInternalNotes: values.agencyInternalNotes || undefined,
      collaborationRating: values.collaborationRating !== '' ? Number(values.collaborationRating) : undefined,
      isBlacklisted: values.isBlacklisted,
      platforms: values.platforms?.map((p) => ({
        ...p,
        followersCount: p.followersCount !== '' ? Number(p.followersCount) : undefined,
        avgEngagementRate: p.avgEngagementRate !== '' ? Number(p.avgEngagementRate) : undefined,
        profileUrl: p.profileUrl || undefined,
      })),
    };

    if (isEdit && kol) {
      updateMutation.mutate({ id: kol.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="kol-form" className="btn-primary" disabled={isPending}>
        {isPending && <Spinner className="h-4 w-4" />}
        {isEdit ? 'Save changes' : 'Create KOL'}
      </button>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${kol?.name}` : 'Add New KOL'}
      size="2xl"
      footer={footer}
    >
      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-gray-200 -mx-6 px-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form id="kol-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ── Tab 1: Basic Info ──────────────────────────────────── */}
        {activeTab === 'Basic Info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <input {...register('name')} className="input mt-1" placeholder="Jane Smith" />
                {fieldError(errors.name?.message)}
              </div>
              <div>
                <Label>Nickname / Handle</Label>
                <input {...register('nickname')} className="input mt-1" placeholder="janesmith_au" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <input {...register('city')} className="input mt-1" placeholder="Sydney" />
              </div>
              <div>
                <Label>Country</Label>
                <input {...register('country')} className="input mt-1" placeholder="Australia" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Primary Language</Label>
                <input {...register('primaryLanguage')} className="input mt-1" placeholder="English" />
              </div>
              <div>
                <Label>Ethnicity / Background</Label>
                <input {...register('ethnicityBackground')} className="input mt-1" placeholder="Chinese-Australian" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>KOL Tier</Label>
                <select {...register('kolTier')} className="input mt-1">
                  <option value="">Select tier</option>
                  {Object.values(KolTier).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Contact Email</Label>
                <input {...register('contactEmail')} type="email" className="input mt-1" placeholder="jane@email.com" />
                {fieldError(errors.contactEmail?.message)}
              </div>
            </div>

            <div>
              <Label>Content Tags <span className="text-xs font-normal text-gray-400">(comma-separated)</span></Label>
              <input
                {...register('contentTagsInput')}
                className="input mt-1"
                placeholder="Automotive, Lifestyle, Beauty"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Talent Agency</Label>
                <input {...register('talentAgencyName')} className="input mt-1" placeholder="Agency name" />
              </div>
              <div>
                <Label>Agency Contact</Label>
                <input {...register('talentAgencyContact')} className="input mt-1" placeholder="Contact info" />
              </div>
            </div>

            <div>
              <Label>Avatar URL</Label>
              <input {...register('avatarUrl')} className="input mt-1" placeholder="https://…" />
              {fieldError(errors.avatarUrl?.message)}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Controller
                control={control}
                name="isBlacklisted"
                render={({ field }) => (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={field.value}
                    onClick={() => field.onChange(!field.value)}
                    className={clsx(
                      'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                      field.value ? 'bg-red-500' : 'bg-gray-200',
                    )}
                  >
                    <span className={clsx(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
                      field.value ? 'translate-x-4' : 'translate-x-0',
                    )} />
                  </button>
                )}
              />
              <span className="text-sm text-gray-700">Mark as Blacklisted</span>
            </div>
          </div>
        )}

        {/* ── Tab 2: Platforms ───────────────────────────────────── */}
        {activeTab === 'Platforms' && (
          <div className="space-y-4">
            {fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                No platforms added yet. Click below to add one.
              </p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="relative rounded-xl border border-gray-200 bg-gray-50 p-4">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Platform *</Label>
                    <select
                      {...register(`platforms.${index}.platformName`)}
                      className="input mt-1"
                    >
                      <option value="">Select platform</option>
                      {Object.values(PlatformName).map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    {fieldError(errors.platforms?.[index]?.platformName?.message)}
                  </div>
                  <div>
                    <Label>Handle *</Label>
                    <input
                      {...register(`platforms.${index}.handle`)}
                      className="input mt-1"
                      placeholder="@username"
                    />
                    {fieldError(errors.platforms?.[index]?.handle?.message)}
                  </div>
                  <div>
                    <Label>Followers Count</Label>
                    <input
                      type="number"
                      {...register(`platforms.${index}.followersCount`)}
                      className="input mt-1"
                      placeholder="e.g. 85000"
                    />
                  </div>
                  <div>
                    <Label>Avg Engagement Rate <span className="text-xs text-gray-400">(decimal: 0.035 = 3.5%)</span></Label>
                    <input
                      type="number"
                      step="0.0001"
                      {...register(`platforms.${index}.avgEngagementRate`)}
                      className="input mt-1"
                      placeholder="e.g. 0.0356"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Profile URL</Label>
                    <input
                      {...register(`platforms.${index}.profileUrl`)}
                      className="input mt-1"
                      placeholder="https://www.instagram.com/username"
                    />
                    {fieldError(errors.platforms?.[index]?.profileUrl?.message)}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => append({ platformName: PlatformName.INSTAGRAM, handle: '', profileUrl: '', followersCount: '', avgEngagementRate: '' })}
              className="btn-secondary w-full gap-2"
              disabled={fields.length >= Object.values(PlatformName).length}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Platform Account
            </button>
          </div>
        )}

        {/* ── Tab 3: Notes & Rating ──────────────────────────────── */}
        {activeTab === 'Notes & Rating' && (
          <div className="space-y-4">
            <div>
              <Label>Collaboration Rating <span className="text-xs font-normal text-gray-400">(0.0 – 5.0)</span></Label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.1}
                {...register('collaborationRating')}
                className="input mt-1 w-32"
                placeholder="e.g. 4.5"
              />
              {fieldError(errors.collaborationRating?.message)}
            </div>

            <div>
              <Label>
                Internal Notes
                <span className="ml-1 text-xs font-normal text-gray-400">(not visible to clients)</span>
              </Label>
              <textarea
                {...register('agencyInternalNotes')}
                rows={5}
                className="input mt-1 resize-none"
                placeholder="Negotiation history, content quality notes, preferred contact method…"
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
