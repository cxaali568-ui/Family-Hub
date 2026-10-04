import React from 'react';
import { UnifiedCalendarItem } from '../../types';
import { formatDateKey, addDays, parseDateKey } from '../../utils/recurrenceUtils';
import { Clock, MapPin, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface AgendaViewProps {
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
  onAddEvent: () => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  items,
  onItemClick,
  onAddEvent,
}) => {
  const todayKey = formatDateKey(new Date());
  const tomorrowKey = formatDateKey(addDays(new Date(), 1));

  // Group items by startDate
  const grouped: { dateKey: string; label: string; dateObj: Date; items: UnifiedCalendarItem[] }[] = [];
  const map = new Map<string, UnifiedCalendarItem[]>();

  for (const item of items) {
    if (!map.has(item.startDate)) {
      map.set(item.startDate, []);
    }
    map.get(item.startDate)!.push(item);
  }

  // Sort keys chronologically
  const sortedDateKeys = Array.from(map.keys()).sort();

  for (const k of sortedDateKeys) {
    const d = parseDateKey(k);
    let label = '';
    if (k === todayKey) {
      label = `TODAY • ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } else if (k === tomorrowKey) {
      label = `TOMORROW • ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    } else {
      label = d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    }

    const dayItems = map.get(k) || [];
    // Sort items within day
    dayItems.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    grouped.push({
      dateKey: k,
      label,
      dateObj: d,
      items: dayItems,
    });
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
        <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          No events scheduled.
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Your family calendar is completely free. Add gatherings, appointments, or reminders to stay organized together!
        </p>
        <button
          type="button"
          onClick={onAddEvent}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs"
        >
          + Add First Event
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => {
        const isToday = group.dateKey === todayKey;

        return (
          <div key={group.dateKey} className="space-y-2">
            {/* Date Group Header */}
            <div className="flex items-center gap-2 px-1">
              <span
                className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                  isToday
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {group.label}
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* List of items */}
            <div className="space-y-2">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="w-full text-left p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 shadow-xs hover:shadow-md transition-all flex items-start sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Time or All-day pill */}
                    <div className="w-16 sm:w-20 text-center shrink-0">
                      {item.allDay ? (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md block">
                          All Day
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{item.startTime}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.color}`}>
                          {item.category || item.source}
                        </span>
                        {item.source !== 'event' && (
                          <Badge variant="outline" className="text-[9px] uppercase">
                            {item.source}
                          </Badge>
                        )}
                        {item.status === 'completed' && (
                          <Badge variant="success" className="text-[9px]">
                            Done
                          </Badge>
                        )}
                        {item.status === 'overdue' && (
                          <Badge variant="danger" className="text-[9px]">
                            Overdue
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate">
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {item.location}
                          </span>
                        )}
                        {item.description && (
                          <span className="line-clamp-1 italic">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 self-center">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
