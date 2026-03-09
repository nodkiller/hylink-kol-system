import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type OnChangeFn,
} from '@tanstack/react-table';
import clsx from 'clsx';
import { TierBadge, PlatformBadge, BlacklistedBadge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import type { Kol } from '@/types';

interface Props {
  data: Kol[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onPageChange: (p: number) => void;
  onView: (kol: Kol) => void;
  onEdit: (kol: Kol) => void;
  onRowClick?: (kol: Kol) => void;
}

const helper = createColumnHelper<Kol>();

function formatFollowers(n?: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatEngagement(n?: number) {
  if (!n) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

function StarRating({ value }: { value?: number }) {
  if (!value) return <span className="text-gray-300 text-sm">—</span>;
  const v = Number(value);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={clsx('h-3.5 w-3.5', star <= Math.round(v) ? 'text-yellow-400' : 'text-gray-200')}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-400">{v.toFixed(1)}</span>
    </div>
  );
}

export default function KolTable({
  data, total, page, limit, isLoading,
  sorting, onSortingChange, onPageChange, onView, onEdit, onRowClick,
}: Props) {
  const columns = [
    helper.accessor('name', {
      header: 'KOL',
      enableSorting: true,
      cell: ({ row }) => {
        const kol = row.original;
        return (
          <div className="flex items-center gap-3 min-w-[160px]">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 text-sm font-bold border border-primary-100">
              {kol.avatarUrl
                ? <img src={kol.avatarUrl} alt={kol.name} className="h-9 w-9 rounded-full object-cover" />
                : kol.name.charAt(0).toUpperCase()
              }
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-900 text-sm">{kol.name}</span>
                {kol.isBlacklisted && <BlacklistedBadge />}
              </div>
              {kol.nickname && (
                <p className="text-xs text-gray-400">@{kol.nickname}</p>
              )}
            </div>
          </div>
        );
      },
    }),

    helper.accessor('kolTier', {
      header: 'Tier',
      enableSorting: false,
      cell: ({ getValue }) => <TierBadge tier={getValue()} />,
    }),

    helper.display({
      id: 'platforms',
      header: 'Top Platform',
      cell: ({ row }) => {
        const platforms = row.original.platforms ?? [];
        if (!platforms.length) return <span className="text-gray-300 text-sm">—</span>;
        const top = [...platforms].sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))[0];
        return (
          <div className="flex flex-col gap-1">
            <PlatformBadge platform={top.platformName} />
            <div className="text-xs text-gray-400 space-x-1">
              <span>{formatFollowers(top.followersCount)}</span>
              <span>·</span>
              <span>{formatEngagement(top.avgEngagementRate)}</span>
            </div>
          </div>
        );
      },
    }),

    helper.accessor('city', {
      header: 'Location',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="text-gray-700">{row.original.city ?? '—'}</p>
          <p className="text-xs text-gray-400">{row.original.country}</p>
        </div>
      ),
    }),

    helper.accessor('contentTags', {
      header: 'Tags',
      enableSorting: false,
      cell: ({ getValue }) => {
        const tags = getValue() ?? [];
        if (!tags.length) return <span className="text-gray-300 text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                +{tags.length - 3}
              </span>
            )}
          </div>
        );
      },
    }),

    helper.accessor('collaborationRating', {
      header: 'Rating',
      enableSorting: true,
      cell: ({ getValue }) => <StarRating value={getValue()} />,
    }),

    helper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(row.original)}
            title="View details"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={() => onEdit(row.original)}
            title="Edit KOL"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.ceil(total / limit),
    state: { sorting },
    onSortingChange,
  });

  return (
    <div className="card overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-xl">
          <PageSpinner />
        </div>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-gray-100 bg-gray-50">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={clsx(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-600',
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-gray-300">
                          {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-50">
            {isLoading && !data.length ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : !data.length ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto mb-2 h-8 w-8 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                    </svg>
                    <p className="text-sm">No KOLs found</p>
                    <p className="text-xs text-gray-300">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={clsx(
                    'transition-colors hover:bg-gray-50',
                    onRowClick && 'cursor-pointer',
                    row.original.isBlacklisted && 'opacity-60',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-4">
        <Pagination
          page={page}
          totalPages={Math.ceil(total / limit)}
          total={total}
          limit={limit}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
