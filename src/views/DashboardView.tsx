import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  CalendarClock,
  DollarSign,
  Eye,
  Film,
  Radio,
  Users,
  UserPlus,
} from 'lucide-react';
import type { CalendarEvent, PlatformAccount, PlatformId, RevenueEntry } from '../types';
import { DeltaIndicator, PLATFORM_META, PlatformIcon } from '../components/PlatformIcons';
import {
  aggregateDailySeries,
  aggregatePeriodSeries,
  calcPercentChange,
  computeDashboardSummary,
  formatCompactNumber,
  formatCurrency,
  formatFullNumber,
} from '../utils/analytics';

interface DashboardViewProps {
  accounts: PlatformAccount[];
  revenueEntries: RevenueEntry[];
  calendarEvents: CalendarEvent[];
  currency: string;
  onNavigate: (tab: 'dashboard' | 'accounts' | 'growth' | 'calendar' | 'revenue') => void;
}

type TimeframeKey = 'daily' | 'weekly' | 'monthly';
type MetricChartKey = 'followers' | 'views' | 'gain_loss' | 'revenue';

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  revenueEntries,
  calendarEvents,
  currency,
  onNavigate,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('daily');
  const [chartMetric, setChartMetric] = useState<MetricChartKey>('followers');
  const [platformFilter, setPlatformFilter] = useState<PlatformId | 'all'>('all');

  const summary = useMemo(
    () => computeDashboardSummary(accounts, revenueEntries),
    [accounts, revenueEntries]
  );

  const chartData = useMemo(() => {
    if (timeframe === 'daily') {
      return aggregateDailySeries(accounts, platformFilter);
    }
    return aggregatePeriodSeries(accounts, timeframe, platformFilter);
  }, [accounts, timeframe, platformFilter]);

  const upcomingEvents = useMemo(() => {
    return [...calendarEvents]
      .filter((e) => e.status !== 'publicado' && e.date >= '2026-11-02')
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
      .slice(0, 4);
  }, [calendarEvents]);

  const comparisonRows = [
    {
      label: 'Seguidores totales activos',
      current: formatFullNumber(summary.totalFollowers),
      previous: formatFullNumber(summary.prevTotalFollowers),
      diff: `${summary.totalFollowers - summary.prevTotalFollowers >= 0 ? '+' : ''}${formatFullNumber(
        summary.totalFollowers - summary.prevTotalFollowers
      )}`,
      pct: summary.followersDeltaPct,
    },
    {
      label: 'Crecimiento neto (ganados - perdidos)',
      current: `${summary.netGain30d >= 0 ? '+' : ''}${formatFullNumber(summary.netGain30d)}`,
      previous: `+${formatFullNumber(summary.prevNetGain30d)}`,
      diff: `${summary.netGain30d - summary.prevNetGain30d >= 0 ? '+' : ''}${formatFullNumber(
        summary.netGain30d - summary.prevNetGain30d
      )}`,
      pct: summary.netGainDeltaPct,
    },
    {
      label: 'Suscriptores de YouTube',
      current: summary.youtubeConnected ? formatFullNumber(summary.youtubeSubscribers) : 'Sin vincular',
      previous: summary.youtubeConnected ? formatFullNumber(summary.prevYoutubeSubscribers) : '—',
      diff: summary.youtubeConnected
        ? `+${formatFullNumber(summary.youtubeSubscribers - summary.prevYoutubeSubscribers)}`
        : '—',
      pct: summary.youtubeDeltaPct,
    },
    {
      label: 'Visualizaciones mensuales',
      current: formatCompactNumber(summary.monthlyViews),
      previous: formatCompactNumber(summary.prevMonthlyViews),
      diff: `${summary.monthlyViews - summary.prevMonthlyViews >= 0 ? '+' : ''}${formatCompactNumber(
        summary.monthlyViews - summary.prevMonthlyViews
      )}`,
      pct: summary.viewsDeltaPct,
    },
    {
      label: 'Horas de streaming emitidas',
      current: `${summary.streamHours.toFixed(1)} h`,
      previous: `${summary.prevStreamHours.toFixed(1)} h`,
      diff: `${summary.streamHours - summary.prevStreamHours >= 0 ? '+' : ''}${(
        summary.streamHours - summary.prevStreamHours
      ).toFixed(1)} h`,
      pct: summary.streamHoursDeltaPct,
    },
    {
      label: 'Publicaciones totales (videos, clips y directos)',
      current: `${summary.totalContentCount}`,
      previous: `${summary.prevTotalContentCount}`,
      diff: `${summary.totalContentCount - summary.prevTotalContentCount >= 0 ? '+' : ''}${
        summary.totalContentCount - summary.prevTotalContentCount
      }`,
      pct: summary.contentDeltaPct,
    },
    {
      label: 'Ingresos estimados mensuales',
      current: formatCurrency(summary.currentMonthRevenue, currency),
      previous: formatCurrency(summary.previousMonthRevenue, currency),
      diff: `${summary.currentMonthRevenue - summary.previousMonthRevenue >= 0 ? '+' : ''}${formatCurrency(
        summary.currentMonthRevenue - summary.previousMonthRevenue,
        currency
      )}`,
      pct: summary.revenueDeltaPct,
    },
  ];

  const connectedCount = accounts.filter((a) => a.connected).length;

  return (
    <div className="space-y-6">
      {/* Top Intro Strip */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Resumen multicanal · {connectedCount} de {accounts.length} plataformas conectadas · Noviembre 2026
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1 text-balance">
            Panel de Rendimiento de Creador
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Comparativa activa frente a Octubre 2026</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Gestionar cuentas
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid — All 7 Core Requested Stats with % Variation + Green/Red Arrow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Seguidores totales */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Seguidores totales</span>
            <Users className="w-4 h-4 text-violet-400 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50">
              {formatFullNumber(summary.totalFollowers)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaIndicator percent={summary.followersDeltaPct} />
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ant. {formatCompactNumber(summary.prevTotalFollowers)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Nuevos seguidores ganados y perdidos */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Nuevos seguidores (30d)</span>
            <UserPlus className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50">
              {summary.netGain30d >= 0 ? '+' : ''}
              {formatFullNumber(summary.netGain30d)}
            </div>
            <div className="mt-1.5 text-xs font-mono tabular-nums text-slate-400 flex items-center gap-2">
              <span className="text-emerald-400">+{formatFullNumber(summary.gained30d)} ganados</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-rose-400">-{formatFullNumber(summary.lost30d)} perdidos</span>
            </div>
            <div className="mt-2">
              <DeltaIndicator percent={summary.netGainDeltaPct} />
            </div>
          </div>
        </div>

        {/* 3. Suscriptores actuales de YouTube */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Suscriptores YouTube</span>
            <PlatformIcon platform="youtube" className="w-4 h-4 text-rose-400 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50">
              {summary.youtubeConnected ? formatFullNumber(summary.youtubeSubscribers) : '—'}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              {summary.youtubeConnected ? (
                <>
                  <DeltaIndicator percent={summary.youtubeDeltaPct} />
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    +{formatFullNumber(summary.youtubeSubscribers - summary.prevYoutubeSubscribers)}
                  </span>
                </>
              ) : (
                <span className="text-xs text-slate-500">Cuenta desconectada</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Ingresos estimados mensuales */}
        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-[#131B33] to-[#0F1629] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-sm font-medium">Ingresos estimados (mes)</span>
            <DollarSign className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-50">
              {formatCurrency(summary.currentMonthRevenue, currency)}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <DeltaIndicator percent={summary.revenueDeltaPct} />
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                ant. {formatCurrency(summary.previousMonthRevenue, currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row KPIs: Views, Stream Hours, Videos/Clips/Streams Published */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 5. Visualizaciones totales */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Visualizaciones (mes / históricas)</span>
            <Eye className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-50">
              {formatCompactNumber(summary.monthlyViews)}
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              · {formatCompactNumber(summary.totalViewsAllTime)} históricas
            </span>
          </div>
          <div className="mt-2">
            <DeltaIndicator percent={summary.viewsDeltaPct} />
          </div>
        </div>

        {/* 6. Horas de streaming */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Horas de streaming (30d)</span>
            <Radio className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-50">
              {summary.streamHours.toFixed(1)} h
            </span>
            <span className="text-xs text-slate-400">
              Twitch · Kick · YouTube Live
            </span>
          </div>
          <div className="mt-2">
            <DeltaIndicator percent={summary.streamHoursDeltaPct} />
          </div>
        </div>

        {/* 7. Cantidad de videos, clips y directos publicados */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Contenido publicado (30d)</span>
            <Film className="w-4 h-4 text-violet-400 shrink-0" />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-50">
              {summary.totalContentCount} piezas
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400 font-mono tabular-nums">
            {summary.videosCount} videos · {summary.clipsCount} clips · {summary.streamsCount} directos
          </div>
          <div className="mt-2">
            <DeltaIndicator percent={summary.contentDeltaPct} />
          </div>
        </div>
      </div>

      {/* Main Animated Growth Chart Section (Daily, Weekly, Monthly) */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Evolución y Ritmo de Crecimiento
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Analiza series diarias, semanales y mensuales por métrica y plataforma
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Metric Selector */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800">
              {(
                [
                  { id: 'followers', label: 'Seguidores' },
                  { id: 'views', label: 'Vistas' },
                  { id: 'gain_loss', label: 'Ganados / Perdidos' },
                  { id: 'revenue', label: 'Ingresos' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChartMetric(item.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMetric === item.id
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Timeframe Selector (Diario, Semanal, Mensual) */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800">
              {(
                [
                  { id: 'daily', label: 'Diario' },
                  { id: 'weekly', label: 'Semanal' },
                  { id: 'monthly', label: 'Mensual' },
                ] as const
              ).map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    timeframe === tf.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Filter Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-3">
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              platformFilter === 'all'
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Todas conectadas
          </button>
          {accounts.map((acc) => (
            <button
              key={acc.platform}
              type="button"
              onClick={() => setPlatformFilter(acc.platform)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                platformFilter === acc.platform
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PlatformIcon
                platform={acc.platform}
                className={`w-3.5 h-3.5 ${PLATFORM_META[acc.platform].textClass}`}
              />
              <span>{acc.name}</span>
              {!acc.connected && <span className="text-[11px] text-slate-500">(off)</span>}
            </button>
          ))}
        </div>

        {/* Chart Canvas */}
        <div className="h-72 sm:h-80 w-full mt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <p className="text-sm text-slate-400">No hay cuentas conectadas para mostrar la gráfica.</p>
              <button
                type="button"
                onClick={() => onNavigate('accounts')}
                className="mt-3 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Vincular plataforma
              </button>
            </div>
          ) : chartMetric === 'gain_loss' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
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
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number, name: string) => [
                    formatFullNumber(value),
                    name === 'gained' ? 'Seguidores ganados' : 'Seguidores perdidos',
                  ]}
                />
                <Bar dataKey="gained" fill="#38BDF8" radius={[4, 4, 0, 0]} animationDuration={500} />
                <Bar dataKey="lost" fill="#F43F5E" radius={[4, 4, 0, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="creatorPulsePrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={chartMetric === 'followers' ? ['auto', 'auto'] : [0, 'auto']}
                  tickFormatter={(v) =>
                    chartMetric === 'revenue'
                      ? `$${formatCompactNumber(Number(v))}`
                      : formatCompactNumber(Number(v))
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0B1120',
                    borderColor: '#1E293B',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#F1F5F9',
                  }}
                  formatter={(value: number) => [
                    chartMetric === 'revenue'
                      ? formatCurrency(value, currency)
                      : formatFullNumber(value),
                    chartMetric === 'followers'
                      ? 'Seguidores'
                      : chartMetric === 'views'
                        ? 'Visualizaciones'
                        : 'Ingresos estimados',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#creatorPulsePrimary)"
                  animationDuration={550}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Split: Month-over-Month Comparison Table + Upcoming Activities */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Month-over-Month Comparison Table */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-800/80 bg-[#0F1629] overflow-hidden">
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Comparación Directa con el Mes Anterior
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Noviembre 2026 frente a Octubre 2026 en todas tus cuentas conectadas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('growth')}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver análisis profundo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-[11px] text-slate-400">
                  <th className="py-3 px-5 font-medium">Indicador clave</th>
                  <th className="py-3 px-4 font-medium text-right">Mes actual</th>
                  <th className="py-3 px-4 font-medium text-right">Mes anterior</th>
                  <th className="py-3 px-4 font-medium text-right">Diferencia</th>
                  <th className="py-3 px-5 font-medium text-right">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="hover:bg-slate-800/25 transition-colors">
                    <td className="py-3 px-5 text-slate-200 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                      {row.current}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                      {row.previous}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {row.diff}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <DeltaIndicator percent={row.pct} suffix="" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Content & Active Channels Summary */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-sky-400" />
              <h2 className="text-base font-semibold text-slate-100">Próximas Publicaciones</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              Abrir calendario
            </button>
          </div>

          <div className="divide-y divide-slate-800/70">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                No tienes publicaciones pendientes. Programa tu próximo directo o video.
              </p>
            ) : (
              upcomingEvents.map((evt) => (
                <div key={evt.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums">
                      {evt.date} · {evt.startTime}
                    </span>
                    <span className="capitalize text-slate-300">{evt.status}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-100 mt-1 line-clamp-1">
                    {evt.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
                    {evt.platforms.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1">
                        <PlatformIcon
                          platform={p}
                          className={`w-3.5 h-3.5 ${PLATFORM_META[p].textClass}`}
                        />
                        <span>{PLATFORM_META[p].label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-medium text-slate-400 mb-3">
              Crecimiento mensual por canal conectado
            </h3>
            <div className="space-y-2.5">
              {accounts
                .filter((a) => a.connected)
                .map((acc) => {
                  const pct = calcPercentChange(acc.followers, acc.previousMonthFollowers);
                  return (
                    <div key={acc.platform} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-200">
                        <PlatformIcon
                          platform={acc.platform}
                          className={`w-4 h-4 ${PLATFORM_META[acc.platform].textClass}`}
                        />
                        <span className="font-medium">{acc.name}</span>
                        <span className="text-slate-500">{acc.username}</span>
                      </div>
                      <DeltaIndicator percent={pct} suffix="" />
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
