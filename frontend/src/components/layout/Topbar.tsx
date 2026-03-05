import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.ACCOUNT_MANAGER]: 'Account Manager',
  [UserRole.KOL_MANAGER]: 'KOL Manager',
};

const ROLE_COLOR: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-red-900/50 text-red-300 ring-red-700/40',
  [UserRole.ACCOUNT_MANAGER]: 'bg-blue-900/50 text-blue-300 ring-blue-700/40',
  [UserRole.KOL_MANAGER]: 'bg-green-900/50 text-green-300 ring-green-700/40',
};

export default function Topbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Left — breadcrumb placeholder for future use */}
      <div />

      {/* Right — user info + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user.fullName}</p>
              <span
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_COLOR[user.role]}`}
              >
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Sign out"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
