import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { PlatformId, RevenueSourceId } from '../types';

export interface PlatformVisualMeta {
  id: PlatformId;
  label: string;
  accentHex: string;
  textClass: string;
  borderClass: string;
  subtleBgClass: string;
}

export const PLATFORM_META: Record<PlatformId, PlatformVisualMeta> = {
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    accentHex: '#F43F5E',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/35',
    subtleBgClass: 'bg-rose-500/10',
  },
  twitch: {
    id: 'twitch',
    label: 'Twitch',
    accentHex: '#A855F7',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/35',
    subtleBgClass: 'bg-purple-500/10',
  },
  kick: {
    id: 'kick',
    label: 'Kick',
    accentHex: '#22C55E',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/35',
    subtleBgClass: 'bg-emerald-500/10',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    accentHex: '#38BDF8',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/35',
    subtleBgClass: 'bg-sky-500/10',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    accentHex: '#EC4899',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500/35',
    subtleBgClass: 'bg-pink-500/10',
  },
};

export const REVENUE_SOURCE_META: Record<
  RevenueSourceId,
  { label: string; group: 'platform' | 'external'; color: string }
> = {
  youtube: { label: 'YouTube (AdSense y Miembros)', group: 'platform', color: '#F43F5E' },
  twitch: { label: 'Twitch (Suscripciones y Ads)', group: 'platform', color: '#A855F7' },
  kick: { label: 'Kick (Suscripciones y KCIP)', group: 'platform', color: '#22C55E' },
  tiktok: { label: 'TikTok (Creator Rewards)', group: 'platform', color: '#38BDF8' },
  instagram: { label: 'Instagram (Bonos y Subs)', group: 'platform', color: '#EC4899' },
  sponsorships: { label: 'Patrocinios y Marcas', group: 'external', color: '#8B5CF6' },
  donations: { label: 'Donaciones de Comunidad', group: 'external', color: '#F59E0B' },
  affiliates: { label: 'Marketing de Afiliados', group: 'external', color: '#14B8A6' },
  other: { label: 'Otras Fuentes (Tienda / Cursos)', group: 'external', color: '#94A3B8' },
};

export const PlatformIcon: React.FC<{ platform: PlatformId; className?: string }> = ({
  platform,
  className = 'w-5 h-5',
}) => {
  switch (platform) {
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'twitch':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
        </svg>
      );
    case 'kick':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M3 3h5.2v6.6L14.4 3H21l-7.2 8.4L21.3 21h-6.6l-6.5-7.4V21H3V3z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
  }
};

export const DeltaIndicator: React.FC<{
  percent: number;
  suffix?: string;
  invertGood?: boolean;
}> = ({ percent, suffix = 'vs mes ant.', invertGood = false }) => {
  const rounded = Number(percent.toFixed(1));
  if (Math.abs(rounded) < 0.05) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-400">
        <Minus className="w-3.5 h-3.5 shrink-0" />
        <span>0.0%</span>
        {suffix && <span className="font-sans text-slate-500">{suffix}</span>}
      </span>
    );
  }

  const isPositiveNumber = rounded > 0;
  const isImproving = invertGood ? !isPositiveNumber : isPositiveNumber;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
        isImproving ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      {isPositiveNumber ? (
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>
        {isPositiveNumber ? '+' : ''}
        {rounded.toFixed(1)}%
      </span>
      {suffix && <span className="font-sans text-slate-500">{suffix}</span>}
    </span>
  );
};
