import apiClient from './client';
import type {
  Kol,
  KolQueryParams,
  CreateKolPayload,
  UpdateKolPayload,
  PaginatedResponse,
} from '@/types';

// Remove empty/undefined params before sending the request
function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== '' && v !== null,
    ),
  );
}

export const kolsApi = {
  list: (params: KolQueryParams) =>
    apiClient
      .get<PaginatedResponse<Kol>>('/kols', { params: cleanParams(params as Record<string, unknown>) })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Kol>(`/kols/${id}`).then((r) => r.data),

  create: (payload: CreateKolPayload) =>
    apiClient.post<Kol>('/kols', payload).then((r) => r.data),

  update: (id: string, payload: UpdateKolPayload) =>
    apiClient.patch<Kol>(`/kols/${id}`, payload).then((r) => r.data),
};
