import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import KolsPage from '@/pages/kols/KolsPage';
import CampaignsPage from '@/pages/campaigns/CampaignsPage';
import CampaignDetailPage from '@/pages/campaigns/CampaignDetailPage';
import PortalPage from '@/pages/portal/PortalPage';
import InfluencerSearchPage from '@/pages/influencer-search/InfluencerSearchPage';
import ROIPage from '@/pages/ROIPage';
import KolDetailPage from '@/pages/kols/KolDetailPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import PaymentsPage from '@/pages/payments/PaymentsPage';
import CalendarPage from '@/pages/calendar/CalendarPage';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="kols" element={<KolsPage />} />
          <Route path="kols/:id" element={<KolDetailPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="campaigns/:id" element={<CampaignDetailPage />} />
          <Route path="influencer-search" element={<InfluencerSearchPage />} />
          <Route path="roi" element={<ROIPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
