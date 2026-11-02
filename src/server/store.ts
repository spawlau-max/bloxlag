import type {
  BestDayStat,
  CalendarEvent,
  FollowerGoal,
  PlatformAccount,
  PlatformDailyMetric,
  PlatformId,
  PlatformPeriodMetric,
  RevenueEntry,
  WorkspaceState,
} from '../types.ts';

function generateDailySeries(
  baseFollowers: number,
  dailyAvgGain: number,
  dailyAvgLoss: number,
  dailyAvgViews: number,
  dailyStreamHours: number,
  dailyRevenue: number,
  seedOffset: number
): PlatformDailyMetric[] {
  const result: PlatformDailyMetric[] = [];
  // Generate 30 days ending on 2026-11-02
  const endDate = new Date('2026-11-02T12:00:00Z');
  let runningFollowers = baseFollowers - (dailyAvgGain - dailyAvgLoss) * 30;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(endDate);
    d.setUTCDate(endDate.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayNum = d.getUTCDate();
    const monthShort = d.toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' });

    const wave = Math.sin((i + seedOffset) * 0.65) * 0.28 + Math.cos((i + seedOffset) * 1.2) * 0.14;
    const weekendBoost = d.getUTCDay() === 0 || d.getUTCDay() === 5 || d.getUTCDay() === 6 ? 1.22 : 0.94;

    // Realistic isolated dip on day i === 11 so trend analyzer proves it ignores 1-day dips
    const isolatedDip = i === 11 ? 0.55 : 1;

    const gained = Math.max(8, Math.round(dailyAvgGain * (1 + wave) * weekendBoost * isolatedDip));
    const lost = Math.max(2, Math.round(dailyAvgLoss * (1 + Math.abs(wave) * 0.5)));
    runningFollowers += gained - lost;

    const views = Math.max(150, Math.round(dailyAvgViews * (1 + wave * 1.1) * weekendBoost * isolatedDip));
    const streamHours =
      dailyStreamHours > 0
        ? Number(Math.max(0, dailyStreamHours * (d.getUTCDay() === 1 ? 0 : weekendBoost)).toFixed(1))
        : 0;
    const revenue = Number(Math.max(0, dailyRevenue * (1 + wave * 0.8) * weekendBoost).toFixed(2));

    result.push({
      date: iso,
      label: `${dayNum} ${monthShort.replace('.', '')}`,
      followers: i === 0 ? baseFollowers : Math.round(runningFollowers),
      gained,
      lost,
      views,
      streamHours,
      revenue,
    });
  }
  return result;
}

function generateWeeklySeries(
  currentFollowers: number,
  weeklyGain: number,
  weeklyLoss: number,
  weeklyViews: number,
  weeklyStreamHours: number,
  weeklyVideos: number,
  weeklyClips: number,
  weeklyStreams: number,
  weeklyRevenue: number,
  growthTrendFactor: number
): PlatformPeriodMetric[] {
  const series: PlatformPeriodMetric[] = [];
  let followersCursor = currentFollowers;
  const tempReversed: PlatformPeriodMetric[] = [];

  for (let w = 0; w < 12; w++) {
    const scale = Math.pow(growthTrendFactor, -w);
    const seasonal = 1 + Math.sin(w * 0.8) * 0.08;
    const gained = Math.max(25, Math.round(weeklyGain * scale * seasonal));
    const lost = Math.max(8, Math.round(weeklyLoss * (0.95 + (w % 3) * 0.06)));
    const views = Math.round(weeklyViews * scale * seasonal);
    const streamHours = Number((weeklyStreamHours * (0.92 + (w % 4) * 0.05)).toFixed(1));
    const revenue = Number((weeklyRevenue * scale * seasonal).toFixed(2));

    tempReversed.push({
      periodKey: `S${12 - w}`,
      label: `Sem ${12 - w}`,
      followers: Math.round(followersCursor),
      gained,
      lost,
      views,
      streamHours,
      videos: Math.max(0, Math.round(weeklyVideos * (w % 2 === 0 ? 1 : 0.8))),
      clips: Math.max(1, Math.round(weeklyClips * seasonal)),
      streams: Math.max(0, Math.round(weeklyStreams)),
      revenue,
    });

    followersCursor -= gained - lost;
  }

  series.push(...tempReversed.reverse());
  return series;
}

function generateMonthlySeries(
  currentFollowers: number,
  monthlyGain: number,
  monthlyLoss: number,
  monthlyViews: number,
  monthlyStreamHours: number,
  monthlyVideos: number,
  monthlyClips: number,
  monthlyStreams: number,
  monthlyRevenue: number,
  growthTrendFactor: number
): PlatformPeriodMetric[] {
  const monthLabels = [
    { key: '2025-12', label: 'Dic 25' },
    { key: '2026-01', label: 'Ene 26' },
    { key: '2026-02', label: 'Feb 26' },
    { key: '2026-03', label: 'Mar 26' },
    { key: '2026-04', label: 'Abr 26' },
    { key: '2026-05', label: 'May 26' },
    { key: '2026-06', label: 'Jun 26' },
    { key: '2026-07', label: 'Jul 26' },
    { key: '2026-08', label: 'Ago 26' },
    { key: '2026-09', label: 'Sep 26' },
    { key: '2026-10', label: 'Oct 26' },
    { key: '2026-11', label: 'Nov 26' },
  ];

  let followersCursor = currentFollowers;
  const reversed: PlatformPeriodMetric[] = [];

  for (let m = 0; m < 12; m++) {
    const idx = 11 - m;
    const scale = Math.pow(growthTrendFactor, -m);
    const seasonal = idx === 0 ? 1.08 : 1 + Math.cos(m * 0.7) * 0.06;
    const gained = Math.max(100, Math.round(monthlyGain * scale * seasonal));
    const lost = Math.max(30, Math.round(monthlyLoss * (0.94 + (m % 3) * 0.05)));

    reversed.push({
      periodKey: monthLabels[idx].key,
      label: monthLabels[idx].label,
      followers: Math.round(followersCursor),
      gained,
      lost,
      views: Math.round(monthlyViews * scale * seasonal),
      streamHours: Number((monthlyStreamHours * (0.9 + (m % 4) * 0.06)).toFixed(1)),
      videos: Math.max(1, Math.round(monthlyVideos * (0.9 + (m % 3) * 0.1))),
      clips: Math.max(2, Math.round(monthlyClips * scale)),
      streams: Math.max(0, Math.round(monthlyStreams * (0.92 + (m % 2) * 0.1))),
      revenue: Number((monthlyRevenue * scale * seasonal).toFixed(2)),
    });

    followersCursor -= gained - lost;
  }

  return reversed.reverse();
}

function buildBestDays(peakDay1: number, peakDay2: number, baseViews: number): BestDayStat[] {
  const days = [
    { name: 'Lunes', short: 'Lun', window: '19:00 - 21:00' },
    { name: 'Martes', short: 'Mar', window: '18:30 - 20:30' },
    { name: 'Miércoles', short: 'Mié', window: '20:00 - 22:00' },
    { name: 'Jueves', short: 'Jue', window: '19:30 - 22:00' },
    { name: 'Viernes', short: 'Vie', window: '20:30 - 23:30' },
    { name: 'Sábado', short: 'Sáb', window: '17:00 - 20:30' },
    { name: 'Domingo', short: 'Dom', window: '18:00 - 21:30' },
  ];

  return days.map((d, index) => {
    const mult = index === peakDay1 ? 1.42 : index === peakDay2 ? 1.28 : index === 0 ? 0.78 : 0.96;
    return {
      dayIndex: index,
      dayName: d.name,
      shortName: d.short,
      avgViews: Math.round(baseViews * mult),
      engagementRate: Number((5.4 * mult).toFixed(1)),
      bestHourWindow: d.window,
      postsPublished: index === peakDay1 || index === peakDay2 ? 9 : 5,
    };
  });
}

export function createInitialWorkspaceState(): WorkspaceState {
  const hasYtEnv = Boolean(process.env.YOUTUBE_CLIENT_ID || process.env.YOUTUBE_API_KEY);
  const hasTwitchEnv = Boolean(process.env.TWITCH_CLIENT_ID);
  const hasKickEnv = Boolean(process.env.KICK_CLIENT_ID);
  const hasTiktokEnv = Boolean(process.env.TIKTOK_CLIENT_KEY);
  const hasIgEnv = Boolean(process.env.INSTAGRAM_APP_ID);

  const accounts: PlatformAccount[] = [
    {
      platform: 'youtube',
      name: 'YouTube',
      username: '@AlexRiveraTech',
      connected: true,
      connectionMethod: hasYtEnv ? 'oauth_api' : 'manual_verified',
      followers: 184500,
      previousMonthFollowers: 176200,
      followersGained30d: 9680,
      followersLost30d: 1380,
      previousNetGain30d: 7150,
      totalViews: 14820000,
      monthlyViews: 1145000,
      previousMonthlyViews: 982000,
      streamHoursMonth: 18.5,
      previousStreamHoursMonth: 14.0,
      videosPublishedMonth: 8,
      clipsPublishedMonth: 16,
      streamsPublishedMonth: 4,
      previousTotalContentMonth: 24,
      estimatedMonthlyRevenue: 2840,
      previousMonthlyRevenue: 2490,
      lastSyncedAt: '2026-11-02T13:50:00Z',
      apiCapabilities: {
        officialApiName: 'YouTube Data API v3 & YouTube Analytics API',
        authProtocol: 'Google OAuth 2.0 (yt-analytics.readonly, youtube.upload)',
        oauthConfiguredOnServer: hasYtEnv,
        supportsPublicLookup: Boolean(process.env.YOUTUBE_API_KEY),
        supportsRevenueSync: hasYtEnv,
        supportsDirectScheduling: hasYtEnv,
        limitationSummary: hasYtEnv
          ? 'API oficial activa para métricas de canal y programación de videos.'
          : 'Credenciales OAuth de Google Cloud no configuradas en servidor. Suscriptores, retención e ingresos AdSense operan en modo verificado manual.',
        manualFallbackExplanation:
          'YouTube exige verificación de aplicación OAuth 2.0 para leer ingresos de AdSense (yt-analytics-monetary.readonly). Puedes introducir o ajustar tus estadísticas manualmente en cualquier momento.',
      },
      dailySeries: generateDailySeries(184500, 322, 46, 38160, 0.6, 94.6, 1),
      weeklySeries: generateWeeklySeries(184500, 2240, 320, 268000, 4.5, 2, 4, 1, 665, 1.038),
      monthlySeries: generateMonthlySeries(184500, 9680, 1380, 1145000, 18.5, 8, 16, 4, 2840, 1.048),
      bestDays: buildBestDays(3, 6, 46200),
    },
    {
      platform: 'twitch',
      name: 'Twitch',
      username: 'alexrivera_live',
      connected: true,
      connectionMethod: hasTwitchEnv ? 'oauth_api' : 'manual_verified',
      followers: 68400,
      previousMonthFollowers: 65100,
      followersGained30d: 4120,
      followersLost30d: 820,
      previousNetGain30d: 2940,
      totalViews: 3940000,
      monthlyViews: 312000,
      previousMonthlyViews: 289000,
      streamHoursMonth: 86.0,
      previousStreamHoursMonth: 79.5,
      videosPublishedMonth: 2,
      clipsPublishedMonth: 19,
      streamsPublishedMonth: 18,
      previousTotalContentMonth: 35,
      estimatedMonthlyRevenue: 1920,
      previousMonthlyRevenue: 1765,
      lastSyncedAt: '2026-11-02T13:45:00Z',
      apiCapabilities: {
        officialApiName: 'Twitch Helix API',
        authProtocol: 'Twitch OAuth 2.0 (channel:read:subscriptions, bits:read)',
        oauthConfiguredOnServer: hasTwitchEnv,
        supportsPublicLookup: false,
        supportsRevenueSync: hasTwitchEnv,
        supportsDirectScheduling: false,
        limitationSummary:
          'Twitch Helix no permite publicar directos automáticamente; permite gestionar agenda de stream y requiere alcances de afiliado/partner para ingresos de subs y anuncios.',
        manualFallbackExplanation:
          'Las horas exactas de emisión y pagos por anuncios requieren token de creador o carga manual desde tu panel de creador de Twitch.',
      },
      dailySeries: generateDailySeries(68400, 137, 27, 10400, 2.85, 64.0, 3),
      weeklySeries: generateWeeklySeries(68400, 960, 190, 74500, 20.5, 0.5, 5, 4.5, 455, 1.029),
      monthlySeries: generateMonthlySeries(68400, 4120, 820, 312000, 86.0, 2, 19, 18, 1920, 1.036),
      bestDays: buildBestDays(4, 5, 15800),
    },
    {
      platform: 'kick',
      name: 'Kick',
      username: 'alexrivera',
      connected: true,
      connectionMethod: hasKickEnv ? 'oauth_api' : 'public_api',
      followers: 29800,
      previousMonthFollowers: 26400,
      followersGained30d: 3890,
      followersLost30d: 490,
      previousNetGain30d: 2610,
      totalViews: 1180000,
      monthlyViews: 174000,
      previousMonthlyViews: 141000,
      streamHoursMonth: 44.5,
      previousStreamHoursMonth: 38.0,
      videosPublishedMonth: 0,
      clipsPublishedMonth: 14,
      streamsPublishedMonth: 12,
      previousTotalContentMonth: 21,
      estimatedMonthlyRevenue: 1180,
      previousMonthlyRevenue: 940,
      lastSyncedAt: '2026-11-02T14:02:00Z',
      apiCapabilities: {
        officialApiName: 'Kick Public Developer API v2',
        authProtocol: 'OAuth 2.1 PKCE + Endpoint público de canal',
        oauthConfiguredOnServer: hasKickEnv,
        supportsPublicLookup: true,
        supportsRevenueSync: false,
        supportsDirectScheduling: false,
        limitationSummary:
          'La API oficial de Kick aún no expone endpoints públicos para liquidaciones del programa KCIP ni programación automática de directos.',
        manualFallbackExplanation:
          'Se consultan datos públicos del canal cuando están accesibles; ingresos 95/5, pagos KCIP y bajas de seguidores se gestionan con registro manual asistido.',
      },
      dailySeries: generateDailySeries(29800, 130, 16, 5800, 1.5, 39.3, 5),
      weeklySeries: generateWeeklySeries(29800, 910, 115, 41200, 10.8, 0, 3.5, 3, 282, 1.052),
      monthlySeries: generateMonthlySeries(29800, 3890, 490, 174000, 44.5, 0, 14, 12, 1180, 1.064),
      bestDays: buildBestDays(5, 6, 8900),
    },
    {
      platform: 'tiktok',
      name: 'TikTok',
      username: '@alexriveraclips',
      connected: true,
      connectionMethod: hasTiktokEnv ? 'oauth_api' : 'manual_verified',
      followers: 312000,
      previousMonthFollowers: 294500,
      followersGained30d: 21400,
      followersLost30d: 3900,
      previousNetGain30d: 14800,
      totalViews: 28400000,
      monthlyViews: 2680000,
      previousMonthlyViews: 2290000,
      streamHoursMonth: 6.0,
      previousStreamHoursMonth: 8.5,
      videosPublishedMonth: 0,
      clipsPublishedMonth: 28,
      streamsPublishedMonth: 3,
      previousTotalContentMonth: 27,
      estimatedMonthlyRevenue: 790,
      previousMonthlyRevenue: 685,
      lastSyncedAt: '2026-11-02T12:30:00Z',
      apiCapabilities: {
        officialApiName: 'TikTok Display API & Content Posting API v2',
        authProtocol: 'TikTok Login Kit OAuth 2.0 (user.info.stats, video.publish)',
        oauthConfiguredOnServer: hasTiktokEnv,
        supportsPublicLookup: false,
        supportsRevenueSync: false,
        supportsDirectScheduling: hasTiktokEnv,
        limitationSummary:
          'TikTok no ofrece API oficial para consultar pagos del Creator Rewards Program ni bajas exactas diarias sin auditoría corporativa.',
        manualFallbackExplanation:
          'Puedes registrar tus métricas de TikTok Studio y pagos del fondo Creator Rewards manualmente para mantener tu analítica unificada.',
      },
      dailySeries: generateDailySeries(312000, 713, 130, 89300, 0.2, 26.3, 7),
      weeklySeries: generateWeeklySeries(312000, 4980, 910, 625000, 1.5, 0, 7, 0.8, 188, 1.034),
      monthlySeries: generateMonthlySeries(312000, 21400, 3900, 2680000, 6.0, 0, 28, 3, 790, 1.044),
      bestDays: buildBestDays(2, 4, 96500),
    },
    {
      platform: 'instagram',
      name: 'Instagram',
      username: '@alexrivera.oficial',
      connected: false,
      connectionMethod: 'disconnected',
      followers: 94200,
      previousMonthFollowers: 93800,
      followersGained30d: 1420,
      followersLost30d: 1020,
      previousNetGain30d: 980,
      totalViews: 6120000,
      monthlyViews: 410000,
      previousMonthlyViews: 438000,
      streamHoursMonth: 0,
      previousStreamHoursMonth: 0,
      videosPublishedMonth: 0,
      clipsPublishedMonth: 11,
      streamsPublishedMonth: 0,
      previousTotalContentMonth: 14,
      estimatedMonthlyRevenue: 320,
      previousMonthlyRevenue: 360,
      lastSyncedAt: null,
      apiCapabilities: {
        officialApiName: 'Instagram Graph API (Meta for Creators)',
        authProtocol: 'Meta OAuth 2.0 (instagram_basic, instagram_manage_insights)',
        oauthConfiguredOnServer: hasIgEnv,
        supportsPublicLookup: false,
        supportsRevenueSync: false,
        supportsDirectScheduling: hasIgEnv,
        limitationSummary:
          'Exige cuenta Profesional (Creador o Empresa) vinculada a una Página de Facebook. Cuentas personales no tienen acceso a Insights ni publicación por API.',
        manualFallbackExplanation:
          'Conecta tu cuenta Profesional vía Meta Graph API si está configurada o activa la vinculación manual introduciendo tus métricas de Instagram Insights.',
      },
      dailySeries: generateDailySeries(94200, 47, 34, 13660, 0, 10.6, 9),
      weeklySeries: generateWeeklySeries(94200, 330, 238, 96000, 0, 0, 3, 0, 76, 1.004),
      monthlySeries: generateMonthlySeries(94200, 1420, 1020, 410000, 0, 0, 11, 0, 320, 1.005),
      bestDays: buildBestDays(1, 6, 18400),
    },
  ];

  const goals: FollowerGoal[] = [
    {
      id: 'goal-all-750k',
      platform: 'all',
      title: 'Comunidad Multicanal 700K',
      targetFollowers: 700000,
      deadline: '2027-02-28',
      createdAt: '2026-09-01',
    },
    {
      id: 'goal-yt-200k',
      platform: 'youtube',
      title: 'Rumbo a 200K Suscriptores en YouTube',
      targetFollowers: 200000,
      deadline: '2027-01-15',
      createdAt: '2026-09-15',
    },
    {
      id: 'goal-twitch-75k',
      platform: 'twitch',
      title: 'Partner Plus 75K en Twitch',
      targetFollowers: 75000,
      deadline: '2027-01-31',
      createdAt: '2026-10-01',
    },
    {
      id: 'goal-kick-40k',
      platform: 'kick',
      title: 'Consolidar 40K seguidores en Kick',
      targetFollowers: 40000,
      deadline: '2027-02-15',
      createdAt: '2026-10-10',
    },
  ];

  // Anchored around 2026-11-02 (Current local date in metadata)
  const calendarEvents: CalendarEvent[] = [
    {
      id: 'evt-1',
      title: 'Directo Especial: Análisis de Setup 2027 + Q&A con Subs',
      description: 'Transmisión simultánea revisando equipos de estudio de la comunidad y pruebas de audio en vivo.',
      date: '2026-11-02',
      startTime: '19:30',
      durationMinutes: 180,
      platforms: ['twitch', 'kick'],
      contentType: 'stream',
      status: 'programado',
      reminderMinutes: 60,
      recurrence: 'weekly',
      requiresManualPublish: true,
      manualPublishReason: 'Twitch y Kick requieren iniciar emisión desde OBS Studio; recordatorio automático activado.',
    },
    {
      id: 'evt-2',
      title: 'Video Principal: Cómo tripliqué mi retención en los primeros 30 segundos',
      description: 'Estudio práctico con gráficas reales de YouTube Studio, edición dinámica y plantilla descargable.',
      date: '2026-11-03',
      startTime: '18:00',
      durationMinutes: 45,
      platforms: ['youtube'],
      contentType: 'video',
      status: 'preparado',
      reminderMinutes: 60,
      recurrence: 'none',
      requiresManualPublish: !hasYtEnv,
      manualPublishReason: !hasYtEnv
        ? 'Publicación programada con recordatorio manual (OAuth de subida no activo en servidor).'
        : undefined,
    },
    {
      id: 'evt-3',
      title: 'Pack de 3 Clips Verticales: Mejores momentos del directo del viernes',
      description: 'Recortes verticales 9:16 con subtítulos dinámicos listos para publicar en hora pico.',
      date: '2026-11-03',
      startTime: '20:30',
      durationMinutes: 15,
      platforms: ['tiktok', 'instagram', 'youtube'],
      contentType: 'clip',
      status: 'programado',
      reminderMinutes: 15,
      recurrence: 'none',
      requiresManualPublish: true,
      manualPublishReason: 'Instagram Reels requiere confirmación manual desde la app o cuenta Graph API activa.',
    },
    {
      id: 'evt-4',
      title: 'Maratón Gaming & Reacción a Lanzamientos de Noviembre',
      description: 'Cobertura en vivo con drops activados y dinámica con el chat.',
      date: '2026-11-05',
      startTime: '20:00',
      durationMinutes: 210,
      platforms: ['twitch', 'kick', 'youtube'],
      contentType: 'stream',
      status: 'preparado',
      reminderMinutes: 60,
      recurrence: 'weekly',
      requiresManualPublish: true,
      manualPublishReason: 'Multistream requiere verificación de clave RTMP antes de salir en vivo.',
    },
    {
      id: 'evt-5',
      title: 'Comparativa Honesta: Micrófonos XLR vs USB para Streamers en 2026',
      description: 'Guion técnico terminado, falta grabar pruebas ciegas de ruido de fondo.',
      date: '2026-11-07',
      startTime: '17:30',
      durationMinutes: 30,
      platforms: ['youtube'],
      contentType: 'video',
      status: 'idea',
      reminderMinutes: 1440,
      recurrence: 'none',
      requiresManualPublish: !hasYtEnv,
    },
    {
      id: 'evt-6',
      title: 'Resumen Octubre: Cuánto paga cada plataforma con números reales',
      description: 'Video publicado al cierre de mes con excelente CTR (9.4%).',
      date: '2026-11-01',
      startTime: '18:00',
      durationMinutes: 20,
      platforms: ['youtube', 'tiktok'],
      contentType: 'video',
      status: 'publicado',
      reminderMinutes: null,
      recurrence: 'none',
      requiresManualPublish: false,
    },
    {
      id: 'evt-7',
      title: 'Carrusel Detrás de Cámaras + Encuesta de Temas Semanales',
      description: '5 fotografías del estudio renovado para activar comentarios de la audiencia.',
      date: '2026-11-08',
      startTime: '18:30',
      durationMinutes: 20,
      platforms: ['instagram', 'tiktok'],
      contentType: 'post',
      status: 'preparado',
      reminderMinutes: 60,
      recurrence: 'biweekly',
      requiresManualPublish: true,
      manualPublishReason: 'Carruseles interactivos con stickers de encuesta requieren publicación manual.',
    },
  ];

  const revenueEntries: RevenueEntry[] = [
    // Noviembre 2026 (Current Month)
    {
      id: 'rev-nov-1',
      date: '2026-11-01',
      month: '2026-11',
      sourceType: 'youtube',
      subCategory: 'AdSense, YouTube Premium y Miembros',
      title: 'Liquidación estimada YouTube Partner (Noviembre)',
      amount: 2840,
      status: 'pendiente',
      notes: 'RPM medio de $4.85 en tecnología y creación de contenido',
    },
    {
      id: 'rev-nov-2',
      date: '2026-11-01',
      month: '2026-11',
      sourceType: 'twitch',
      subCategory: 'Suscripciones (Tier 1/Prime), Bits y Anuncios',
      title: 'Ingresos de Suscripciones + Ads Incentive Program',
      amount: 1920,
      status: 'pendiente',
      notes: '612 suscriptores activos + bloque publicitario automatizado',
    },
    {
      id: 'rev-nov-3',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'kick',
      subCategory: 'Reparto 95/5 Suscripciones + Programa KCIP',
      title: 'Pago semanal acumulado Kick Creator Program',
      amount: 1180,
      status: 'cobrado',
      notes: 'Cobro procesado vía Stripe Connect',
    },
    {
      id: 'rev-nov-4',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'tiktok',
      subCategory: 'Creator Rewards Program + Regalos LIVE',
      title: 'Recompensas de videos > 1 minuto calificados',
      amount: 790,
      status: 'pendiente',
      notes: '1.9M de visualizaciones elegibles en el ciclo actual',
    },
    {
      id: 'rev-nov-5',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'instagram',
      subCategory: 'Suscripciones de Canal y Bonos Reels',
      title: 'Suscriptores exclusivos Instagram Broadcast',
      amount: 320,
      status: 'cobrado',
    },
    {
      id: 'rev-nov-6',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'sponsorships',
      subCategory: 'Mención integrada 60s + Fijado en descripción',
      title: 'Patrocinio Elgato Audio — Integración YouTube + Directo',
      amount: 2600,
      status: 'cobrado',
      notes: 'Factura #2026-044 pagada por transferencia',
    },
    {
      id: 'rev-nov-7',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'donations',
      subCategory: 'StreamElements, Super Chat y Ko-fi',
      title: 'Donaciones directas de la comunidad en directos',
      amount: 465,
      status: 'cobrado',
    },
    {
      id: 'rev-nov-8',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'affiliates',
      subCategory: 'Amazon Influencer + Enlaces de Setup',
      title: 'Comisiones de afiliados de hardware recomendado',
      amount: 835,
      status: 'pendiente',
      notes: 'Conversión del 4.6% en enlaces de cámaras e iluminación',
    },
    {
      id: 'rev-nov-9',
      date: '2026-11-02',
      month: '2026-11',
      sourceType: 'other',
      subCategory: 'Packs de LUTs, Presets OBS y Asesorías',
      title: 'Ventas digitales tienda propia de creador',
      amount: 540,
      status: 'cobrado',
    },

    // Octubre 2026 (Previous Month for accurate MoM comparison)
    {
      id: 'rev-oct-1',
      date: '2026-10-28',
      month: '2026-10',
      sourceType: 'youtube',
      subCategory: 'AdSense y Miembros',
      title: 'Liquidación YouTube Partner (Octubre)',
      amount: 2490,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-2',
      date: '2026-10-28',
      month: '2026-10',
      sourceType: 'twitch',
      subCategory: 'Suscripciones y Anuncios',
      title: 'Liquidación Twitch Payout (Octubre)',
      amount: 1765,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-3',
      date: '2026-10-27',
      month: '2026-10',
      sourceType: 'kick',
      subCategory: 'Suscripciones + KCIP',
      title: 'Liquidación Kick Octubre',
      amount: 940,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-4',
      date: '2026-10-26',
      month: '2026-10',
      sourceType: 'tiktok',
      subCategory: 'Creator Rewards',
      title: 'Liquidación TikTok Octubre',
      amount: 685,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-5',
      date: '2026-10-25',
      month: '2026-10',
      sourceType: 'instagram',
      subCategory: 'Suscripciones IG',
      title: 'Ingresos Instagram Octubre',
      amount: 360,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-6',
      date: '2026-10-19',
      month: '2026-10',
      sourceType: 'sponsorships',
      subCategory: 'Campaña dedicada',
      title: 'Patrocinio NordVPN — Integración Octubre',
      amount: 2100,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-7',
      date: '2026-10-29',
      month: '2026-10',
      sourceType: 'donations',
      subCategory: 'StreamElements y SuperThanks',
      title: 'Donaciones Octubre',
      amount: 410,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-8',
      date: '2026-10-30',
      month: '2026-10',
      sourceType: 'affiliates',
      subCategory: 'Amazon Afiliados',
      title: 'Comisiones Afiliados Octubre',
      amount: 720,
      status: 'cobrado',
    },
    {
      id: 'rev-oct-9',
      date: '2026-10-30',
      month: '2026-10',
      sourceType: 'other',
      subCategory: 'Presets y Plantillas',
      title: 'Tienda Digital Octubre',
      amount: 480,
      status: 'cobrado',
    },

    // Historical Months (Jun - Sep 2026) for 6-month financial charts
    { id: 'rev-sep-1', date: '2026-09-28', month: '2026-09', sourceType: 'youtube', subCategory: 'AdSense', title: 'YouTube Septiembre', amount: 2310, status: 'cobrado' },
    { id: 'rev-sep-2', date: '2026-09-28', month: '2026-09', sourceType: 'twitch', subCategory: 'Subs y Ads', title: 'Twitch Septiembre', amount: 1680, status: 'cobrado' },
    { id: 'rev-sep-3', date: '2026-09-28', month: '2026-09', sourceType: 'kick', subCategory: 'KCIP', title: 'Kick Septiembre', amount: 860, status: 'cobrado' },
    { id: 'rev-sep-4', date: '2026-09-20', month: '2026-09', sourceType: 'sponsorships', subCategory: 'Brand Deal', title: 'Patrocinio Opera GX', amount: 1850, status: 'cobrado' },
    { id: 'rev-sep-5', date: '2026-09-29', month: '2026-09', sourceType: 'affiliates', subCategory: 'Afiliados', title: 'Afiliados + Donaciones + TikTok Sep', amount: 1690, status: 'cobrado' },

    { id: 'rev-aug-1', date: '2026-08-28', month: '2026-08', sourceType: 'youtube', subCategory: 'AdSense', title: 'YouTube Agosto', amount: 2190, status: 'cobrado' },
    { id: 'rev-aug-2', date: '2026-08-28', month: '2026-08', sourceType: 'twitch', subCategory: 'Subs y Ads', title: 'Twitch Agosto', amount: 1590, status: 'cobrado' },
    { id: 'rev-aug-3', date: '2026-08-28', month: '2026-08', sourceType: 'kick', subCategory: 'KCIP', title: 'Kick Agosto', amount: 790, status: 'cobrado' },
    { id: 'rev-aug-4', date: '2026-08-18', month: '2026-08', sourceType: 'sponsorships', subCategory: 'Brand Deal', title: 'Patrocinio Logitech G', amount: 2200, status: 'cobrado' },
    { id: 'rev-aug-5', date: '2026-08-29', month: '2026-08', sourceType: 'affiliates', subCategory: 'Afiliados y Otros', title: 'Afiliados + TikTok + Donaciones Ago', amount: 1520, status: 'cobrado' },

    { id: 'rev-jul-1', date: '2026-07-28', month: '2026-07', sourceType: 'youtube', subCategory: 'AdSense', title: 'YouTube Julio', amount: 2050, status: 'cobrado' },
    { id: 'rev-jul-2', date: '2026-07-28', month: '2026-07', sourceType: 'twitch', subCategory: 'Subs y Ads', title: 'Twitch Julio', amount: 1520, status: 'cobrado' },
    { id: 'rev-jul-3', date: '2026-07-28', month: '2026-07', sourceType: 'kick', subCategory: 'KCIP', title: 'Kick Julio', amount: 710, status: 'cobrado' },
    { id: 'rev-jul-4', date: '2026-07-15', month: '2026-07', sourceType: 'sponsorships', subCategory: 'Brand Deal', title: 'Campaña Hostinger Creators', amount: 1600, status: 'cobrado' },
    { id: 'rev-jul-5', date: '2026-07-30', month: '2026-07', sourceType: 'donations', subCategory: 'Comunidad y Afiliados', title: 'Donaciones + Afiliados + TikTok Jul', amount: 1410, status: 'cobrado' },

    { id: 'rev-jun-1', date: '2026-06-28', month: '2026-06', sourceType: 'youtube', subCategory: 'AdSense', title: 'YouTube Junio', amount: 1940, status: 'cobrado' },
    { id: 'rev-jun-2', date: '2026-06-28', month: '2026-06', sourceType: 'twitch', subCategory: 'Subs y Ads', title: 'Twitch Junio', amount: 1460, status: 'cobrado' },
    { id: 'rev-jun-3', date: '2026-06-28', month: '2026-06', sourceType: 'kick', subCategory: 'KCIP', title: 'Kick Junio', amount: 620, status: 'cobrado' },
    { id: 'rev-jun-4', date: '2026-06-22', month: '2026-06', sourceType: 'sponsorships', subCategory: 'Brand Deal', title: 'Mención patrocinada Junio', amount: 1500, status: 'cobrado' },
    { id: 'rev-jun-5', date: '2026-06-29', month: '2026-06', sourceType: 'other', subCategory: 'Tienda y Afiliados', title: 'Afiliados + Presets + TikTok Jun', amount: 1320, status: 'cobrado' },
  ];

  return {
    creatorProfile: {
      displayName: 'Alex Rivera',
      handle: '@alexriveratv',
      niche: 'Tecnología, Streaming & Creación Digital',
      avatarUrl: '/images/avatar_creator_studio.jpg',
      currency: 'USD',
    },
    accounts,
    goals,
    calendarEvents,
    revenueEntries,
    monthlyRevenueGoal: 12500,
  };
}

export function rebuildSeriesForManualMetrics(
  account: PlatformAccount,
  followers: number,
  gained30d: number,
  lost30d: number,
  monthlyViews: number,
  streamHoursMonth: number,
  estimatedMonthlyRevenue: number
): Pick<PlatformAccount, 'dailySeries' | 'weeklySeries' | 'monthlySeries'> {
  const seedMap: Record<PlatformId, number> = {
    youtube: 1,
    twitch: 3,
    kick: 5,
    tiktok: 7,
    instagram: 9,
  };
  const seed = seedMap[account.platform] ?? 2;

  return {
    dailySeries: generateDailySeries(
      followers,
      Math.max(5, Math.round(gained30d / 30)),
      Math.max(1, Math.round(lost30d / 30)),
      Math.max(100, Math.round(monthlyViews / 30)),
      Number((streamHoursMonth / 30).toFixed(2)),
      Number((estimatedMonthlyRevenue / 30).toFixed(2)),
      seed
    ),
    weeklySeries: generateWeeklySeries(
      followers,
      Math.max(20, Math.round(gained30d / 4.3)),
      Math.max(5, Math.round(lost30d / 4.3)),
      Math.max(400, Math.round(monthlyViews / 4.3)),
      Number((streamHoursMonth / 4.3).toFixed(1)),
      Math.max(0, Math.round(account.videosPublishedMonth / 4)),
      Math.max(1, Math.round(account.clipsPublishedMonth / 4)),
      Math.max(0, Math.round(account.streamsPublishedMonth / 4)),
      Number((estimatedMonthlyRevenue / 4.3).toFixed(2)),
      1.028
    ),
    monthlySeries: generateMonthlySeries(
      followers,
      gained30d,
      lost30d,
      monthlyViews,
      streamHoursMonth,
      account.videosPublishedMonth,
      account.clipsPublishedMonth,
      account.streamsPublishedMonth,
      estimatedMonthlyRevenue,
      1.035
    ),
  };
}
