import apiClient from './client';
import type { LoginPayload, LoginResponse } from '@/types';

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data),

  getProfile: () =>
    apiClient.get('/auth/profile').then((r) => r.data),
};
