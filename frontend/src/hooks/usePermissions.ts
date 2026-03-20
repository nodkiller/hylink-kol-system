import { useAuthStore } from '@/stores/auth.store';

const ADMIN = 'Admin';
const ACCOUNT_MANAGER = 'AccountManager';

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);

  return {
    isAdmin: role === ADMIN,
    canAccessSettings: role === ADMIN,
    canManageFinances: role === ADMIN || role === ACCOUNT_MANAGER,
    canMarkPaid: role === ADMIN || role === ACCOUNT_MANAGER,
    canEditCampaign: role === ADMIN || role === ACCOUNT_MANAGER,
    canApproveContent: role === ADMIN || role === ACCOUNT_MANAGER,
  };
}
