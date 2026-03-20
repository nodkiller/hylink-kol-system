import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { campaignsApi, type Campaign } from '@/api/campaigns.api';
import { Spinner } from '@/components/ui/Spinner';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const PALETTE = [
  'bg-indigo-500','bg-violet-500','bg-pink-500','bg-emerald-500',
  'bg-amber-500','bg-sky-500','bg-orange-500','bg-teal-500',
  'bg-rose-500','bg-cyan-500',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthGrid(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Monday-based week; convert Sun=0 → offset
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  for (let i = startDow; i > 0; i--) days.push(new Date(year, month, 1 - i));

  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));

  const rem = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= rem; i++) days.push(new Date(year, month + 1, i));

  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const campaigns = (data?.data ?? []) as Campaign[];

  // Assign a stable color to each campaign by index
  const colorMap = new Map(campaigns.map((c, i) => [c.id, PALETTE[i % PALETTE.length]]));

  const datedCampaigns = campaigns.filter((c) => c.startDate);

  const grid = getMonthGrid(viewYear, viewMonth);

  function campaignsOnDay(day: Date): Campaign[] {
    const ds = toDateStr(day);
    return datedCampaigns.filter((c) => {
      const start = c.startDate!.slice(0, 10);
      const end = c.endDate ? c.endDate.slice(0, 10) : start;
      return ds >= start && ds <= end;
    });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Content Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500">Campaign timelines at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[164px] text-center text-base font-semibold text-gray-900">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
            className="btn-secondary text-xs"
          >
            Today
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-6 w-6 text-primary-500" />
        </div>
      ) : (
        <>
          {/* Campaign legend */}
          {datedCampaigns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {datedCampaigns.slice(0, 12).map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className={clsx('h-2 w-2 rounded-full flex-shrink-0', colorMap.get(c.id))} />
                  {c.name}
                </button>
              ))}
              {datedCampaigns.length > 12 && (
                <span className="flex items-center px-3 py-1 text-xs text-gray-400">
                  +{datedCampaigns.length - 12} more campaigns
                </span>
              )}
            </div>
          )}

          {/* Calendar grid */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {grid.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === viewMonth;
                const isToday = isSameDay(day, today);
                const dayCampaigns = campaignsOnDay(day);

                return (
                  <div
                    key={idx}
                    className={clsx(
                      'min-h-[96px] p-1.5',
                      !isCurrentMonth && 'bg-gray-50/60',
                    )}
                  >
                    {/* Date number */}
                    <div className={clsx(
                      'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium select-none',
                      isToday
                        ? 'bg-primary-600 text-white'
                        : isCurrentMonth
                          ? 'text-gray-700'
                          : 'text-gray-300',
                    )}>
                      {day.getDate()}
                    </div>

                    {/* Campaign bars */}
                    <div className="space-y-0.5">
                      {dayCampaigns.slice(0, 3).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/campaigns/${c.id}`)}
                          title={c.name}
                          className={clsx(
                            'w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium text-white transition-opacity hover:opacity-75',
                            colorMap.get(c.id),
                          )}
                        >
                          {c.name}
                        </button>
                      ))}
                      {dayCampaigns.length > 3 && (
                        <p className="px-1 text-[10px] text-gray-400">+{dayCampaigns.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {datedCampaigns.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No campaigns have scheduled dates yet. Add start/end dates to campaigns to see them on the calendar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
