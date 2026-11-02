import React, { useMemo, useState } from 'react';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Radio,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CalendarEvent,
  ContentFormat,
  ContentStatus,
  PlatformId,
  RecurrenceRule,
} from '../types';
import { PLATFORM_META, PlatformIcon } from '../components/PlatformIcons';
import { expandCalendarEventsInRange } from '../utils/analytics';

interface CalendarViewProps {
  events: CalendarEvent[];
  onCreateEvent: (event: Omit<CalendarEvent, 'id' | 'requiresManualPublish' | 'manualPublishReason'>) => Promise<void>;
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

type CalendarViewMode = 'month' | 'week' | 'day';

const STATUS_LABELS: Record<ContentStatus, { label: string; colorClass: string }> = {
  idea: { label: 'Idea', colorClass: 'text-slate-400' },
  preparado: { label: 'Preparado', colorClass: 'text-amber-400' },
  programado: { label: 'Programado', colorClass: 'text-sky-400' },
  publicado: { label: 'Publicado', colorClass: 'text-emerald-400' },
};

const FORMAT_LABELS: Record<ContentFormat, string> = {
  video: 'Video largo',
  stream: 'Directo en vivo',
  clip: 'Clip / Short / Reel',
  post: 'Publicación / Carrusel',
};

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  none: 'Sin repetición',
  daily: 'Todos los días',
  weekly: 'Cada semana',
  biweekly: 'Cada 2 semanas',
  monthly: 'Cada mes',
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  // Anchored on current metadata date: 2026-11-02 (Monday!)
  const [cursorDate, setCursorDate] = useState<string>('2026-11-02');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formState, setFormState] = useState<{
    title: string;
    description: string;
    date: string;
    startTime: string;
    durationMinutes: number;
    platforms: PlatformId[];
    contentType: ContentFormat;
    status: ContentStatus;
    reminderMinutes: number | null;
    recurrence: RecurrenceRule;
  }>({
    title: '',
    description: '',
    date: '2026-11-02',
    startTime: '19:00',
    durationMinutes: 60,
    platforms: ['youtube'],
    contentType: 'video',
    status: 'programado',
    reminderMinutes: 60,
    recurrence: 'none',
  });

  const openCreatePublication = (presetDate?: string) => {
    setEditingEvent(null);
    setFormState({
      title: '',
      description: '',
      date: presetDate || cursorDate,
      startTime: '18:30',
      durationMinutes: 30,
      platforms: ['youtube', 'tiktok'],
      contentType: 'video',
      status: 'programado',
      reminderMinutes: 60,
      recurrence: 'none',
    });
    setModalOpen(true);
  };

  const openScheduleStream = (presetDate?: string) => {
    setEditingEvent(null);
    setFormState({
      title: '',
      description: '',
      date: presetDate || cursorDate,
      startTime: '20:00',
      durationMinutes: 180,
      platforms: ['twitch', 'kick'],
      contentType: 'stream',
      status: 'programado',
      reminderMinutes: 60,
      recurrence: 'weekly',
    });
    setModalOpen(true);
  };

  const openEditModal = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormState({
      title: evt.title,
      description: evt.description,
      date: evt.date,
      startTime: evt.startTime,
      durationMinutes: evt.durationMinutes,
      platforms: [...evt.platforms],
      contentType: evt.contentType,
      status: evt.status,
      reminderMinutes: evt.reminderMinutes,
      recurrence: evt.recurrence,
    });
    setModalOpen(true);
  };

  const togglePlatformInForm = (p: PlatformId) => {
    setFormState((prev) => {
      const exists = prev.platforms.includes(p);
      if (exists && prev.platforms.length === 1) return prev; // Keep at least 1
      return {
        ...prev,
        platforms: exists
          ? prev.platforms.filter((item) => item !== p)
          : [...prev.platforms, p],
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      await onUpdateEvent(editingEvent.id, formState);
    } else {
      await onCreateEvent(formState);
    }
    setModalOpen(false);
  };

  // Date navigation math
  const cursorObj = useMemo(() => new Date(`${cursorDate}T12:00:00Z`), [cursorDate]);

  const navigatePeriod = (dir: -1 | 1) => {
    const d = new Date(cursorObj);
    if (viewMode === 'month') {
      d.setUTCMonth(d.getUTCMonth() + dir);
    } else if (viewMode === 'week') {
      d.setUTCDate(d.getUTCDate() + dir * 7);
    } else {
      d.setUTCDate(d.getUTCDate() + dir);
    }
    setCursorDate(toIsoDate(d));
  };

  // Build visible range & cells
  const { rangeStart, rangeEnd, monthCells, weekDays } = useMemo(() => {
    const year = cursorObj.getUTCFullYear();
    const month = cursorObj.getUTCMonth();

    // First day of month (Monday-first index: 0=Lun .. 6=Dom)
    const firstOfMonth = new Date(Date.UTC(year, month, 1, 12, 0, 0));
    const firstDow = (firstOfMonth.getUTCDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstDow);

    const cells: Array<{ iso: string; dayNum: number; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const c = new Date(gridStart);
      c.setUTCDate(gridStart.getUTCDate() + i);
      cells.push({
        iso: toIsoDate(c),
        dayNum: c.getUTCDate(),
        inMonth: c.getUTCMonth() === month,
      });
    }

    // Week days (Monday to Sunday around cursorObj)
    const curDow = (cursorObj.getUTCDay() + 6) % 7;
    const monday = new Date(cursorObj);
    monday.setUTCDate(cursorObj.getUTCDate() - curDow);
    const wDays: Array<{ iso: string; shortLabel: string; dayNum: number }> = [];
    const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let i = 0; i < 7; i++) {
      const wd = new Date(monday);
      wd.setUTCDate(monday.getUTCDate() + i);
      wDays.push({
        iso: toIsoDate(wd),
        shortLabel: dayNames[i],
        dayNum: wd.getUTCDate(),
      });
    }

    return {
      rangeStart: cells[0].iso,
      rangeEnd: cells[cells.length - 1].iso,
      monthCells: cells,
      weekDays: wDays,
    };
  }, [cursorObj]);

  const expandedOccurrences = useMemo(() => {
    const raw = expandCalendarEventsInRange(events, rangeStart, rangeEnd);
    if (statusFilter === 'all') return raw;
    return raw.filter((e) => e.status === statusFilter);
  }, [events, rangeStart, rangeEnd, statusFilter]);

  // Notifications & Upcoming within next days from 2026-11-02
  const upcomingNotifications = useMemo(() => {
    return expandCalendarEventsInRange(events, '2026-11-02', '2026-11-12')
      .filter((e) => e.status !== 'publicado')
      .slice(0, 6);
  }, [events]);

  const periodHeading = useMemo(() => {
    if (viewMode === 'day') {
      return cursorObj.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
    return cursorObj.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }, [cursorObj, viewMode]);

  return (
    <div className="space-y-6">
      {/* Header + Primary Actions ("Crear publicación" + "Programar directo") */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Planificación multicanal · Videos, directos, clips y recordatorios inteligentes
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50 mt-1">
            Calendario de Contenido
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openCreatePublication()}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear publicación</span>
          </button>

          <button
            type="button"
            onClick={() => openScheduleStream()}
            className="min-h-[40px] px-4 py-2 rounded-lg border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Radio className="w-4 h-4 text-sky-400" />
            <span>Programar directo</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Date Navigator + View Switcher (Mensual, Semanal, Diaria) + Status Filter */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigatePeriod(-1)}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 cursor-pointer"
            aria-label="Período anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursorDate('2026-11-02')}
            className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 cursor-pointer"
          >
            Hoy (2 Nov)
          </button>
          <button
            type="button"
            onClick={() => navigatePeriod(1)}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 cursor-pointer"
            aria-label="Período siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-100 capitalize ml-2">
            {periodHeading}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'idea', label: 'Idea' },
                { id: 'preparado', label: 'Preparado' },
                { id: 'programado', label: 'Programado' },
                { id: 'publicado', label: 'Publicado' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-slate-800 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080C16] border border-slate-800">
            {(
              [
                { id: 'month', label: 'Mensual' },
                { id: 'week', label: 'Semanal' },
                { id: 'day', label: 'Diaria' },
              ] as const
            ).map((vm) => (
              <button
                key={vm.id}
                type="button"
                onClick={() => setViewMode(vm.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === vm.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Color Key */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 px-1">
        <span className="font-medium text-slate-300">Colores por plataforma:</span>
        {(['youtube', 'twitch', 'kick', 'tiktok', 'instagram'] as PlatformId[]).map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <PlatformIcon platform={p} className={`w-3.5 h-3.5 ${PLATFORM_META[p].textClass}`} />
            <span>{PLATFORM_META[p].label}</span>
          </span>
        ))}
      </div>

      {/* Main Split: Calendar Interactive Canvas + Upcoming Activities & Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <div className="xl:col-span-3 rounded-2xl border border-slate-800/80 bg-[#0F1629] overflow-hidden">
          {viewMode === 'month' && (
            <div>
              <div className="grid grid-cols-7 border-b border-slate-800 text-center text-xs font-medium text-slate-400 py-2.5">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-800/70">
                {monthCells.map((cell) => {
                  const dayEvents = expandedOccurrences.filter(
                    (e) => e.occurrenceDate === cell.iso
                  );
                  const isToday = cell.iso === '2026-11-02';
                  const isSelected = cell.iso === cursorDate;

                  return (
                    <div
                      key={cell.iso}
                      onClick={() => setCursorDate(cell.iso)}
                      className={`min-h-[108px] p-2 transition-colors cursor-pointer ${
                        cell.inMonth ? 'bg-[#0F1629] hover:bg-slate-800/30' : 'bg-[#090E1B] opacity-55'
                      } ${isSelected ? 'ring-1 ring-inset ring-violet-500/60' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            isToday
                              ? 'px-1.5 py-0.5 rounded bg-violet-600 text-white font-bold'
                              : cell.inMonth
                                ? 'text-slate-300'
                                : 'text-slate-600'
                          }`}
                        >
                          {cell.dayNum}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] font-mono tabular-nums text-slate-500">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((evt) => {
                          const primaryPlat = evt.platforms[0];
                          const meta = PLATFORM_META[primaryPlat];
                          return (
                            <button
                              key={`${evt.id}-${evt.occurrenceDate}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(evt);
                              }}
                              className={`w-full text-left px-1.5 py-1 rounded border ${meta.borderClass} ${meta.subtleBgClass} hover:brightness-110 transition-all cursor-pointer`}
                            >
                              <div className="flex items-center gap-1 text-[10px] font-mono tabular-nums text-slate-300">
                                <PlatformIcon
                                  platform={primaryPlat}
                                  className={`w-2.5 h-2.5 shrink-0 ${meta.textClass}`}
                                />
                                <span>{evt.startTime}</span>
                                {evt.platforms.length > 1 && (
                                  <span className="text-slate-400">+{evt.platforms.length - 1}</span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-100 truncate">
                                {evt.title}
                              </p>
                            </button>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] text-slate-400 pl-1">
                            +{dayEvents.length - 3} más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
              {weekDays.map((wd) => {
                const dayEvents = expandedOccurrences.filter((e) => e.occurrenceDate === wd.iso);
                const isToday = wd.iso === '2026-11-02';
                return (
                  <div key={wd.iso} className="min-h-[340px] p-3 flex flex-col">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 block">{wd.shortLabel}</span>
                        <span
                          className={`text-base font-bold font-mono tabular-nums ${
                            isToday ? 'text-violet-400' : 'text-slate-100'
                          }`}
                        >
                          {wd.dayNum}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreatePublication(wd.iso)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
                        title="Añadir en este día"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {dayEvents.length === 0 ? (
                        <p className="text-[11px] text-slate-600">Libre</p>
                      ) : (
                        dayEvents.map((evt) => {
                          const primaryPlat = evt.platforms[0];
                          const meta = PLATFORM_META[primaryPlat];
                          return (
                            <button
                              key={`${evt.id}-${evt.occurrenceDate}`}
                              type="button"
                              onClick={() => openEditModal(evt)}
                              className={`w-full text-left p-2.5 rounded-xl border ${meta.borderClass} ${meta.subtleBgClass} space-y-1 hover:brightness-110 transition-all cursor-pointer`}
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300">
                                <span>{evt.startTime}</span>
                                <span className={STATUS_LABELS[evt.status].colorClass}>
                                  {STATUS_LABELS[evt.status].label}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-100 line-clamp-2">
                                {evt.title}
                              </p>
                              <div className="flex items-center gap-1.5 pt-1">
                                {evt.platforms.map((p) => (
                                  <PlatformIcon
                                    key={p}
                                    platform={p}
                                    className={`w-3 h-3 ${PLATFORM_META[p].textClass}`}
                                  />
                                ))}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'day' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    Agenda detallada · {cursorDate}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Haz clic en cualquier bloque para editar horario, plataformas o estado
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreatePublication(cursorDate)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 cursor-pointer"
                >
                  + Añadir a este día
                </button>
              </div>

              {expandedOccurrences.filter((e) => e.occurrenceDate === cursorDate).length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-slate-400">
                    No hay contenidos ni directos agendados para esta fecha.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => openCreatePublication(cursorDate)}
                      className="px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Crear publicación
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleStream(cursorDate)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Programar directo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {expandedOccurrences
                    .filter((e) => e.occurrenceDate === cursorDate)
                    .map((evt) => {
                      const primaryMeta = PLATFORM_META[evt.platforms[0]];
                      return (
                        <div
                          key={`${evt.id}-${evt.occurrenceDate}`}
                          className={`rounded-xl border ${primaryMeta.borderClass} bg-[#080C16] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="font-mono tabular-nums text-slate-200 font-semibold">
                                {evt.startTime} ({evt.durationMinutes} min)
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{FORMAT_LABELS[evt.contentType]}</span>
                              <span aria-hidden="true">·</span>
                              <span className={STATUS_LABELS[evt.status].colorClass}>
                                {STATUS_LABELS[evt.status].label}
                              </span>
                              {evt.recurrence !== 'none' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 text-violet-300">
                                    <Repeat className="w-3 h-3" />
                                    {RECURRENCE_LABELS[evt.recurrence]}
                                  </span>
                                </>
                              )}
                            </div>

                            <h4 className="text-base font-semibold text-slate-100">{evt.title}</h4>
                            {evt.description && (
                              <p className="text-xs text-slate-400">{evt.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                              {evt.platforms.map((p) => (
                                <span key={p} className="inline-flex items-center gap-1.5">
                                  <PlatformIcon
                                    platform={p}
                                    className={`w-3.5 h-3.5 ${PLATFORM_META[p].textClass}`}
                                  />
                                  <span>{PLATFORM_META[p].label}</span>
                                </span>
                              ))}
                            </div>

                            {evt.requiresManualPublish && (
                              <p className="text-[11px] text-amber-300/90 pt-1">
                                Recordatorio manual activo: {evt.manualPublishReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {evt.status !== 'publicado' && (
                              <button
                                type="button"
                                onClick={() => onUpdateEvent(evt.id, { status: 'publicado' })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/35 text-emerald-300 text-xs font-medium hover:bg-emerald-600/30 cursor-pointer"
                              >
                                Marcar publicado
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(evt)}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-800 cursor-pointer"
                            >
                              Editar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Próximas Actividades & Notificaciones de Eventos Cercanos */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#0F1629] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Alertas y Próximos Eventos
              </h2>
              <p className="text-xs text-slate-400">Recordatorios y entregas cercanas</p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/80">
            {upcomingNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">
                No tienes recordatorios pendientes en los próximos 10 días.
              </p>
            ) : (
              upcomingNotifications.map((evt) => {
                const isImmediate = evt.occurrenceDate <= '2026-11-03';
                return (
                  <div key={`${evt.id}-${evt.occurrenceDate}`} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-mono tabular-nums font-medium ${
                          isImmediate ? 'text-sky-300' : 'text-slate-400'
                        }`}
                      >
                        {evt.occurrenceDate === '2026-11-02'
                          ? `Hoy · ${evt.startTime}`
                          : evt.occurrenceDate === '2026-11-03'
                            ? `Mañana · ${evt.startTime}`
                            : `${evt.occurrenceDate} · ${evt.startTime}`}
                      </span>
                      <span className={`text-[11px] ${STATUS_LABELS[evt.status].colorClass}`}>
                        {STATUS_LABELS[evt.status].label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditModal(evt)}
                      className="text-left text-sm font-medium text-slate-100 hover:text-violet-300 transition-colors line-clamp-2 cursor-pointer"
                    >
                      {evt.title}
                    </button>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {evt.platforms.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1">
                          <PlatformIcon
                            platform={p}
                            className={`w-3 h-3 ${PLATFORM_META[p].textClass}`}
                          />
                          <span>{PLATFORM_META[p].label}</span>
                        </span>
                      ))}
                      {evt.reminderMinutes !== null && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            Aviso {evt.reminderMinutes >= 60 ? `${evt.reminderMinutes / 60}h` : `${evt.reminderMinutes}m`} antes
                          </span>
                        </>
                      )}
                    </div>

                    {evt.requiresManualPublish && (
                      <p className="text-[11px] text-amber-300/90 leading-snug">
                        Publicación manual requerida (limitación API).
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Calendar Event Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0F1629] p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-slate-100">
                {editingEvent
                  ? 'Editar Contenido o Directo'
                  : formState.contentType === 'stream'
                    ? 'Programar Nuevo Directo'
                    : 'Crear Nueva Publicación'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Título de la publicación o directo
                </label>
                <input
                  type="text"
                  required
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  placeholder="Ej. Tutorial iluminación estudio / Directo especial viernes"
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción, guion breve o notas de publicación
                </label>
                <textarea
                  rows={2}
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Puntos clave, enlaces de patrocinador o hashtags..."
                  className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Multi-Platform Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Plataformas destino (puedes elegir una o varias)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['youtube', 'twitch', 'kick', 'tiktok', 'instagram'] as PlatformId[]).map(
                    (p) => {
                      const active = formState.platforms.includes(p);
                      const meta = PLATFORM_META[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePlatformInForm(p)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? `${meta.borderClass} ${meta.subtleBgClass} text-slate-100`
                              : 'border-slate-800 bg-[#080C16] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <PlatformIcon platform={p} className={`w-3.5 h-3.5 ${meta.textClass}`} />
                          <span>{meta.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">Horario</label>
                  <input
                    type="time"
                    required
                    value={formState.startTime}
                    onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={formState.durationMinutes}
                    onChange={(e) =>
                      setFormState({ ...formState, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm font-mono tabular-nums text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de contenido
                  </label>
                  <select
                    value={formState.contentType}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        contentType: e.target.value as ContentFormat,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="video">Video de YouTube / VOD</option>
                    <option value="stream">Directo en vivo (Stream)</option>
                    <option value="clip">Clip vertical / Short / Reel</option>
                    <option value="post">Publicación / Comunidad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Estado del flujo editorial
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        status: e.target.value as ContentStatus,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="idea">Idea</option>
                    <option value="preparado">Preparado (editado / listo)</option>
                    <option value="programado">Programado</option>
                    <option value="publicado">Publicado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Recordatorio previo
                  </label>
                  <select
                    value={formState.reminderMinutes === null ? 'none' : String(formState.reminderMinutes)}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        reminderMinutes: e.target.value === 'none' ? null : Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="none">Sin recordatorio</option>
                    <option value="15">15 minutos antes</option>
                    <option value="60">1 hora antes</option>
                    <option value="1440">24 horas antes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Repetir evento
                  </label>
                  <select
                    value={formState.recurrence}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        recurrence: e.target.value as RecurrenceRule,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-[#080C16] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    <option value="none">No repetir</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="biweekly">Cada 2 semanas</option>
                    <option value="monthly">Mensualmente</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#080C16] p-3 text-xs text-slate-400">
                Nota de API: Si alguna plataforma seleccionada no soporta publicación directa desatendida (como transmisiones en vivo de Twitch/Kick o Reels sin token empresarial), CreatorPulse organiza tu entrega y activa un recordatorio puntual para publicarlo manualmente.
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteEvent(editingEvent.id);
                      setModalOpen(false);
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
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
                    {editingEvent ? 'Guardar cambios' : 'Guardar en calendario'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
