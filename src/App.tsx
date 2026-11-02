import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  Link2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type {
  CalendarEvent,
  PlatformId,
  RevenueEntry,
  WorkspaceState,
} from './types';
import { DashboardView } from './views/DashboardView';
import { AccountsView } from './views/AccountsView';
import { GrowthView } from './views/GrowthView';
import { CalendarView } from './views/CalendarView';
import { RevenueView } from './views/RevenueView';

type ActiveSection = 'dashboard' | 'accounts' | 'growth' | 'calendar' | 'revenue';

const NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  mobileLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Panel Principal', mobileLabel: 'Panel', icon: LayoutDashboard },
  { id: 'accounts', label: 'Cuentas', mobileLabel: 'Cuentas', icon: Link2 },
  { id: 'growth', label: 'Crecimiento', mobileLabel: 'Análisis', icon: BarChart3 },
  { id: 'calendar', label: 'Calendario', mobileLabel: 'Agenda', icon: CalendarDays },
  { id: 'revenue', label: 'Ingresos', mobileLabel: 'Ingresos', icon: DollarSign },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveSection>('dashboard');
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  const fetchWorkspace = useCallback(async () => {
    try {
      setError(null);
      const resp = await fetch('/api/state');
      if (!resp.ok) throw new Error('No se pudo cargar el estado de CreatorPulse.');
      const data = (await resp.json()) as WorkspaceState;
      setWorkspace(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red inesperado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Account Handlers
  const handleConnectOrUpdate = async (
    platform: PlatformId,
    payload: Record<string, unknown>
  ): Promise<{ diagnosticMessage?: string }> => {
    const resp = await fetch(`/api/accounts/${platform}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json()) as { diagnosticMessage?: string };
    await fetchWorkspace();
    return data;
  };

  const handleSyncAccount = async (
    platform: PlatformId
  ): Promise<{ diagnosticMessage?: string }> => {
    const resp = await fetch(`/api/accounts/${platform}/sync`, { method: 'POST' });
    const data = (await resp.json()) as { diagnosticMessage?: string };
    await fetchWorkspace();
    return data;
  };

  const handleDisconnectAccount = async (platform: PlatformId) => {
    await fetch(`/api/accounts/${platform}/disconnect`, { method: 'POST' });
    await fetchWorkspace();
  };

  // Goal Handlers
  const handleCreateGoal = async (goal: {
    platform: PlatformId | 'all';
    title: string;
    targetFollowers: number;
    deadline: string;
  }) => {
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goal),
    });
    await fetchWorkspace();
  };

  const handleUpdateGoal = async (
    id: string,
    updates: Partial<{
      platform: PlatformId | 'all';
      title: string;
      targetFollowers: number;
      deadline: string;
    }>
  ) => {
    await fetch(`/api/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await fetchWorkspace();
  };

  const handleDeleteGoal = async (id: string) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    await fetchWorkspace();
  };

  // Calendar Handlers
  const handleCreateEvent = async (
    evt: Omit<CalendarEvent, 'id' | 'requiresManualPublish' | 'manualPublishReason'>
  ) => {
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evt),
    });
    await fetchWorkspace();
  };

  const handleUpdateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    await fetch(`/api/calendar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await fetchWorkspace();
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
    await fetchWorkspace();
  };

  // Revenue Handlers
  const handleCreateRevenue = async (entry: Omit<RevenueEntry, 'id' | 'month'>) => {
    await fetch('/api/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    await fetchWorkspace();
  };

  const handleUpdateRevenue = async (id: string, updates: Partial<RevenueEntry>) => {
    await fetch(`/api/revenue/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await fetchWorkspace();
  };

  const handleDeleteRevenue = async (id: string) => {
    await fetch(`/api/revenue/${id}`, { method: 'DELETE' });
    await fetchWorkspace();
  };

  const handleUpdateMonthlyGoal = async (goal: number) => {
    await fetch('/api/revenue-goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyRevenueGoal: goal }),
    });
    await fetchWorkspace();
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  const renderPrimaryHeaderAction = () => {
    if (activeTab === 'calendar') {
      return (
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Ver cuentas
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setActiveTab('calendar')}
        className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Planificar contenido</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#080C16] text-slate-100 flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800/80 bg-[#0B1020] z-30">
        {/* Brand Wordmark */}
        <div className="h-16 px-6 flex items-center border-b border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-slate-50 via-violet-200 to-sky-300 bg-clip-text text-transparent whitespace-nowrap shrink-0 cursor-pointer"
          >
            CreatorPulse
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-violet-600/15 text-slate-50 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-violet-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.id === 'accounts' && workspace && (
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    {workspace.accounts.filter((a) => a.connected).length}/{workspace.accounts.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Creator Profile Footer */}
        {workspace && (
          <div className="p-4 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              {!avatarFailed ? (
                <img
                  src={workspace.creatorProfile.avatarUrl}
                  alt={workspace.creatorProfile.displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-sky-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  AR
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {workspace.creatorProfile.displayName}
                </p>
                <p className="text-xs text-slate-400 font-mono truncate">
                  {workspace.creatorProfile.handle}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Desktop & Mobile Contextual Top Bar (<= 56px height to respect 15% mobile sticky cap) */}
        <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-[#080C16]/90 backdrop-blur-md flex items-center justify-between gap-8">
          {/* Left Zone: Brand on mobile, Breadcrumb on desktop */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="lg:hidden text-base font-bold font-display text-slate-50 whitespace-nowrap shrink-0">
              CreatorPulse
            </span>
            <span className="lg:hidden text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="hidden lg:inline text-xs text-slate-400 whitespace-nowrap shrink-0">
              Espacio de creador
            </span>
            <span className="hidden lg:inline text-slate-600" aria-hidden="true">
              /
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-200 truncate">
              {activeNavMeta.label}
            </span>
          </div>

          {/* Right Zone: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">{renderPrimaryHeaderAction()}</div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="space-y-5">
              <div className="h-8 w-64 rounded-lg bg-slate-800/60 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className="h-32 rounded-2xl border border-slate-800/80 bg-[#0F1629] animate-pulse"
                  />
                ))}
              </div>
              <div className="h-80 rounded-2xl border border-slate-800/80 bg-[#0F1629] animate-pulse" />
            </div>
          ) : error || !workspace ? (
            <div className="rounded-2xl border border-rose-500/30 bg-[#0F1629] p-8 text-center max-w-md mx-auto my-12 space-y-4">
              <p className="text-sm text-rose-300">
                {error || 'No se pudo inicializar el panel.'}
              </p>
              <button
                type="button"
                onClick={fetchWorkspace}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar carga</span>
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  accounts={workspace.accounts}
                  revenueEntries={workspace.revenueEntries}
                  calendarEvents={workspace.calendarEvents}
                  currency={workspace.creatorProfile.currency}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  accounts={workspace.accounts}
                  onConnectOrUpdate={handleConnectOrUpdate}
                  onSyncAccount={handleSyncAccount}
                  onDisconnectAccount={handleDisconnectAccount}
                />
              )}

              {activeTab === 'growth' && (
                <GrowthView
                  accounts={workspace.accounts}
                  goals={workspace.goals}
                  onCreateGoal={handleCreateGoal}
                  onUpdateGoal={handleUpdateGoal}
                  onDeleteGoal={handleDeleteGoal}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  events={workspace.calendarEvents}
                  onCreateEvent={handleCreateEvent}
                  onUpdateEvent={handleUpdateEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              )}

              {activeTab === 'revenue' && (
                <RevenueView
                  entries={workspace.revenueEntries}
                  currency={workspace.creatorProfile.currency}
                  monthlyGoal={workspace.monthlyRevenueGoal}
                  onCreateEntry={handleCreateRevenue}
                  onUpdateEntry={handleUpdateRevenue}
                  onDeleteEntry={handleDeleteRevenue}
                  onUpdateMonthlyGoal={handleUpdateMonthlyGoal}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar — Includes "Cuentas" explicitly as requested */}
      <nav
        aria-label="Navegación móvil"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-[#0B1020]/95 backdrop-blur-md border-t border-slate-800/90 grid grid-cols-5 items-center px-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-violet-400' : ''}`} />
              <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default App;
