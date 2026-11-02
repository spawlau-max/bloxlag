import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Compass,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import type { FollowerGoal, PlatformAccount, PlatformId } from '../types';
import { DeltaIndicator, PLATFORM_META, PlatformIcon } from '../components/PlatformIcons';
import {
  aggregateBestDays,
  aggregatePeriodSeries,
  calcPercentChange,
  computeHistoricalForecast,
  evaluateMultiPeriodPerformance,
  formatCompactNumber,
  formatFullNumber,
  generatePlainLanguageProgress,
} from '../utils/analytics';

interface GrowthViewProps {
  accounts: PlatformAccount[];
  goals: FollowerGoal[];
  onCreateGoal: (goal: {
    platform: PlatformId | 'all';
    title: string;
    targetFollowers: number;
    deadline: string;
  }) => Promise<void>;
  onUpdateGoal: (
    id: string,
    goal: Partial<{
      platform: PlatformId | 'all';
      title: string;
      targetFollowers: number;
      deadline: string;
    }>
  ) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export const GrowthView: React.FC<GrowthViewProps> = ({
  accounts,
  goals,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | 'all'>('all');
  const [historyGranularity, setHistoryGranularity] = useState<'weekly' | 'monthly'>('monthly');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FollowerGoal | null>(null);
  const [goalForm, setGoalForm] = useState<{
    platform: PlatformId | 'all';
    title: string;
    targetFollowers: number;
    deadline: string;
  }>({
    platform: 'all',
    title: '',
    targetFollowers: 100000,
    deadline: '2027-03-31',
  });

  const evaluation = useMemo(
    () => evaluateMultiPeriodPerformance(accounts, selectedPlatform),
    [accounts, selectedPlatform]
  );

  const progressInsights = useMemo(
    () => generatePlainLanguageProgress(accounts, selectedPlatform),
    [accounts, selectedPlatform]
  );

  const periodSeries = useMemo(
    () => aggregatePeriodSeries(accounts, historyGranularity, selectedPlatform),
    [accounts, historyGranularity, selectedPlatform]
  );

  const forecast = useMemo(
    () => computeHistoricalForecast(accounts, selectedPlatform),
    [accounts, selectedPlatform]
  );

  const bestDays = useMemo(
    () => aggregateBestDays(accounts, selectedPlatform),
    [accounts, selectedPlatform]
  );

  const maxDayViews = useMemo(
    () => Math.max(1, ...bestDays.map((d) => d.avgViews)),
    [bestDays]
  );

  // Cross-platform normalized growth (% cumulative over 12 months)
  const crossPlatformComparison = useMemo(() => {
    const active = accounts.filter((a) => a.connected);
    if (active.length === 0) return [];
    const len = active[0].monthlySeries.length;
    const rows: Array<Record<string, string | number>> = [];

    for (let i = 0; i < len; i++) {
      const row: Record<string, string | number> = {
        label: active[0].monthlySeries[i].label,
      };
      for (const acc of active) {
        const base = Math.max(1, acc.monthlySeries[0]?.followers || 1);
        const cur = acc.monthlySeries[i]?.followers || base;
        row[acc.platform] = Number((((cur - base) / base) * 100).toFixed(1));
      }
      rows.push(row);
    }
    return rows;
  }, [accounts]);

  // Weekly & Monthly side-by-side comparison
  const weeklySeries = useMemo(
    () => aggregatePeriodSeries(accounts, 'weekly', selectedPlatform),
    [accounts, selectedPlatform]
  );
  const monthlySeries = useMemo(
    () => aggregatePeriodSeries(accounts, 'monthly', selectedPlatform),
    [accounts, selectedPlatform]
  );

  const thisWeek = weeklySeries[weeklySeries.length - 1];
  const prevWeek = weeklySeries[weeklySeries.length - 2];
  const thisMonth = monthlySeries[monthlySeries.length - 1];
  const prevMonth = monthlySeries[monthlySeries.length - 2];

  const getCurrentFollowersForGoal = (platform: PlatformId | 'all') => {
    if (platform === 'all') {
      return accounts.filter((a) => a.connected).reduce((s, a) => s + a.followers, 0);
    }
    return accounts.find((a) => a.platform === platform)?.followers || 0;
  };

  const getDailyVelocityForGoal = (platform: PlatformId | 'all') => {
    return computeHistoricalForecast(accounts, platform).dailyVelocity;
  };

  const openNewGoalModal = () => {
    setEditingGoal(null);
    const current = getCurrentFollowersForGoal(selectedPlatform);
    setGoalForm({
      platform: selectedPlatform,
      title:
        selectedPlatform === 'all'
          ? 'Meta Global de Comunidad'
          : `Meta de Crecimiento en ${PLATFORM_META[selectedPlatform].label}`,
      targetFollowers: Math.ceil((current * 1.15) / 5000) * 5000 || 50000,
      deadline: '2027-03-31',
    });
    setGoalModalOpen(true);
  };

  const openEditGoalModal = (goal: FollowerGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      platform: goal.platform,
      title: goal.title,
      targetFollowers: goal.targetFollowers,
      deadline: goal.deadline,
    });
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGoal) {
      await onUpdateGoal(editingGoal.id, goalForm);
    } else {
      await onCreateGoal(goalForm);
    }
    setGoalModalOpen(false);
  };

  const semaphoreStyles = {
    verde: {
      border: 'border-emerald-500/35',
      bg: 'bg-emerald-500/8',
      text: 'text-emerald-400',
      icon: CheckCircle2,
    },
    amarillo: {
      border: 'border-amber-500/35',
      bg: 'bg-amber-500/8',
      text: 'text-amber-400',
      icon: AlertTriangle,
    },
    rojo: {
      border: 'border-rose-500/35',
      bg: 'bg-rose-500/8',
      text: 'text-rose-400',
      icon: XCircle,
    },
  }[evaluation.semaphore];

  const SemaphoreIcon = semaphoreStyles.icon;

  return (
    <div className="space-y-6">
      {/* Header + Account Selector */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Tendencias multi-período · Regresión histórica y diagnóstico de audiencia
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1">
            Análisis de Crecimiento
          </h1>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedPlatform('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedPlatform === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-[#0F1629] border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas las cuentas
          </button>
          {accounts.map((acc) => (
            <button
              key={acc.platform}
              type="button"
              onClick={() => setSelectedPlatform(acc.platform)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedPlatform === acc.platform
                  ? 'bg-violet-600 text-white'
                  : 'bg-[#0F1629] border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlatformIcon
                platform={acc.platform}
                className={`w-3.5 h-3.5 ${
                  selectedPlatform === acc.platform ? 'text-white' : PLATFORM_META[acc.platform].textClass
                }`}
              />
              <span>{acc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Period Performance Semaphore Banner (All-around 1px border, NO thick left accent) */}
      <div className={`rounded-2xl border ${semaphoreStyles.border} ${semaphoreStyles.bg} p-5 sm:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <SemaphoreIcon className={`w-6 h-6 ${semaphoreStyles.text} shrink-0 mt-0.5`} />
            <div>
              <h2 className={`text-base sm:text-lg font-bold ${semaphoreStyles.text}`}>
                {evaluation.headline}
              </h2>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed max-w-3xl">
                {evaluation.explanation}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80 shrink-0">
            <div>
              <span className="text-[11px] text-slate-400 block">Crecimiento 30d</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-100">
                {evaluation.followerPeriodGrowthPct >= 0 ? '+' : ''}
                {evaluation.followerPeriodGrowthPct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Pendiente 4 sem</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-100">
                {evaluation.fourWeekSlopePct >= 0 ? '+' : ''}
                {evaluation.fourWeekSlopePct.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Retención neta</span>
              <span className="text-base font-bold font-mono tabular-nums text-slate-100">
                {evaluation.retentionRatioPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* "Tu progreso" — Plain Language Coaching Section */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <Compass className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Tu progreso</h2>
            <p className="text-xs text-slate-400">
              Diagnóstico en lenguaje sencillo basado en tus resultados históricos equivalentes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-emerald-400">
              Qué está funcionando bien
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
              {progressInsights.workingWell.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 md:border-l md:border-slate-800/80 md:pl-6">
            <h3 className="text-sm font-semibold text-sky-400">
              Qué podrías mejorar esta semana
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
              {progressInsights.couldImprove.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-sky-400 shrink-0 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Charts Row: Followers Over Time + Gained vs Lost */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Followers Over Time */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Seguidores a lo largo del tiempo
              </h2>
              <p className="text-xs text-slate-400">Evolución acumulada verificada</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800">
              <button
                type="button"
                onClick={() => setHistoryGranularity('weekly')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  historyGranularity === 'weekly'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                12 Semanas
              </button>
              <button
                type="button"
                onClick={() => setHistoryGranularity('monthly')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  historyGranularity === 'monthly'
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                12 Meses
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthFollowersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactNumber(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number) => [formatFullNumber(v), 'Seguidores']}
                />
                <Area
                  type="monotone"
                  dataKey="followers"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fill="url(#growthFollowersGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gained vs Lost Followers */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-100">
              Seguidores Ganados vs. Perdidos
            </h2>
            <p className="text-xs text-slate-400">
              Adquisición bruta frente a bajas en cada período
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactNumber(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number, key: string) => [
                    formatFullNumber(v),
                    key === 'gained' ? 'Ganados' : 'Perdidos',
                  ]}
                />
                <Bar dataKey="gained" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lost" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cross-Platform Comparison + Weekly & Monthly Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Multi-Platform % Growth Comparison */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Comparación de Ritmo entre Plataformas (% Acumulado 12M)
              </h2>
              <p className="text-xs text-slate-400">
                Índice relativo de crecimiento porcentual desde hace 12 meses
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {accounts
                .filter((a) => a.connected)
                .map((acc) => (
                  <span key={acc.platform} className="inline-flex items-center gap-1.5 text-slate-300">
                    <span
                      className="w-2.5 h-0.5 inline-block"
                      style={{ backgroundColor: PLATFORM_META[acc.platform].accentHex }}
                    />
                    <span>{acc.name}</span>
                  </span>
                ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crossPlatformComparison} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `+${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number, key: string) => [
                    `+${v}%`,
                    PLATFORM_META[key as PlatformId]?.label || key,
                  ]}
                />
                {accounts
                  .filter((a) => a.connected)
                  .map((acc) => (
                    <Line
                      key={acc.platform}
                      type="monotone"
                      dataKey={acc.platform}
                      stroke={PLATFORM_META[acc.platform].accentHex}
                      strokeWidth={2.2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly & Monthly Comparison Box */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Comparación Semanal y Mensual
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rendimiento frente al bloque inmediatamente anterior
            </p>
          </div>

          {thisWeek && prevWeek && (
            <div className="space-y-2.5 pb-4 border-b border-slate-800/80">
              <div className="text-xs font-semibold text-violet-400">
                Comparativa Semanal (Sem 12 vs. Sem 11)
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Altas netas</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-slate-100 font-semibold">
                    +{formatFullNumber(thisWeek.gained - thisWeek.lost)}
                  </span>
                  <DeltaIndicator
                    percent={calcPercentChange(
                      thisWeek.gained - thisWeek.lost,
                      prevWeek.gained - prevWeek.lost
                    )}
                    suffix=""
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Visualizaciones</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-slate-100 font-semibold">
                    {formatCompactNumber(thisWeek.views)}
                  </span>
                  <DeltaIndicator
                    percent={calcPercentChange(thisWeek.views, prevWeek.views)}
                    suffix=""
                  />
                </div>
              </div>
            </div>
          )}

          {thisMonth && prevMonth && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-sky-400">
                Comparativa Mensual (Nov 26 vs. Oct 26)
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Altas netas</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-slate-100 font-semibold">
                    +{formatFullNumber(thisMonth.gained - thisMonth.lost)}
                  </span>
                  <DeltaIndicator
                    percent={calcPercentChange(
                      thisMonth.gained - thisMonth.lost,
                      prevMonth.gained - prevMonth.lost
                    )}
                    suffix=""
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Visualizaciones</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-slate-100 font-semibold">
                    {formatCompactNumber(thisMonth.views)}
                  </span>
                  <DeltaIndicator
                    percent={calcPercentChange(thisMonth.views, prevMonth.views)}
                    suffix=""
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Horas en vivo</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-slate-100 font-semibold">
                    {thisMonth.streamHours.toFixed(1)} h
                  </span>
                  <DeltaIndicator
                    percent={calcPercentChange(thisMonth.streamHours, prevMonth.streamHours)}
                    suffix=""
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Best Days to Publish + Historical Forecast (30, 60, 90 days) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Best Publishing Days */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Mejores Días y Ventanas de Publicación
              </h2>
              <p className="text-xs text-slate-400">
                Alcance medio e interacción histórica según el día de estreno
              </p>
            </div>
            <Calendar className="w-4 h-4 text-violet-400 shrink-0" />
          </div>

          <div className="space-y-3">
            {bestDays.map((day) => {
              const barPct = Math.round((day.avgViews / maxDayViews) * 100);
              const isTop = barPct >= 88;
              return (
                <div key={day.dayName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold w-20 ${isTop ? 'text-sky-300' : 'text-slate-200'}`}>
                        {day.dayName}
                      </span>
                      <span className="text-slate-400 font-mono tabular-nums">
                        {day.bestHourWindow}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-slate-300">{formatCompactNumber(day.avgViews)} vistas</span>
                      <span className="text-slate-500">·</span>
                      <span className={isTop ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                        {day.engagementRate}% eng.
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/90 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isTop
                          ? 'bg-gradient-to-r from-violet-500 to-sky-400'
                          : 'bg-slate-600'
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Predictions (30 / 60 / 90 Days) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Predicciones Basadas en Datos Históricos
                </h2>
                <p className="text-xs text-slate-400">
                  Proyección de regresión lineal + velocidad reciente (+{formatFullNumber(forecast.dailyVelocity)} seg./día)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="rounded-xl border border-slate-800 bg-[#080C16] p-3">
                <span className="text-[11px] text-slate-400 block">En 30 días</span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-sky-300 mt-0.5 block">
                  {formatCompactNumber(forecast.in30Days)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#080C16] p-3">
                <span className="text-[11px] text-slate-400 block">En 60 días</span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-violet-300 mt-0.5 block">
                  {formatCompactNumber(forecast.in60Days)}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#080C16] p-3">
                <span className="text-[11px] text-slate-400 block">En 90 días</span>
                <span className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-300 mt-0.5 block">
                  {formatCompactNumber(forecast.in90Days)}
                </span>
              </div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatCompactNumber(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(v: number, name: string) => [
                    formatFullNumber(v),
                    name === 'historicalFollowers'
                      ? 'Histórico real'
                      : name === 'projectedExpected'
                        ? 'Proyección esperada'
                        : name === 'projectedOptimistic'
                          ? 'Escenario optimista'
                          : 'Escenario conservador',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="historicalFollowers"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="projectedExpected"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="projectedOptimistic"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="projectedConservative"
                  stroke="#64748B"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Customizable Follower Goals Section */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-violet-400 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Objetivos de Seguidores Personalizables
              </h2>
              <p className="text-xs text-slate-400">
                Define metas por plataforma y consulta cuándo las alcanzarás al ritmo actual
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewGoalModal}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo objetivo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const current = getCurrentFollowersForGoal(goal.platform);
            const pct = Math.min(100, Math.round((current / Math.max(1, goal.targetFollowers)) * 100));
            const remaining = Math.max(0, goal.targetFollowers - current);
            const velocity = getDailyVelocityForGoal(goal.platform);
            const estDays = velocity > 0 ? Math.ceil(remaining / velocity) : null;

            return (
              <div
                key={goal.id}
                className="rounded-xl border border-slate-800 bg-[#080C16] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>
                        {goal.platform === 'all'
                          ? 'Multicanal'
                          : PLATFORM_META[goal.platform].label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Meta: {goal.deadline}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-100 mt-1">{goal.title}</h3>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditGoalModal(goal)}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer"
                      aria-label="Eliminar objetivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs font-mono tabular-nums mb-1.5">
                    <span className="text-slate-200 font-semibold">
                      {formatFullNumber(current)} / {formatFullNumber(goal.targetFollowers)}
                    </span>
                    <span className="text-sky-400 font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {remaining === 0
                      ? 'Objetivo alcanzado.'
                      : estDays !== null
                        ? `Faltan ${formatFullNumber(remaining)} seguidores · Proyección estimada en ~${estDays} días.`
                        : `Faltan ${formatFullNumber(remaining)} seguidores · Conecta la cuenta para estimar fecha.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Goal Modal */}
      {goalModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0F1629] p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                {editingGoal ? 'Editar Objetivo de Seguidores' : 'Crear Objetivo de Seguidores'}
              </h3>
              <button
                type="button"
                onClick={() => setGoalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Plataforma objetivo
                </label>
                <select
                  value={goalForm.platform}
                  onChange={(e) =>
                    setGoalForm({
                      ...goalForm,
                      platform: e.target.value as PlatformId | 'all',
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                >
                  <option value="all">Todas las plataformas conectadas</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitch">Twitch</option>
                  <option value="kick">Kick</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre de la meta
                </label>
                <input
                  type="text"
                  required
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="Ej. Alcanzar Placa de 250K"
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Meta de seguidores
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={goalForm.targetFollowers}
                    onChange={(e) =>
                      setGoalForm({ ...goalForm, targetFollowers: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fecha objetivo
                  </label>
                  <input
                    type="date"
                    required
                    value={goalForm.deadline}
                    onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Guardar objetivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
