import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SortingState, Updater } from '@tanstack/react-table';
import { kolsApi } from '@/api/kols.api';
import KolFilterPanel from '@/components/kols/KolFilterPanel';
import KolTable from '@/components/kols/KolTable';
import KolFormModal from '@/components/kols/KolFormModal';
import type { Kol, KolQueryParams } from '@/types';

const DEFAULT_FILTERS: KolQueryParams = {
  search: '',
  platform: '',
  minFollowers: '',
  maxFollowers: '',
  minEngagement: '',
  maxEngagement: '',
  city: '',
  language: '',
  tags: '',
  tier: '',
  isBlacklisted: '',
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  order: 'DESC',
};

// Debounce search input to avoid spamming the API
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function KolsPage() {
  const [filters, setFilters] = useState<KolQueryParams>(DEFAULT_FILTERS);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKol, setEditingKol] = useState<Kol | null>(null);

  // Debounce text fields (search, city, language, tags) to avoid excess requests
  const debouncedFilters = useDebounce(filters, 400);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['kols', debouncedFilters],
    queryFn: () => kolsApi.list(debouncedFilters),
    placeholderData: (prev) => prev, // Keep stale data while fetching
  });

  // Sync table sorting → query params
  const handleSortingChange = useCallback((updater: Updater<SortingState>) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(newSorting);
    if (newSorting.length > 0) {
      setFilters((f) => ({
        ...f,
        sortBy: newSorting[0].id,
        order: newSorting[0].desc ? 'DESC' : 'ASC',
        page: 1,
      }));
    } else {
      setFilters((f) => ({ ...f, sortBy: 'created_at', order: 'DESC', page: 1 }));
    }
  }, [sorting]);

  const handleOpenCreate = () => {
    setEditingKol(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (kol: Kol) => {
    setEditingKol(kol);
    setModalOpen(true);
  };

  const handleView = (kol: Kol) => {
    // TODO: navigate to detail page in a future sprint
    console.info('View KOL:', kol.id);
  };

  const kolList = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  return (
    <div className="space-y-1">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KOL Database</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {meta.total > 0 ? `${meta.total} KOL${meta.total !== 1 ? 's' : ''} in total` : 'Manage and filter your KOL network'}
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn-primary gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add KOL
        </button>
      </div>

      {/* Filter panel */}
      <KolFilterPanel
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* KOL table */}
      <div className="relative">
        {/* Subtle refetch indicator */}
        {isFetching && !isLoading && (
          <div className="absolute -top-8 right-0 flex items-center gap-1.5 text-xs text-gray-400">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Updating…
          </div>
        )}

        <KolTable
          data={kolList}
          total={meta.total}
          page={meta.page}
          limit={meta.limit}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onView={handleView}
          onEdit={handleOpenEdit}
        />
      </div>

      {/* Add / Edit modal */}
      <KolFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kol={editingKol}
      />
    </div>
  );
}
