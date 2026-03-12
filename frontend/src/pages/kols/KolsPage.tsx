import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SortingState, Updater } from '@tanstack/react-table';
import { kolsApi } from '@/api/kols.api';
import KolFilterPanel from '@/components/kols/KolFilterPanel';
import KolTable from '@/components/kols/KolTable';
import KolFormModal from '@/components/kols/KolFormModal';
import KolViewDrawer from '@/components/kols/KolViewDrawer';
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
  const [viewingKol, setViewingKol] = useState<Kol | null>(null);

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
    setViewingKol(null); // close drawer if open
    setEditingKol(kol);
    setModalOpen(true);
  };

  const kolList = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">KOL Database</h1>
          {meta.total > 0 && (
            <span className="flex items-center justify-center rounded-full bg-primary-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              {meta.total.toLocaleString()}
            </span>
          )}
          {isFetching && !isLoading && (
            <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
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

      {/* KOL list */}
      <div className="relative">
        <KolTable
          data={kolList}
          total={meta.total}
          page={meta.page}
          limit={meta.limit}
          isLoading={isLoading}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onView={setViewingKol}
          onEdit={handleOpenEdit}
          onRowClick={setViewingKol}
        />
      </div>

      {/* KOL detail drawer */}
      <KolViewDrawer
        kol={viewingKol}
        onClose={() => setViewingKol(null)}
        onEdit={handleOpenEdit}
      />

      {/* Add / Edit modal */}
      <KolFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kol={editingKol}
      />
    </div>
  );
}
