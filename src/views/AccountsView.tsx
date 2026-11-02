import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Info,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { PlatformAccount, PlatformId } from '../types';
import { DeltaIndicator, PLATFORM_META, PlatformIcon } from '../components/PlatformIcons';
import { calcPercentChange, formatCompactNumber, formatFullNumber } from '../utils/analytics';

interface AccountsViewProps {
  accounts: PlatformAccount[];
  onConnectOrUpdate: (
    platform: PlatformId,
    payload: {
      username: string;
      followers: number;
      followersGained30d: number;
      followersLost30d: number;
      monthlyViews: number;
      totalViews: number;
      streamHoursMonth: number;
      videosPublishedMonth: number;
      clipsPublishedMonth: number;
      streamsPublishedMonth: number;
      estimatedMonthlyRevenue: number;
    }
  ) => Promise<{ diagnosticMessage?: string }>;
  onSyncAccount: (platform: PlatformId) => Promise<{ diagnosticMessage?: string }>;
  onDisconnectAccount: (platform: PlatformId) => Promise<void>;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onConnectOrUpdate,
  onSyncAccount,
  onDisconnectAccount,
}) => {
  const [syncingPlatform, setSyncingPlatform] = useState<PlatformId | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<PlatformId | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    platformName: string;
    message: string;
  } | null>(null);

  const [modalAccount, setModalAccount] = useState<PlatformAccount | null>(null);
  const [formState, setFormState] = useState({
    username: '',
    followers: 0,
    followersGained30d: 0,
    followersLost30d: 0,
    monthlyViews: 0,
    totalViews: 0,
    streamHoursMonth: 0,
    videosPublishedMonth: 0,
    clipsPublishedMonth: 0,
    streamsPublishedMonth: 0,
    estimatedMonthlyRevenue: 0,
  });
  const [savingModal, setSavingModal] = useState(false);

  const openConnectModal = (acc: PlatformAccount) => {
    setModalAccount(acc);
    setFormState({
      username: acc.username,
      followers: acc.followers,
      followersGained30d: acc.followersGained30d,
      followersLost30d: acc.followersLost30d,
      monthlyViews: acc.monthlyViews,
      totalViews: acc.totalViews,
      streamHoursMonth: acc.streamHoursMonth,
      videosPublishedMonth: acc.videosPublishedMonth,
      clipsPublishedMonth: acc.clipsPublishedMonth,
      streamsPublishedMonth: acc.streamsPublishedMonth,
      estimatedMonthlyRevenue: acc.estimatedMonthlyRevenue,
    });
  };

  const handleSync = async (acc: PlatformAccount) => {
    setSyncingPlatform(acc.platform);
    try {
      const res = await onSyncAccount(acc.platform);
      if (res.diagnosticMessage) {
        setFeedbackBanner({
          platformName: acc.name,
          message: res.diagnosticMessage,
        });
      }
    } finally {
      setSyncingPlatform(null);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAccount) return;
    setSavingModal(true);
    try {
      const res = await onConnectOrUpdate(modalAccount.platform, formState);
      if (res.diagnosticMessage) {
        setFeedbackBanner({
          platformName: modalAccount.name,
          message: res.diagnosticMessage,
        });
      }
      setModalAccount(null);
    } finally {
      setSavingModal(false);
    }
  };

  const formatSyncTime = (iso: string | null) => {
    if (!iso) return 'Sin sincronización previa';
    const d = new Date(iso);
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Integraciones multicanal · APIs oficiales y respaldo manual transparente
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1">
            Cuentas Vinculadas
          </h1>
        </div>
        <p className="text-xs text-slate-400 max-w-md">
          CreatorPulse consulta endpoints oficiales cuando están disponibles y habilita introducción manual verificada cuando una red social restringe estadísticas o monetización.
        </p>
      </div>

      {/* Diagnostic Feedback Banner */}
      {feedbackBanner && (
        <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-200">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-300">{feedbackBanner.platformName}: </span>
              <span>{feedbackBanner.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const meta = PLATFORM_META[acc.platform];
          const growthPct = calcPercentChange(acc.followers, acc.previousMonthFollowers);
          const net30d = acc.followersGained30d - acc.followersLost30d;
          const isSyncing = syncingPlatform === acc.platform;

          return (
            <div
              key={acc.platform}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-colors ${
                acc.connected
                  ? 'border-slate-800/90 bg-[#0F1629]'
                  : 'border-slate-800/50 bg-[#0B1020] opacity-90'
              }`}
            >
              <div>
                {/* Header: Icon + Name + Username + Connection State */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl border ${meta.borderClass} ${meta.subtleBgClass} flex items-center justify-center shrink-0`}
                    >
                      <PlatformIcon platform={acc.platform} className={`w-5 h-5 ${meta.textClass}`} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-100 truncate">{acc.name}</h2>
                      <p className="text-xs text-slate-400 font-mono truncate">{acc.username}</p>
                    </div>
                  </div>

                  {/* Clean text + icon connection status (No pill sandwich) */}
                  <div className="text-right shrink-0">
                    {acc.connected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Conectada</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Link2Off className="w-3.5 h-3.5 shrink-0" />
                        <span>Desconectada</span>
                      </span>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {acc.connectionMethod === 'oauth_api'
                        ? 'OAuth 2.0 Oficial'
                        : acc.connectionMethod === 'public_api'
                          ? 'API Pública + Manual'
                          : acc.connectionMethod === 'manual_verified'
                            ? 'Datos manuales'
                            : 'Sin vincular'}
                    </p>
                  </div>
                </div>

                {/* Key Account Metrics */}
                <div className="grid grid-cols-3 gap-3 py-4 my-4 border-y border-slate-800/80">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Seguidores</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-100 mt-0.5 block">
                      {formatCompactNumber(acc.followers)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Vistas (mes)</span>
                    <span className="text-base font-bold font-mono tabular-nums text-slate-100 mt-0.5 block">
                      {formatCompactNumber(acc.monthlyViews)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Crecimiento</span>
                    <div className="mt-0.5">
                      <DeltaIndicator percent={growthPct} suffix="" />
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 block">
                      {net30d >= 0 ? '+' : ''}
                      {formatCompactNumber(net30d)}
                    </span>
                  </div>
                </div>

                {/* Transparent Official API Capability & Limitation Explanation */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                    <ShieldAlert className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="truncate">{acc.apiCapabilities.officialApiName}</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[12px]">
                    {acc.apiCapabilities.limitationSummary}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums pt-1">
                    Última act.: {formatSyncTime(acc.lastSyncedAt)}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Conectar / Actualizar / Manual / Desconectar */}
              <div className="mt-5 pt-4 border-t border-slate-800/70">
                {confirmDisconnect === acc.platform ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-rose-300">¿Desconectar {acc.name}?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDisconnect(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await onDisconnectAccount(acc.platform);
                          setConfirmDisconnect(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : acc.connected ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={() => handleSync(acc)}
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Actualizando...' : 'Actualizar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openConnectModal(acc)}
                      className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-700 hover:border-violet-500/50 text-slate-200 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                      <span>Datos manuales</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(acc.platform)}
                      className="min-h-[40px] px-3 py-2 rounded-lg border border-rose-500/25 hover:bg-rose-500/10 text-rose-400 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openConnectModal(acc)}
                    className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>Conectar {acc.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect / Manual Metrics Modal */}
      {modalAccount && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0F1629] p-6 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl border ${
                    PLATFORM_META[modalAccount.platform].borderClass
                  } ${PLATFORM_META[modalAccount.platform].subtleBgClass} flex items-center justify-center`}
                >
                  <PlatformIcon
                    platform={modalAccount.platform}
                    className={`w-5 h-5 ${PLATFORM_META[modalAccount.platform].textClass}`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {modalAccount.connected
                      ? `Configurar ${modalAccount.name}`
                      : `Vincular cuenta de ${modalAccount.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalAccount.apiCapabilities.authProtocol}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAccount(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-800 bg-[#080C16] p-3.5 text-xs text-slate-300 space-y-1">
              <p className="font-medium text-sky-300">
                Estado de autorización API oficial:
              </p>
              <p className="text-slate-400 leading-relaxed">
                {modalAccount.apiCapabilities.manualFallbackExplanation}
              </p>
            </div>

            <form onSubmit={handleSaveModal} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nombre de usuario / Identificador de canal
                </label>
                <input
                  type="text"
                  required
                  value={formState.username}
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  placeholder="@tu_canal"
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Al guardar, el servidor intentará consultar estadísticas públicas oficiales si la plataforma lo permite y usará los valores inferiores para las métricas restringidas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Seguidores actuales
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.followers}
                    onChange={(e) =>
                      setFormState({ ...formState, followers: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Ganados (30 días)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.followersGained30d}
                    onChange={(e) =>
                      setFormState({ ...formState, followersGained30d: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-emerald-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Perdidos (30 días)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.followersLost30d}
                    onChange={(e) =>
                      setFormState({ ...formState, followersLost30d: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-rose-300 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Visualizaciones (mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.monthlyViews}
                    onChange={(e) =>
                      setFormState({ ...formState, monthlyViews: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Horas de streaming (mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={formState.streamHoursMonth}
                    onChange={(e) =>
                      setFormState({ ...formState, streamHoursMonth: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Ingresos est. (USD/mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.estimatedMonthlyRevenue}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        estimatedMonthlyRevenue: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Videos (mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.videosPublishedMonth}
                    onChange={(e) =>
                      setFormState({ ...formState, videosPublishedMonth: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Clips / Shorts
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.clipsPublishedMonth}
                    onChange={(e) =>
                      setFormState({ ...formState, clipsPublishedMonth: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Directos (mes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formState.streamsPublishedMonth}
                    onChange={(e) =>
                      setFormState({ ...formState, streamsPublishedMonth: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAccount(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingModal}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingModal
                    ? 'Verificando y guardando...'
                    : modalAccount.connected
                      ? 'Guardar actualización'
                      : 'Vincular y sincronizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
