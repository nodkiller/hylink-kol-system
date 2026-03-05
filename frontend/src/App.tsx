import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import KolsPage from '@/pages/kols/KolsPage';
import CampaignsPage from '@/pages/campaigns/CampaignsPage';
import CampaignDetailPage from '@/pages/campaigns/CampaignDetailPage';
import PortalPage from '@/pages/portal/PortalPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/kols" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — login */}
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />

        {/* Public — client portal (no admin layout, no auth required) */}
        <Route path="/portal/campaign/:id" element={<PortalPage />} />

        {/* Protected — inside admin layout */}
        <Route path="/" element={<RequireAuth><AdminLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/kols" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="kols" element={<KolsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
