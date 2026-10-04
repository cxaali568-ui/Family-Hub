import React from 'react';
import { UnifiedCalendarItem } from '../../types';
import { formatDateKey, addDays } from '../../utils/recurrenceUtils';
import { Clock, MapPin } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
  weekStartsOn?: 0 | 1;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  selectedDate,
  onSelectDate,
  items,
  onItemClick,
  weekStartsOn = 0,
}) => {
  // Find start of week (Sunday or Monday)
  const currentDayOfWeek = currentDate.getDay();
  let diff = currentDayOfWeek - weekStartsOn;
  if (diff < 0) diff += 7;

  const startOfWeek = addDays(currentDate, -diff);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(startOfWeek, i);
    return {
      date: d,
      dateKey: formatDateKey(d),
      dayName: d.toLocaleDateString([], { weekday: 'short' }),
      dayNumber: d.getDate(),
      isToday: formatDateKey(d) === formatDateKey(new Date()),
      isSelected: formatDateKey(d) === formatDateKey(selectedDate),
    };
  });

  const itemsByDate: Record<string, UnifiedCalendarItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.startDate]) {
      itemsByDate[item.startDate] = [];
    }
    itemsByDate[item.startDate].push(item);
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* 7 Days Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
        {weekDays.map((day) => (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={`p-3 text-center transition-colors border-r border-slate-200/60 dark:border-slate-800/60 last:border-r-0 ${
              day.isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/40' : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {day.dayName}
            </span>
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-extrabold mt-1 ${
                day.isToday
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : day.isSelected
                  ? 'text-indigo-600 dark:text-indigo-400 font-black'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {day.dayNumber}
            </span>
          </button>
        ))}
      </div>

      {/* Week Day Columns */}
      <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 min-h-[480px]">
        {weekDays.map((day) => {
          const dayItems = itemsByDate[day.dateKey] || [];
          const allDayItems = dayItems.filter((i) => i.allDay);
          const timedItems = dayItems.filter((i) => !i.allDay);

          return (
            <div
              key={day.dateKey}
              className={`p-2 flex flex-col gap-2 ${
                day.isSelected ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''
              }`}
            >
              {/* All day section */}
              {allDayItems.length > 0 && (
                <div className="space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                    All Day
                  </span>
                  {allDayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onItemClick(item)}
                      className={`w-full text-left p-1.5 rounded-lg text-xs font-semibold leading-tight block truncate shadow-2xs ${item.color}`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}

              {/* Timed items */}
              <div className="space-y-1.5 flex-1">
                {timedItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onItemClick(item)}
                    className={`w-full text-left p-2 rounded-xl text-xs font-semibold block transition-transform hover:scale-[1.02] shadow-xs ${item.color}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] opacity-90 mb-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{item.startTime}</span>
                    </div>
                    <p className="font-bold line-clamp-2 leading-snug">{item.title}</p>
                    {item.location && (
                      <div className="flex items-center gap-1 text-[10px] opacity-80 mt-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}
                  </button>
                ))}

                {dayItems.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 italic">
                    Free
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
