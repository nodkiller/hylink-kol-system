import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F9F9F9]">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Content column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
