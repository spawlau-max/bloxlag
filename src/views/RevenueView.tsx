import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit3,
  Plus,
  Search,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import type { PlatformId, RevenueEntry, RevenueSourceId } from '../types';
import {
  DeltaIndicator,
  PLATFORM_META,
  PlatformIcon,
  REVENUE_SOURCE_META,
} from '../components/PlatformIcons';
import { calcPercentChange, formatCompactNumber, formatCurrency } from '../utils/analytics';

interface RevenueViewProps {
  entries: RevenueEntry[];
  currency: string;
  monthlyGoal: number;
  onCreateEntry: (entry: Omit<RevenueEntry, 'id' | 'month'>) => Promise<void>;
  onUpdateEntry: (id: string, entry: Partial<RevenueEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onUpdateMonthlyGoal: (goal: number) => Promise<void>;
}

const ALL_SOURCES: RevenueSourceId[] = [
  'youtube',
  'twitch',
  'kick',
  'tiktok',
  'instagram',
  'sponsorships',
  'donations',
  'affiliates',
  'other',
];

const MONTHS_ORDERED = [
  { key: '2026-06', label: 'Jun 26' },
  { key: '2026-07', label: 'Jul 26' },
  { key: '2026-08', label: 'Ago 26' },
  { key: '2026-09', label: 'Sep 26' },
  { key: '2026-10', label: 'Oct 26' },
  { key: '2026-11', label: 'Nov 26' },
];

export const RevenueView: React.FC<RevenueViewProps> = ({
  entries,
  currency,
  monthlyGoal,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onUpdateMonthlyGoal,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [sourceFilter, setSourceFilter] = useState<RevenueSourceId | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cobrado' | 'pendiente'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RevenueEntry | null>(null);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState(monthlyGoal);

  const [formState, setFormState] = useState<{
    date: string;
    sourceType: RevenueSourceId;
    subCategory: string;
    title: string;
    amount: number;
    status: 'cobrado' | 'pendiente';
    notes: string;
  }>({
    date: '2026-11-02',
    sourceType: 'youtube',
    subCategory: 'AdSense y Miembros del Canal',
    title: '',
    amount: 500,
    status: 'cobrado',
    notes: '',
  });

  // Current selected month entries & previous month entries
  const prevMonthKey = useMemo(() => {
    const idx = MONTHS_ORDERED.findIndex((m) => m.key === selectedMonth);
    if (idx > 0) return MONTHS_ORDERED[idx - 1].key;
    return '2026-10';
  }, [selectedMonth]);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === selectedMonth),
    [entries, selectedMonth]
  );

  const prevMonthEntries = useMemo(
    () => entries.filter((e) => e.month === prevMonthKey),
    [entries, prevMonthKey]
  );

  const totalMonth = useMemo(
    () => monthEntries.reduce((sum, e) => sum + e.amount, 0),
    [monthEntries]
  );
  const totalPrevMonth = useMemo(
    () => prevMonthEntries.reduce((sum, e) => sum + e.amount, 0),
    [prevMonthEntries]
  );
  const monthDeltaPct = calcPercentChange(totalMonth, totalPrevMonth);

  const paidAmount = useMemo(
    () => monthEntries.filter((e) => e.status === 'cobrado').reduce((s, e) => s + e.amount, 0),
    [monthEntries]
  );
  const pendingAmount = useMemo(
    () => monthEntries.filter((e) => e.status === 'pendiente').reduce((s, e) => s + e.amount, 0),
    [monthEntries]
  );

  // Breakdown across all 9 sources for selected month
  const breakdownBySource = useMemo(() => {
    return ALL_SOURCES.map((src) => {
      const amount = monthEntries
        .filter((e) => e.sourceType === src)
        .reduce((s, e) => s + e.amount, 0);
      const prevAmount = prevMonthEntries
        .filter((e) => e.sourceType === src)
        .reduce((s, e) => s + e.amount, 0);
      const sharePct = totalMonth > 0 ? (amount / totalMonth) * 100 : 0;
      return {
        sourceType: src,
        label: REVENUE_SOURCE_META[src].label,
        group: REVENUE_SOURCE_META[src].group,
        color: REVENUE_SOURCE_META[src].color,
        amount,
        prevAmount,
        deltaPct: calcPercentChange(amount, prevAmount),
        sharePct,
      };
    });
  }, [monthEntries, prevMonthEntries, totalMonth]);

  const platformDirectTotal = useMemo(
    () =>
      breakdownBySource
        .filter((b) => b.group === 'platform')
        .reduce((s, b) => s + b.amount, 0),
    [breakdownBySource]
  );

  const externalMonetizationTotal = useMemo(
    () =>
      breakdownBySource
        .filter((b) => b.group === 'external')
        .reduce((s, b) => s + b.amount, 0),
    [breakdownBySource]
  );

  // 6-Month Historical Stacked Chart Data
  const sixMonthChartData = useMemo(() => {
    return MONTHS_ORDERED.map((m) => {
      const mList = entries.filter((e) => e.month === m.key);
      const plataformas = mList
        .filter((e) => REVENUE_SOURCE_META[e.sourceType].group === 'platform')
        .reduce((s, e) => s + e.amount, 0);
      const patrocinios = mList
        .filter((e) => e.sourceType === 'sponsorships')
        .reduce((s, e) => s + e.amount, 0);
      const afiliadosDonacionesOtros = mList
        .filter((e) => ['donations', 'affiliates', 'other'].includes(e.sourceType))
        .reduce((s, e) => s + e.amount, 0);

      return {
        label: m.label,
        plataformas,
        patrocinios,
        comunidadYOtros: afiliadosDonacionesOtros,
        total: plataformas + patrocinios + afiliadosDonacionesOtros,
      };
    });
  }, [entries]);

  // Filtered Ledger Rows
  const filteredLedger = useMemo(() => {
    return entries.filter((e) => {
      if (selectedMonth !== 'all' && e.month !== selectedMonth) return false;
      if (sourceFilter !== 'all' && e.sourceType !== sourceFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchSub = e.subCategory.toLowerCase().includes(q);
        const matchSrc = REVENUE_SOURCE_META[e.sourceType].label.toLowerCase().includes(q);
        if (!matchTitle && !matchSub && !matchSrc) return false;
      }
      return true;
    });
  }, [entries, selectedMonth, sourceFilter, statusFilter, searchQuery]);

  const openCreateModal = (presetSource?: RevenueSourceId) => {
    setEditingEntry(null);
    const src = presetSource || 'youtube';
    const defaultSub: Record<RevenueSourceId, string> = {
      youtube: 'AdSense, YouTube Premium y Miembros',
      twitch: 'Suscripciones y Anuncios (Twitch)',
      kick: 'Suscripciones 95/5 y Programa KCIP',
      tiktok: 'Creator Rewards y Regalos LIVE',
      instagram: 'Bonificaciones y Suscripciones',
      sponsorships: 'Patrocinio de Marca / Campaña',
      donations: 'Donaciones de Comunidad / Super Chat',
      affiliates: 'Comisiones de Afiliados',
      other: 'Tienda Digital / Merch / Otros',
    };
    setFormState({
      date: '2026-11-02',
      sourceType: src,
      subCategory: defaultSub[src],
      title: '',
      amount: 450,
      status: 'cobrado',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (entry: RevenueEntry) => {
    setEditingEntry(entry);
    setFormState({
      date: entry.date,
      sourceType: entry.sourceType,
      subCategory: entry.subCategory,
      title: entry.title,
      amount: entry.amount,
      status: entry.status,
      notes: entry.notes || '',
    });
    setModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      await onUpdateEntry(editingEntry.id, formState);
    } else {
      await onCreateEntry(formState);
    }
    setModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = ['Fecha', 'Mes', 'Fuente', 'Subcategoria', 'Concepto', 'Monto_USD', 'Estado'];
    const rows = filteredLedger.map((r) => [
      r.date,
      r.month,
      `"${REVENUE_SOURCE_META[r.sourceType].label}"`,
      `"${r.subCategory.replace(/"/g, '""')}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
      r.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creatorpulse-ingresos-${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const goalProgressPct = Math.min(100, Math.round((totalMonth / Math.max(1, monthlyGoal)) * 100));

  const isPlatformId = (src: RevenueSourceId): src is PlatformId =>
    ['youtube', 'twitch', 'kick', 'tiktok', 'instagram'].includes(src);

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Control financiero de creador · Plataformas, patrocinios, afiliados y comunidad
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1">
            Ingresos y Monetización
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-800 bg-[#0F1629] px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="2026-11">Noviembre 2026 (Actual)</option>
            <option value="2026-10">Octubre 2026</option>
            <option value="2026-09">Septiembre 2026</option>
            <option value="2026-08">Agosto 2026</option>
            <option value="2026-07">Julio 2026</option>
            <option value="2026-06">Junio 2026</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar ingreso</span>
          </button>
        </div>
      </div>

      {/* Top Financial Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#131B33] to-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-sm font-medium">Ingresos totales ({selectedMonth})</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50 mt-3">
            {formatCurrency(totalMonth, currency)}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <DeltaIndicator percent={monthDeltaPct} />
            <span className="text-xs font-mono tabular-nums text-slate-400">
              ant. {formatCurrency(totalPrevMonth, currency)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Monetización de Plataformas</span>
            <Wallet className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50 mt-3">
            {formatCurrency(platformDirectTotal, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            YouTube · Twitch · Kick · TikTok · Instagram (
            {totalMonth > 0 ? Math.round((platformDirectTotal / totalMonth) * 100) : 0}% del total)
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Patrocinios, Afiliados y Otros</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50 mt-3">
            {formatCurrency(externalMonetizationTotal, currency)}
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono tabular-nums">
            Cobrado: {formatCurrency(paidAmount, currency)} · Pend.: {formatCurrency(pendingAmount, currency)}
          </p>
        </div>

        {/* Editable Monthly Revenue Goal */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Meta mensual financiera</span>
            <button
              type="button"
              onClick={() => {
                setGoalDraft(monthlyGoal);
                setGoalEditing(!goalEditing);
              }}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
            >
              {goalEditing ? 'Cerrar' : 'Ajustar'}
            </button>
          </div>

          {goalEditing ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onUpdateMonthlyGoal(goalDraft);
                setGoalEditing(false);
              }}
              className="mt-2 flex items-center gap-2"
            >
              <input
                type="number"
                min={100}
                value={goalDraft}
                onChange={(e) => setGoalDraft(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-100"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer"
              >
                OK
              </button>
            </form>
          ) : (
            <div className="mt-2">
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-xl font-bold text-slate-50">
                  {formatCurrency(monthlyGoal, currency)}
                </span>
                <span className="text-xs font-semibold text-sky-400">{goalProgressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                  style={{ width: `${goalProgressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 inline-flex items-center gap-1">
                <Target className="w-3 h-3 text-violet-400" />
                {totalMonth >= monthlyGoal
                  ? 'Meta mensual superada'
                  : `Faltan ${formatCurrency(monthlyGoal - totalMonth, currency)}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Middle Split: Breakdown by All 9 Platforms & Revenue Sources + 6-Month Evolution */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Breakdown by Platform & Source (All 9 Requested Sources!) */}
        <div className="xl:col-span-3 rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Ingresos por Plataforma y Fuente de Monetización
              </h2>
              <p className="text-xs text-slate-400">
                Desglose completo de las 9 líneas de ingreso en {selectedMonth}
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {breakdownBySource.map((item) => (
              <div key={item.sourceType} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPlatformId(item.sourceType) ? (
                      <PlatformIcon
                        platform={item.sourceType}
                        className={`w-4 h-4 shrink-0 ${PLATFORM_META[item.sourceType].textClass}`}
                      />
                    ) : (
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    )}
                    <span className="font-medium text-slate-200 truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                    <span className="text-slate-400">{item.sharePct.toFixed(1)}%</span>
                    <span className="font-semibold text-slate-100 w-20 text-right">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <div className="w-16 text-right">
                      <DeltaIndicator percent={item.deltaPct} suffix="" />
                    </div>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(item.amount > 0 ? 3 : 0, item.sharePct)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-Month Stacked Revenue Trend */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Evolución Financiera (6 Meses)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Plataformas vs. Patrocinios vs. Afiliados y Donaciones
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]" />
                Plataformas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6]" />
                Patrocinios
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#14B8A6]" />
                Afiliados / Donaciones / Otros
              </span>
            </div>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthChartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${formatCompactNumber(Number(v))}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, currency),
                    name === 'plataformas'
                      ? 'Plataformas (YT/Twitch/Kick/TT/IG)'
                      : name === 'patrocinios'
                        ? 'Patrocinios'
                        : 'Afiliados, Donaciones y Otros',
                  ]}
                />
                <Bar dataKey="plataformas" stackId="rev" fill="#38BDF8" />
                <Bar dataKey="patrocinios" stackId="rev" fill="#8B5CF6" />
                <Bar
                  dataKey="comunidadYOtros"
                  stackId="rev"
                  fill="#14B8A6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] overflow-hidden">
        <div className="p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Libro de Ingresos y Pagos Registrados
            </h2>
            <p className="text-xs text-slate-400">
              Filtra por fuente, estado de liquidación o busca campañas específicas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar concepto o marca..."
                className="rounded-lg border border-slate-800 bg-[#080C16] pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as RevenueSourceId | 'all')}
              className="rounded-lg border border-slate-800 bg-[#080C16] px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="all">Todas las fuentes (9)</option>
              {ALL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {REVENUE_SOURCE_META[s].label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'cobrado', label: 'Cobrados' },
                  { id: 'pendiente', label: 'Pendientes' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] text-slate-400">
                <th className="py-3 px-5 font-medium">Fecha</th>
                <th className="py-3 px-4 font-medium">Fuente / Plataforma</th>
                <th className="py-3 px-4 font-medium">Concepto y Detalle</th>
                <th className="py-3 px-4 font-medium">Estado</th>
                <th className="py-3 px-4 font-medium text-right">Importe</th>
                <th className="py-3 px-5 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400">
                    No se encontraron registros para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="py-3 px-5 font-mono tabular-nums text-xs text-slate-400 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-200 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {isPlatformId(entry.sourceType) ? (
                          <PlatformIcon
                            platform={entry.sourceType}
                            className={`w-3.5 h-3.5 ${PLATFORM_META[entry.sourceType].textClass}`}
                          />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-sm inline-block"
                            style={{ backgroundColor: REVENUE_SOURCE_META[entry.sourceType].color }}
                          />
                        )}
                        <span className="font-medium">
                          {REVENUE_SOURCE_META[entry.sourceType].label}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-100">{entry.title}</p>
                      <p className="text-xs text-slate-400">
                        {entry.subCategory}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateEntry(entry.id, {
                            status: entry.status === 'cobrado' ? 'pendiente' : 'cobrado',
                          })
                        }
                        className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                          entry.status === 'cobrado'
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-amber-400 hover:text-amber-300'
                        }`}
                        title="Clic para alternar estado de cobro"
                      >
                        {entry.status === 'cobrado' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cobrado</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendiente</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                      {formatCurrency(entry.amount, currency)}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                          aria-label="Editar ingreso"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          aria-label="Eliminar ingreso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Revenue Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0F1629] p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">
                {editingEntry ? 'Editar Registro de Ingreso' : 'Registrar Nuevo Ingreso'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fuente de ingreso o plataforma
                </label>
                <select
                  value={formState.sourceType}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      sourceType: e.target.value as RevenueSourceId,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                >
                  {ALL_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {REVENUE_SOURCE_META[src].label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Concepto principal
                </label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Ej. Pago AdSense Noviembre / Campaña patrocinada..."
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Subcategoría / Tipo
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.subCategory}
                    onChange={(e) => setFormState({ ...formState, subCategory: e.target.value })}
                    placeholder="Ej. Suscripciones y anuncios"
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Importe ({currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={formState.amount}
                    onChange={(e) => setFormState({ ...formState, amount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={formState.date}
                    onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Estado de cobro
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        status: e.target.value as 'cobrado' | 'pendiente',
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="cobrado">Cobrado</option>
                    <option value="pendiente">Pendiente de liquidación</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notas adicionales (opcional)
                </label>
                <input
                  type="text"
                  value={formState.notes}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Nº de factura, RPM o detalles del acuerdo..."
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
                >
                  {editingEntry ? 'Guardar cambios' : 'Registrar ingreso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
