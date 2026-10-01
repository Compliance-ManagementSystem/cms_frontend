import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const openMobileSidebar = () => setMobileOpen(true);
  const closeMobileSidebar = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* ── Mobile Backdrop Overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div
        className={[
          'flex flex-col min-h-screen transition-all duration-250 ease-in-out',
          'ml-0',
          sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64',
        ].join(' ')}
      >
        {/* Navbar */}
        <Navbar
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileSidebar={openMobileSidebar}
        />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 mt-16 p-4 sm:p-6 page-enter min-w-0 overflow-x-hidden"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
