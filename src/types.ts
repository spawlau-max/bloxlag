export type PlatformId = 'youtube' | 'twitch' | 'kick' | 'tiktok' | 'instagram';

export type ConnectionMethod =
  | 'oauth_api'
  | 'public_api'
  | 'manual_verified'
  | 'disconnected';

export interface PlatformApiCapabilities {
  officialApiName: string;
  authProtocol: string;
  oauthConfiguredOnServer: boolean;
  supportsPublicLookup: boolean;
  supportsRevenueSync: boolean;
  supportsDirectScheduling: boolean;
  limitationSummary: string;
  manualFallbackExplanation: string;
}

export interface PlatformDailyMetric {
  date: string; // YYYY-MM-DD
  label: string;
  followers: number;
  gained: number;
  lost: number;
  views: number;
  streamHours: number;
  revenue: number;
}

export interface PlatformPeriodMetric {
  periodKey: string;
  label: string;
  followers: number;
  gained: number;
  lost: number;
  views: number;
  streamHours: number;
  videos: number;
  clips: number;
  streams: number;
  revenue: number;
}

export interface BestDayStat {
  dayIndex: number; // 0 = Lun ... 6 = Dom
  dayName: string;
  shortName: string;
  avgViews: number;
  engagementRate: number;
  bestHourWindow: string;
  postsPublished: number;
}

export interface PlatformAccount {
  platform: PlatformId;
  name: string;
  username: string;
  connected: boolean;
  connectionMethod: ConnectionMethod;
  followers: number;
  previousMonthFollowers: number;
  followersGained30d: number;
  followersLost30d: number;
  previousNetGain30d: number;
  totalViews: number;
  monthlyViews: number;
  previousMonthlyViews: number;
  streamHoursMonth: number;
  previousStreamHoursMonth: number;
  videosPublishedMonth: number;
  clipsPublishedMonth: number;
  streamsPublishedMonth: number;
  previousTotalContentMonth: number;
  estimatedMonthlyRevenue: number;
  previousMonthlyRevenue: number;
  lastSyncedAt: string | null;
  apiCapabilities: PlatformApiCapabilities;
  dailySeries: PlatformDailyMetric[];
  weeklySeries: PlatformPeriodMetric[];
  monthlySeries: PlatformPeriodMetric[];
  bestDays: BestDayStat[];
}

export interface FollowerGoal {
  id: string;
  platform: PlatformId | 'all';
  title: string;
  targetFollowers: number;
  deadline: string; // YYYY-MM-DD
  createdAt: string;
}

export type ContentStatus = 'idea' | 'preparado' | 'programado' | 'publicado';
export type ContentFormat = 'video' | 'stream' | 'clip' | 'post';
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  platforms: PlatformId[];
  contentType: ContentFormat;
  status: ContentStatus;
  reminderMinutes: number | null;
  recurrence: RecurrenceRule;
  requiresManualPublish: boolean;
  manualPublishReason?: string;
}

export type RevenueSourceId =
  | 'youtube'
  | 'twitch'
  | 'kick'
  | 'tiktok'
  | 'instagram'
  | 'sponsorships'
  | 'donations'
  | 'affiliates'
  | 'other';

export interface RevenueEntry {
  id: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  sourceType: RevenueSourceId;
  subCategory: string;
  title: string;
  amount: number;
  status: 'cobrado' | 'pendiente';
  notes?: string;
}

export interface WorkspaceState {
  creatorProfile: {
    displayName: string;
    handle: string;
    niche: string;
    avatarUrl: string;
    currency: string;
  };
  accounts: PlatformAccount[];
  goals: FollowerGoal[];
  calendarEvents: CalendarEvent[];
  revenueEntries: RevenueEntry[];
  monthlyRevenueGoal: number;
}
