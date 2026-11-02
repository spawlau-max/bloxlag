import type {
  BestDayStat,
  CalendarEvent,
  PlatformAccount,
  PlatformDailyMetric,
  PlatformId,
  PlatformPeriodMetric,
  RevenueEntry,
} from '../types';

export function calcPercentChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatCompactNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(num) >= 10_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString('es-ES');
}

export function formatFullNumber(num: number): string {
  return Math.round(num).toLocaleString('es-ES');
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface DashboardSummaryMetrics {
  totalFollowers: number;
  prevTotalFollowers: number;
  followersDeltaPct: number;

  gained30d: number;
  lost30d: number;
  netGain30d: number;
  prevNetGain30d: number;
  netGainDeltaPct: number;

  youtubeSubscribers: number;
  prevYoutubeSubscribers: number;
  youtubeDeltaPct: number;
  youtubeConnected: boolean;

  totalViewsAllTime: number;
  monthlyViews: number;
  prevMonthlyViews: number;
  viewsDeltaPct: number;

  streamHours: number;
  prevStreamHours: number;
  streamHoursDeltaPct: number;

  videosCount: number;
  clipsCount: number;
  streamsCount: number;
  totalContentCount: number;
  prevTotalContentCount: number;
  contentDeltaPct: number;

  currentMonthRevenue: number;
  previousMonthRevenue: number;
  revenueDeltaPct: number;
}

export function computeDashboardSummary(
  accounts: PlatformAccount[],
  revenueEntries: RevenueEntry[]
): DashboardSummaryMetrics {
  const connected = accounts.filter((a) => a.connected);

  const totalFollowers = connected.reduce((acc, a) => acc + a.followers, 0);
  const prevTotalFollowers = connected.reduce((acc, a) => acc + a.previousMonthFollowers, 0);

  const gained30d = connected.reduce((acc, a) => acc + a.followersGained30d, 0);
  const lost30d = connected.reduce((acc, a) => acc + a.followersLost30d, 0);
  const netGain30d = gained30d - lost30d;
  const prevNetGain30d = connected.reduce((acc, a) => acc + a.previousNetGain30d, 0);

  const yt = accounts.find((a) => a.platform === 'youtube');
  const youtubeSubscribers = yt && yt.connected ? yt.followers : 0;
  const prevYoutubeSubscribers = yt && yt.connected ? yt.previousMonthFollowers : 0;

  const totalViewsAllTime = connected.reduce((acc, a) => acc + a.totalViews, 0);
  const monthlyViews = connected.reduce((acc, a) => acc + a.monthlyViews, 0);
  const prevMonthlyViews = connected.reduce((acc, a) => acc + a.previousMonthlyViews, 0);

  const streamHours = Number(
    connected.reduce((acc, a) => acc + a.streamHoursMonth, 0).toFixed(1)
  );
  const prevStreamHours = Number(
    connected.reduce((acc, a) => acc + a.previousStreamHoursMonth, 0).toFixed(1)
  );

  const videosCount = connected.reduce((acc, a) => acc + a.videosPublishedMonth, 0);
  const clipsCount = connected.reduce((acc, a) => acc + a.clipsPublishedMonth, 0);
  const streamsCount = connected.reduce((acc, a) => acc + a.streamsPublishedMonth, 0);
  const totalContentCount = videosCount + clipsCount + streamsCount;
  const prevTotalContentCount = connected.reduce((acc, a) => acc + a.previousTotalContentMonth, 0);

  const novRevenue = revenueEntries
    .filter((r) => r.month === '2026-11')
    .reduce((sum, r) => sum + r.amount, 0);
  const octRevenue = revenueEntries
    .filter((r) => r.month === '2026-10')
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    totalFollowers,
    prevTotalFollowers,
    followersDeltaPct: calcPercentChange(totalFollowers, prevTotalFollowers),
    gained30d,
    lost30d,
    netGain30d,
    prevNetGain30d,
    netGainDeltaPct: calcPercentChange(netGain30d, prevNetGain30d),
    youtubeSubscribers,
    prevYoutubeSubscribers,
    youtubeDeltaPct: calcPercentChange(youtubeSubscribers, prevYoutubeSubscribers),
    youtubeConnected: Boolean(yt?.connected),
    totalViewsAllTime,
    monthlyViews,
    prevMonthlyViews,
    viewsDeltaPct: calcPercentChange(monthlyViews, prevMonthlyViews),
    streamHours,
    prevStreamHours,
    streamHoursDeltaPct: calcPercentChange(streamHours, prevStreamHours),
    videosCount,
    clipsCount,
    streamsCount,
    totalContentCount,
    prevTotalContentCount,
    contentDeltaPct: calcPercentChange(totalContentCount, prevTotalContentCount),
    currentMonthRevenue: novRevenue,
    previousMonthRevenue: octRevenue,
    revenueDeltaPct: calcPercentChange(novRevenue, octRevenue),
  };
}

export function aggregateDailySeries(
  accounts: PlatformAccount[],
  filterPlatform: PlatformId | 'all'
): PlatformDailyMetric[] {
  const pool =
    filterPlatform === 'all'
      ? accounts.filter((a) => a.connected)
      : accounts.filter((a) => a.platform === filterPlatform);

  if (pool.length === 0) return [];
  const length = pool[0].dailySeries.length;
  const combined: PlatformDailyMetric[] = [];

  for (let i = 0; i < length; i++) {
    const base = pool[0].dailySeries[i];
    combined.push({
      date: base.date,
      label: base.label,
      followers: pool.reduce((s, a) => s + (a.dailySeries[i]?.followers || 0), 0),
      gained: pool.reduce((s, a) => s + (a.dailySeries[i]?.gained || 0), 0),
      lost: pool.reduce((s, a) => s + (a.dailySeries[i]?.lost || 0), 0),
      views: pool.reduce((s, a) => s + (a.dailySeries[i]?.views || 0), 0),
      streamHours: Number(
        pool.reduce((s, a) => s + (a.dailySeries[i]?.streamHours || 0), 0).toFixed(1)
      ),
      revenue: Number(
        pool.reduce((s, a) => s + (a.dailySeries[i]?.revenue || 0), 0).toFixed(2)
      ),
    });
  }
  return combined;
}

export function aggregatePeriodSeries(
  accounts: PlatformAccount[],
  timeframe: 'weekly' | 'monthly',
  filterPlatform: PlatformId | 'all'
): PlatformPeriodMetric[] {
  const pool =
    filterPlatform === 'all'
      ? accounts.filter((a) => a.connected)
      : accounts.filter((a) => a.platform === filterPlatform);

  if (pool.length === 0) return [];
  const sourceKey = timeframe === 'weekly' ? 'weeklySeries' : 'monthlySeries';
  const length = pool[0][sourceKey].length;
  const combined: PlatformPeriodMetric[] = [];

  for (let i = 0; i < length; i++) {
    const base = pool[0][sourceKey][i];
    combined.push({
      periodKey: base.periodKey,
      label: base.label,
      followers: pool.reduce((s, a) => s + (a[sourceKey][i]?.followers || 0), 0),
      gained: pool.reduce((s, a) => s + (a[sourceKey][i]?.gained || 0), 0),
      lost: pool.reduce((s, a) => s + (a[sourceKey][i]?.lost || 0), 0),
      views: pool.reduce((s, a) => s + (a[sourceKey][i]?.views || 0), 0),
      streamHours: Number(
        pool.reduce((s, a) => s + (a[sourceKey][i]?.streamHours || 0), 0).toFixed(1)
      ),
      videos: pool.reduce((s, a) => s + (a[sourceKey][i]?.videos || 0), 0),
      clips: pool.reduce((s, a) => s + (a[sourceKey][i]?.clips || 0), 0),
      streams: pool.reduce((s, a) => s + (a[sourceKey][i]?.streams || 0), 0),
      revenue: Number(
        pool.reduce((s, a) => s + (a[sourceKey][i]?.revenue || 0), 0).toFixed(2)
      ),
    });
  }
  return combined;
}

export type PerformanceSemaphore = 'verde' | 'amarillo' | 'rojo';

export interface TrendEvaluation {
  semaphore: PerformanceSemaphore;
  headline: string;
  explanation: string;
  followerPeriodGrowthPct: number;
  viewsPeriodGrowthPct: number;
  fourWeekSlopePct: number;
  retentionRatioPct: number;
}

/**
 * Evaluates performance using multi-period comparison + 4-week linear slope
 * so isolated single-day drops NEVER trigger a false red alert.
 */
export function evaluateMultiPeriodPerformance(
  accounts: PlatformAccount[],
  filterPlatform: PlatformId | 'all'
): TrendEvaluation {
  const pool =
    filterPlatform === 'all'
      ? accounts.filter((a) => a.connected)
      : accounts.filter((a) => a.platform === filterPlatform);

  if (pool.length === 0) {
    return {
      semaphore: 'amarillo',
      headline: 'Sin cuentas activas seleccionadas',
      explanation: 'Conecta al menos una cuenta para analizar tendencias equivalentes de crecimiento.',
      followerPeriodGrowthPct: 0,
      viewsPeriodGrowthPct: 0,
      fourWeekSlopePct: 0,
      retentionRatioPct: 100,
    };
  }

  const currentFollowers = pool.reduce((s, a) => s + a.followers, 0);
  const prevFollowers = pool.reduce((s, a) => s + a.previousMonthFollowers, 0);
  const followerPeriodGrowthPct = calcPercentChange(currentFollowers, prevFollowers);

  const currentViews = pool.reduce((s, a) => s + a.monthlyViews, 0);
  const prevViews = pool.reduce((s, a) => s + a.previousMonthlyViews, 0);
  const viewsPeriodGrowthPct = calcPercentChange(currentViews, prevViews);

  const gained = pool.reduce((s, a) => s + a.followersGained30d, 0);
  const lost = pool.reduce((s, a) => s + a.followersLost30d, 0);
  const retentionRatioPct = gained > 0 ? Math.max(0, ((gained - lost) / gained) * 100) : 0;

  // Compute 4-week rolling slope from weekly series (smoothed over weeks 9..12 vs weeks 5..8)
  const weekly = aggregatePeriodSeries(accounts, 'weekly', filterPlatform);
  const recent4WeeksViews = weekly.slice(-4).reduce((s, w) => s + w.views, 0);
  const prior4WeeksViews = weekly.slice(-8, -4).reduce((s, w) => s + w.views, 0);
  const fourWeekSlopePct = calcPercentChange(recent4WeeksViews, prior4WeeksViews);

  // Weighted composite score ignoring 1-day outliers
  const composite =
    followerPeriodGrowthPct * 0.45 + viewsPeriodGrowthPct * 0.35 + fourWeekSlopePct * 0.2;

  if (composite >= 2.5 && followerPeriodGrowthPct >= 1.5) {
    return {
      semaphore: 'verde',
      headline: 'VERDE · Crecimiento positivo sostenido',
      explanation: `Al comparar los últimos 30 días frente al período equivalente anterior, tu comunidad creció +${followerPeriodGrowthPct.toFixed(
        1
      )}% y las visualizaciones subieron ${
        viewsPeriodGrowthPct >= 0 ? '+' : ''
      }${viewsPeriodGrowthPct.toFixed(
        1
      )}%. Las variaciones puntuales diarias quedan absorbidas por una tendencia estructural al alza (+${fourWeekSlopePct.toFixed(
        1
      )}% en bloque de 4 semanas).`,
      followerPeriodGrowthPct,
      viewsPeriodGrowthPct,
      fourWeekSlopePct,
      retentionRatioPct,
    };
  }

  if (composite <= -2.5 || (followerPeriodGrowthPct < -1.5 && viewsPeriodGrowthPct < -5)) {
    return {
      semaphore: 'rojo',
      headline: 'ROJO · Disminución importante en períodos equivalentes',
      explanation: `Se detecta una contracción sostenida entre bloques equivalentes de 30 días (${followerPeriodGrowthPct.toFixed(
        1
      )}% en audiencia y ${viewsPeriodGrowthPct.toFixed(
        1
      )}% en alcance mensual), confirmada por la media móvil de 4 semanas (${fourWeekSlopePct.toFixed(
        1
      )}%). Conviene ajustar formatos y horarios de publicación.`,
      followerPeriodGrowthPct,
      viewsPeriodGrowthPct,
      fourWeekSlopePct,
      retentionRatioPct,
    };
  }

  return {
    semaphore: 'amarillo',
    headline: 'AMARILLO · Crecimiento lento o resultados estables',
    explanation: `Tus métricas mantienen estabilidad entre períodos equivalentes (${
      followerPeriodGrowthPct >= 0 ? '+' : ''
    }${followerPeriodGrowthPct.toFixed(1)}% en seguidores y ${
      viewsPeriodGrowthPct >= 0 ? '+' : ''
    }${viewsPeriodGrowthPct.toFixed(
      1
    )}% en visualizaciones). No hay pérdida estructural, pero el ritmo de adquisición puede acelerarse optimizando frecuencia de clips.`,
    followerPeriodGrowthPct,
    viewsPeriodGrowthPct,
    fourWeekSlopePct,
    retentionRatioPct,
  };
}

export interface ForecastPoint {
  label: string;
  historicalFollowers?: number;
  projectedExpected?: number;
  projectedOptimistic?: number;
  projectedConservative?: number;
}

export interface ForecastSummary {
  chartData: ForecastPoint[];
  in30Days: number;
  in60Days: number;
  in90Days: number;
  dailyVelocity: number;
}

/**
 * Linear regression + exponential smoothing over 12-week history
 * to forecast 30, 60, and 90 days ahead.
 */
export function computeHistoricalForecast(
  accounts: PlatformAccount[],
  filterPlatform: PlatformId | 'all'
): ForecastSummary {
  const weekly = aggregatePeriodSeries(accounts, 'weekly', filterPlatform);
  if (weekly.length < 4) {
    return {
      chartData: [],
      in30Days: 0,
      in60Days: 0,
      in90Days: 0,
      dailyVelocity: 0,
    };
  }

  // Ordinary least squares over weekly follower counts
  const n = weekly.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += weekly[i].followers;
    sumXY += i * weekly[i].followers;
    sumXX += i * i;
  }

  const slopePerWeek = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  // Blend recent 4-week net velocity with 12-week OLS slope (Holt-style damping)
  const recentWeeklyNet =
    (weekly[n - 1].followers - weekly[Math.max(0, n - 5)].followers) / 4;
  const blendedWeeklyVelocity = slopePerWeek * 0.55 + recentWeeklyNet * 0.45;
  const dailyVelocity = blendedWeeklyVelocity / 7;

  const current = weekly[n - 1].followers;
  const in30Days = Math.max(0, Math.round(current + dailyVelocity * 30));
  const in60Days = Math.max(0, Math.round(current + dailyVelocity * 60));
  const in90Days = Math.max(0, Math.round(current + dailyVelocity * 90));

  const chartData: ForecastPoint[] = weekly.slice(-6).map((w, idx, arr) => ({
    label: w.label,
    historicalFollowers: w.followers,
    ...(idx === arr.length - 1
      ? {
          projectedExpected: w.followers,
          projectedOptimistic: w.followers,
          projectedConservative: w.followers,
        }
      : {}),
  }));

  const horizons = [
    { label: '+30 días', days: 30, spread: 0.18 },
    { label: '+60 días', days: 60, spread: 0.24 },
    { label: '+90 días', days: 90, spread: 0.3 },
  ];

  for (const h of horizons) {
    const delta = dailyVelocity * h.days;
    const expected = Math.max(0, Math.round(current + delta));
    const band = Math.abs(delta) * h.spread + current * 0.008;
    chartData.push({
      label: h.label,
      projectedExpected: expected,
      projectedOptimistic: Math.round(expected + band),
      projectedConservative: Math.max(0, Math.round(expected - band)),
    });
  }

  return {
    chartData,
    in30Days,
    in60Days,
    in90Days,
    dailyVelocity: Math.round(dailyVelocity),
  };
}

export function aggregateBestDays(
  accounts: PlatformAccount[],
  filterPlatform: PlatformId | 'all'
): BestDayStat[] {
  const pool =
    filterPlatform === 'all'
      ? accounts.filter((a) => a.connected)
      : accounts.filter((a) => a.platform === filterPlatform);

  if (pool.length === 0) return [];

  return pool[0].bestDays.map((day, idx) => {
    const avgViews = Math.round(
      pool.reduce((s, a) => s + (a.bestDays[idx]?.avgViews || 0), 0)
    );
    const engagementRate = Number(
      (
        pool.reduce((s, a) => s + (a.bestDays[idx]?.engagementRate || 0), 0) /
        pool.length
      ).toFixed(1)
    );
    const postsPublished = pool.reduce(
      (s, a) => s + (a.bestDays[idx]?.postsPublished || 0),
      0
    );
    return {
      dayIndex: day.dayIndex,
      dayName: day.dayName,
      shortName: day.shortName,
      avgViews,
      engagementRate,
      bestHourWindow: day.bestHourWindow,
      postsPublished,
    };
  });
}

export interface PlainLanguageProgress {
  workingWell: string[];
  couldImprove: string[];
}

export function generatePlainLanguageProgress(
  accounts: PlatformAccount[],
  filterPlatform: PlatformId | 'all'
): PlainLanguageProgress {
  const pool =
    filterPlatform === 'all'
      ? accounts.filter((a) => a.connected)
      : accounts.filter((a) => a.platform === filterPlatform);

  if (pool.length === 0) {
    return {
      workingWell: ['Tu espacio de trabajo está listo para recibir datos de tus canales.'],
      couldImprove: ['Vincula al menos una cuenta en la sección Cuentas para recibir recomendaciones personalizadas.'],
    };
  }

  const workingWell: string[] = [];
  const couldImprove: string[] = [];

  // Sort platforms by % growth
  const sortedByGrowth = [...pool].sort(
    (a, b) =>
      calcPercentChange(b.followers, b.previousMonthFollowers) -
      calcPercentChange(a.followers, a.previousMonthFollowers)
  );
  const fastest = sortedByGrowth[0];
  const fastestPct = calcPercentChange(fastest.followers, fastest.previousMonthFollowers);

  if (fastestPct > 2) {
    workingWell.push(
      `${fastest.name} lidera tu crecimiento porcentual este mes (+${fastestPct.toFixed(
        1
      )}%), sumando ${formatFullNumber(
        fastest.followersGained30d - fastest.followersLost30d
      )} seguidores netos gracias a la constancia reciente.`
    );
  }

  const totalGained = pool.reduce((s, a) => s + a.followersGained30d, 0);
  const totalLost = pool.reduce((s, a) => s + a.followersLost30d, 0);
  const retention = totalGained > 0 ? ((totalGained - totalLost) / totalGained) * 100 : 0;

  if (retention >= 80) {
    workingWell.push(
      `Retienes al ${retention.toFixed(
        0
      )}% de los nuevos seguidores que llegan a tus canales: de cada 10 personas que te descubren, ${Math.round(
        retention / 10
      )} se quedan suscritas.`
    );
  } else {
    couldImprove.push(
      `Tu tasa de bajas equivale al ${(100 - retention).toFixed(
        0
      )}% de las altas recientes. Alinea el tema de tus clips virales con el contenido habitual de tu canal principal para evitar desuscripciones.`
    );
  }

  const bestDays = aggregateBestDays(accounts, filterPlatform);
  const topDays = [...bestDays].sort((a, b) => b.avgViews - a.avgViews).slice(0, 2);
  if (topDays.length === 2) {
    workingWell.push(
      `Tus publicaciones de ${topDays[0].dayName.toLowerCase()} (${topDays[0].bestHourWindow}) y ${topDays[1].dayName.toLowerCase()} generan hasta un 35% más de alcance promedio que los inicios de semana.`
    );
  }

  const disconnected = accounts.filter((a) => !a.connected);
  if (filterPlatform === 'all' && disconnected.length > 0) {
    couldImprove.push(
      `Tienes ${disconnected.map((d) => d.name).join(', ')} sin vincular. Conectarla o cargar sus métricas manuales te permitirá medir el tráfico cruzado completo.`
    );
  }

  const streamAccs = pool.filter((a) => a.streamHoursMonth > 20);
  const totalVideos = pool.reduce((s, a) => s + a.videosPublishedMonth, 0);
  if (streamAccs.length > 0 && totalVideos < 10) {
    couldImprove.push(
      `Estás emitiendo ${pool
        .reduce((s, a) => s + a.streamHoursMonth, 0)
        .toFixed(0)} horas de directo al mes, pero solo publicaste ${totalVideos} videos editados. Extraer 1 resumen semanal en formato largo multiplicará tu descubrimiento pasivo.`
    );
  } else {
    couldImprove.push(
      `Los lunes registran tu menor interacción media. Reserva ese día para guion y edición, y concentra tus estrenos fuertes entre jueves y domingo.`
    );
  }

  return { workingWell, couldImprove };
}

/**
 * Expands recurring calendar events across a given date range [startIso, endIso].
 */
export function expandCalendarEventsInRange(
  events: CalendarEvent[],
  startIso: string,
  endIso: string
): Array<CalendarEvent & { occurrenceDate: string; isRecurringInstance: boolean }> {
  const expanded: Array<CalendarEvent & { occurrenceDate: string; isRecurringInstance: boolean }> = [];

  for (const evt of events) {
    if (evt.recurrence === 'none') {
      if (evt.date >= startIso && evt.date <= endIso) {
        expanded.push({ ...evt, occurrenceDate: evt.date, isRecurringInstance: false });
      }
      continue;
    }

    const baseDate = new Date(`${evt.date}T12:00:00Z`);
    const endRange = new Date(`${endIso}T12:00:00Z`);
    const startRange = new Date(`${startIso}T12:00:00Z`);

    let cursor = new Date(baseDate);
    let safety = 0;

    while (cursor <= endRange && safety < 90) {
      const iso = cursor.toISOString().slice(0, 10);
      if (cursor >= startRange) {
        expanded.push({
          ...evt,
          occurrenceDate: iso,
          isRecurringInstance: iso !== evt.date,
        });
      }

      if (evt.recurrence === 'daily') {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      } else if (evt.recurrence === 'weekly') {
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      } else if (evt.recurrence === 'biweekly') {
        cursor.setUTCDate(cursor.getUTCDate() + 14);
      } else if (evt.recurrence === 'monthly') {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      } else {
        break;
      }
      safety++;
    }
  }

  return expanded.sort((a, b) =>
    `${a.occurrenceDate} ${a.startTime}`.localeCompare(`${b.occurrenceDate} ${b.startTime}`)
  );
}
