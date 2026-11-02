import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialWorkspaceState, rebuildSeriesForManualMetrics } from './src/server/store.ts';
import type {
  CalendarEvent,
  FollowerGoal,
  PlatformId,
  RevenueEntry,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const state = createInitialWorkspaceState();

// Attempt official public API fetch where possible without faking connections
async function tryOfficialPublicLookup(
  platform: PlatformId,
  rawUsername: string
): Promise<{
  fetchedFromOfficialApi: boolean;
  followers?: number;
  totalViews?: number;
  videosCount?: number;
  resolvedUsername?: string;
  diagnosticMessage: string;
}> {
  const cleanHandle = rawUsername.trim().replace(/^@/, '');

  if (platform === 'youtube') {
    const ytApiKey = process.env.YOUTUBE_API_KEY;
    if (ytApiKey && cleanHandle) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const endpoint = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(
          cleanHandle
        )}&key=${encodeURIComponent(ytApiKey)}`;
        const resp = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timer);
        if (resp.ok) {
          const data = (await resp.json()) as {
            items?: Array<{
              snippet?: { customUrl?: string; title?: string };
              statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
            }>;
          };
          const item = data.items?.[0];
          if (item?.statistics) {
            return {
              fetchedFromOfficialApi: true,
              followers: Number(item.statistics.subscriberCount || 0),
              totalViews: Number(item.statistics.viewCount || 0),
              videosCount: Number(item.statistics.videoCount || 0),
              resolvedUsername: item.snippet?.customUrl || `@${cleanHandle}`,
              diagnosticMessage:
                'Sincronizado mediante YouTube Data API v3 oficial (estadísticas públicas del canal). Ingresos y bajas requieren alcance OAuth monetario o entrada manual.',
            };
          }
        }
      } catch {
        // Fall through to honest limitation explanation
      }
    }
    return {
      fetchedFromOfficialApi: false,
      diagnosticMessage:
        'YOUTUBE_API_KEY / OAuth 2.0 no configurados en el entorno del servidor. Cuenta vinculada en modo de registro manual verificado.',
    };
  }

  if (platform === 'kick' && cleanHandle) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const resp = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(cleanHandle)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (resp.ok) {
        const data = (await resp.json()) as {
          followers_count?: number;
          slug?: string;
        };
        if (typeof data.followers_count === 'number') {
          return {
            fetchedFromOfficialApi: true,
            followers: data.followers_count,
            resolvedUsername: data.slug || cleanHandle,
            diagnosticMessage:
              'Seguidores consultados desde el endpoint público de Kick v2. Horas emitidas e ingresos KCIP requieren actualización manual.',
          };
        }
      }
    } catch {
      // Kick Cloudflare protection often blocks headless server IPs; explain transparently
    }
    return {
      fetchedFromOfficialApi: false,
      diagnosticMessage:
        'La protección anti-bot de Kick restringe consultas directas sin OAuth 2.1 aprobado. Se habilitó actualización manual de métricas.',
    };
  }

  if (platform === 'twitch') {
    return {
      fetchedFromOfficialApi: false,
      diagnosticMessage:
        'Twitch Helix API exige Client-ID y token OAuth 2.0 (channel:read:subscriptions). Estadísticas configuradas con control manual.',
    };
  }

  if (platform === 'tiktok') {
    return {
      fetchedFromOfficialApi: false,
      diagnosticMessage:
        'TikTok Display API v2 exige revisión de permisos user.info.stats. Puedes introducir y actualizar tus métricas de TikTok Studio manualmente.',
    };
  }

  return {
    fetchedFromOfficialApi: false,
    diagnosticMessage:
      'Instagram Graph API requiere cuenta Profesional vinculada a Facebook Page y token Meta OAuth. Modo manual habilitado para todas las estadísticas.',
  };
}

// --- API ROUTES ---

app.get('/api/state', (_req, res) => {
  res.json(state);
});

// Connect or update platform account
app.post('/api/accounts/:platform/connect', async (req, res) => {
  const platform = req.params.platform as PlatformId;
  const account = state.accounts.find((a) => a.platform === platform);
  if (!account) {
    res.status(404).json({ error: 'Plataforma no encontrada.' });
    return;
  }

  const {
    username,
    followers,
    followersGained30d,
    followersLost30d,
    monthlyViews,
    totalViews,
    streamHoursMonth,
    videosPublishedMonth,
    clipsPublishedMonth,
    streamsPublishedMonth,
    estimatedMonthlyRevenue,
  } = req.body as Record<string, unknown>;

  const nextUsername =
    typeof username === 'string' && username.trim().length > 0
      ? username.trim()
      : account.username;

  const lookup = await tryOfficialPublicLookup(platform, nextUsername);

  const finalFollowers =
    lookup.fetchedFromOfficialApi && typeof lookup.followers === 'number'
      ? lookup.followers
      : typeof followers === 'number' && !Number.isNaN(followers)
        ? Math.max(0, Math.round(followers))
        : account.followers;

  const finalGained =
    typeof followersGained30d === 'number' && !Number.isNaN(followersGained30d)
      ? Math.max(0, Math.round(followersGained30d))
      : account.followersGained30d;

  const finalLost =
    typeof followersLost30d === 'number' && !Number.isNaN(followersLost30d)
      ? Math.max(0, Math.round(followersLost30d))
      : account.followersLost30d;

  const finalMonthlyViews =
    typeof monthlyViews === 'number' && !Number.isNaN(monthlyViews)
      ? Math.max(0, Math.round(monthlyViews))
      : account.monthlyViews;

  const finalTotalViews =
    lookup.fetchedFromOfficialApi && typeof lookup.totalViews === 'number'
      ? lookup.totalViews
      : typeof totalViews === 'number' && !Number.isNaN(totalViews)
        ? Math.max(finalMonthlyViews, Math.round(totalViews))
        : Math.max(account.totalViews, finalMonthlyViews);

  const finalStreamHours =
    typeof streamHoursMonth === 'number' && !Number.isNaN(streamHoursMonth)
      ? Math.max(0, Number(streamHoursMonth))
      : account.streamHoursMonth;

  const finalRevenue =
    typeof estimatedMonthlyRevenue === 'number' && !Number.isNaN(estimatedMonthlyRevenue)
      ? Math.max(0, Number(estimatedMonthlyRevenue))
      : account.estimatedMonthlyRevenue;

  account.username = lookup.resolvedUsername || nextUsername;
  account.connected = true;
  account.connectionMethod = lookup.fetchedFromOfficialApi ? 'public_api' : 'manual_verified';
  account.followers = finalFollowers;
  account.previousMonthFollowers = Math.max(0, finalFollowers - (finalGained - finalLost));
  account.followersGained30d = finalGained;
  account.followersLost30d = finalLost;
  account.monthlyViews = finalMonthlyViews;
  account.totalViews = finalTotalViews;
  account.streamHoursMonth = finalStreamHours;
  account.estimatedMonthlyRevenue = finalRevenue;

  if (typeof videosPublishedMonth === 'number') {
    account.videosPublishedMonth = Math.max(0, Math.round(videosPublishedMonth));
  }
  if (typeof clipsPublishedMonth === 'number') {
    account.clipsPublishedMonth = Math.max(0, Math.round(clipsPublishedMonth));
  }
  if (typeof streamsPublishedMonth === 'number') {
    account.streamsPublishedMonth = Math.max(0, Math.round(streamsPublishedMonth));
  }

  account.lastSyncedAt = new Date().toISOString();

  const rebuilt = rebuildSeriesForManualMetrics(
    account,
    account.followers,
    account.followersGained30d,
    account.followersLost30d,
    account.monthlyViews,
    account.streamHoursMonth,
    account.estimatedMonthlyRevenue
  );
  account.dailySeries = rebuilt.dailySeries;
  account.weeklySeries = rebuilt.weeklySeries;
  account.monthlySeries = rebuilt.monthlySeries;

  res.json({
    account,
    diagnosticMessage: lookup.diagnosticMessage,
    fetchedFromOfficialApi: lookup.fetchedFromOfficialApi,
  });
});

// Sync / refresh account
app.post('/api/accounts/:platform/sync', async (req, res) => {
  const platform = req.params.platform as PlatformId;
  const account = state.accounts.find((a) => a.platform === platform);
  if (!account) {
    res.status(404).json({ error: 'Plataforma no encontrada.' });
    return;
  }

  const lookup = await tryOfficialPublicLookup(platform, account.username);
  if (lookup.fetchedFromOfficialApi && typeof lookup.followers === 'number') {
    const delta = lookup.followers - account.followers;
    account.followers = lookup.followers;
    if (delta > 0) account.followersGained30d += delta;
    if (typeof lookup.totalViews === 'number') account.totalViews = lookup.totalViews;
    account.connectionMethod = 'public_api';
  }
  account.lastSyncedAt = new Date().toISOString();

  res.json({
    account,
    diagnosticMessage: lookup.diagnosticMessage,
    fetchedFromOfficialApi: lookup.fetchedFromOfficialApi,
  });
});

// Disconnect account
app.post('/api/accounts/:platform/disconnect', (req, res) => {
  const platform = req.params.platform as PlatformId;
  const account = state.accounts.find((a) => a.platform === platform);
  if (!account) {
    res.status(404).json({ error: 'Plataforma no encontrada.' });
    return;
  }

  account.connected = false;
  account.connectionMethod = 'disconnected';
  res.json({ account });
});

// Goals CRUD
app.post('/api/goals', (req, res) => {
  const { platform, title, targetFollowers, deadline } = req.body as Partial<FollowerGoal>;
  if (!title || !targetFollowers || !deadline) {
    res.status(400).json({ error: 'Faltan campos obligatorios para el objetivo.' });
    return;
  }

  const newGoal: FollowerGoal = {
    id: `goal-${Date.now()}`,
    platform: platform || 'all',
    title: title.trim(),
    targetFollowers: Math.max(100, Math.round(Number(targetFollowers))),
    deadline,
    createdAt: new Date().toISOString().slice(0, 10),
  };

  state.goals.unshift(newGoal);
  res.status(201).json(newGoal);
});

app.put('/api/goals/:id', (req, res) => {
  const goal = state.goals.find((g) => g.id === req.params.id);
  if (!goal) {
    res.status(404).json({ error: 'Objetivo no encontrado.' });
    return;
  }
  const { title, targetFollowers, deadline, platform } = req.body as Partial<FollowerGoal>;
  if (title) goal.title = title.trim();
  if (typeof targetFollowers === 'number') goal.targetFollowers = Math.max(100, Math.round(targetFollowers));
  if (deadline) goal.deadline = deadline;
  if (platform) goal.platform = platform;
  res.json(goal);
});

app.delete('/api/goals/:id', (req, res) => {
  const idx = state.goals.findIndex((g) => g.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Objetivo no encontrado.' });
    return;
  }
  state.goals.splice(idx, 1);
  res.json({ ok: true });
});

// Calendar CRUD
function computeManualPublishRequirement(
  platforms: PlatformId[],
  contentType: CalendarEvent['contentType']
): { requiresManual: boolean; reason?: string } {
  if (contentType === 'stream') {
    return {
      requiresManual: true,
      reason: 'Los directos requieren iniciar transmisión en vivo desde tu software codificador (OBS / Streamlabs).',
    };
  }
  const restricted = platforms.filter((p) => {
    const acc = state.accounts.find((a) => a.platform === p);
    return !acc?.apiCapabilities.supportsDirectScheduling;
  });
  if (restricted.length > 0) {
    const names = restricted
      .map((p) => state.accounts.find((a) => a.platform === p)?.name || p)
      .join(', ');
    return {
      requiresManual: true,
      reason: `${names} no dispone de auto-publicación API activa en este entorno; se enviará recordatorio para publicar manualmente.`,
    };
  }
  return { requiresManual: false };
}

app.post('/api/calendar', (req, res) => {
  const body = req.body as Partial<CalendarEvent>;
  if (!body.title || !body.date || !body.startTime || !body.platforms?.length) {
    res.status(400).json({ error: 'Completa título, fecha, hora y al menos una plataforma.' });
    return;
  }

  const contentType = body.contentType || 'video';
  const manualInfo = computeManualPublishRequirement(body.platforms, contentType);

  const newEvent: CalendarEvent = {
    id: `evt-${Date.now()}`,
    title: body.title.trim(),
    description: (body.description || '').trim(),
    date: body.date,
    startTime: body.startTime,
    durationMinutes: Number(body.durationMinutes) || 30,
    platforms: body.platforms,
    contentType,
    status: body.status || 'programado',
    reminderMinutes: body.reminderMinutes === undefined ? 60 : body.reminderMinutes,
    recurrence: body.recurrence || 'none',
    requiresManualPublish: manualInfo.requiresManual,
    manualPublishReason: manualInfo.reason,
  };

  state.calendarEvents.push(newEvent);
  res.status(201).json(newEvent);
});

app.put('/api/calendar/:id', (req, res) => {
  const evt = state.calendarEvents.find((e) => e.id === req.params.id);
  if (!evt) {
    res.status(404).json({ error: 'Evento no encontrado.' });
    return;
  }

  const body = req.body as Partial<CalendarEvent>;
  if (body.title !== undefined) evt.title = body.title.trim();
  if (body.description !== undefined) evt.description = body.description.trim();
  if (body.date !== undefined) evt.date = body.date;
  if (body.startTime !== undefined) evt.startTime = body.startTime;
  if (body.durationMinutes !== undefined) evt.durationMinutes = Number(body.durationMinutes) || 30;
  if (body.platforms && body.platforms.length > 0) evt.platforms = body.platforms;
  if (body.contentType !== undefined) evt.contentType = body.contentType;
  if (body.status !== undefined) evt.status = body.status;
  if (body.reminderMinutes !== undefined) evt.reminderMinutes = body.reminderMinutes;
  if (body.recurrence !== undefined) evt.recurrence = body.recurrence;

  const manualInfo = computeManualPublishRequirement(evt.platforms, evt.contentType);
  evt.requiresManualPublish = manualInfo.requiresManual;
  evt.manualPublishReason = manualInfo.reason;

  res.json(evt);
});

app.delete('/api/calendar/:id', (req, res) => {
  const idx = state.calendarEvents.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Evento no encontrado.' });
    return;
  }
  state.calendarEvents.splice(idx, 1);
  res.json({ ok: true });
});

// Revenue CRUD
app.post('/api/revenue', (req, res) => {
  const body = req.body as Partial<RevenueEntry>;
  if (!body.title || !body.sourceType || body.amount === undefined || !body.date) {
    res.status(400).json({ error: 'Completa concepto, fuente, fecha y monto.' });
    return;
  }

  const entry: RevenueEntry = {
    id: `rev-${Date.now()}`,
    date: body.date,
    month: body.date.slice(0, 7),
    sourceType: body.sourceType,
    subCategory: (body.subCategory || 'Ingreso registrado').trim(),
    title: body.title.trim(),
    amount: Math.max(0, Number(body.amount)),
    status: body.status || 'cobrado',
    notes: body.notes?.trim(),
  };

  state.revenueEntries.unshift(entry);
  res.status(201).json(entry);
});

app.put('/api/revenue/:id', (req, res) => {
  const entry = state.revenueEntries.find((r) => r.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'Registro financiero no encontrado.' });
    return;
  }

  const body = req.body as Partial<RevenueEntry>;
  if (body.title !== undefined) entry.title = body.title.trim();
  if (body.sourceType !== undefined) entry.sourceType = body.sourceType;
  if (body.subCategory !== undefined) entry.subCategory = body.subCategory.trim();
  if (body.amount !== undefined) entry.amount = Math.max(0, Number(body.amount));
  if (body.date !== undefined) {
    entry.date = body.date;
    entry.month = body.date.slice(0, 7);
  }
  if (body.status !== undefined) entry.status = body.status;
  if (body.notes !== undefined) entry.notes = body.notes.trim();

  res.json(entry);
});

app.delete('/api/revenue/:id', (req, res) => {
  const idx = state.revenueEntries.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Registro no encontrado.' });
    return;
  }
  state.revenueEntries.splice(idx, 1);
  res.json({ ok: true });
});

app.put('/api/revenue-goal', (req, res) => {
  const { monthlyRevenueGoal } = req.body as { monthlyRevenueGoal?: number };
  if (typeof monthlyRevenueGoal === 'number' && monthlyRevenueGoal > 0) {
    state.monthlyRevenueGoal = Math.round(monthlyRevenueGoal);
  }
  res.json({ monthlyRevenueGoal: state.monthlyRevenueGoal });
});

async function startServer() {
  const port = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CreatorPulse server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
