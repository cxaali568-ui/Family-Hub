import React from 'react';
import { UnifiedCalendarItem } from '../../types';
import { formatDateKey } from '../../utils/recurrenceUtils';

interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
  weekStartsOn?: 0 | 1;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  selectedDate,
  onSelectDate,
  items,
  onItemClick,
  weekStartsOn = 0,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // Last day of current month
  const lastDay = new Date(year, month + 1, 0);

  // Determine starting weekday offset
  let startingDayOfWeek = firstDay.getDay() - weekStartsOn;
  if (startingDayOfWeek < 0) startingDayOfWeek += 7;

  // Number of days in current month
  const daysInMonth = lastDay.getDate();

  // Number of days in previous month
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Calendar cells (total 35 or 42)
  const days: {
    date: Date;
    dateKey: string;
    isCurrentMonth: boolean;
    dayNumber: number;
  }[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      isCurrentMonth: false,
      dayNumber: prevMonthLastDay - i,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      isCurrentMonth: true,
      dayNumber: i,
    });
  }

  // Next month leading days to complete grid
  const remaining = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d,
      dateKey: formatDateKey(d),
      isCurrentMonth: false,
      dayNumber: i,
    });
  }

  const weekdays = weekStartsOn === 1
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  // Group items by dateKey
  const itemsByDate: Record<string, UnifiedCalendarItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.startDate]) {
      itemsByDate[item.startDate] = [];
    }
    itemsByDate[item.startDate].push(item);
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2.5">
        {weekdays.map((w, idx) => (
          <div key={w} className={idx === 0 || idx === 6 ? 'text-indigo-600 dark:text-indigo-400' : ''}>
            {w}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
        {days.map((day) => {
          const isToday = day.dateKey === todayKey;
          const isSelected = day.dateKey === selectedKey;
          const dayItems = itemsByDate[day.dateKey] || [];
          const visibleItems = dayItems.slice(0, 3);
          const moreCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={day.dateKey}
              onClick={() => onSelectDate(day.date)}
              className={`min-h-[85px] sm:min-h-[110px] p-1 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                !day.isCurrentMonth
                  ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600'
                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
              } ${isSelected ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/20 dark:bg-indigo-950/20' : ''}`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isSelected
                      ? 'text-indigo-600 font-extrabold'
                      : day.isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {dayItems.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
                    {dayItems.length}
                  </span>
                )}
              </div>

              {/* Items chips */}
              <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                {visibleItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItemClick(item);
                    }}
                    className={`w-full text-left truncate text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md font-semibold flex items-center gap-1 transition-opacity hover:opacity-90 ${item.color}`}
                  >
                    {!item.allDay && item.startTime && (
                      <span className="text-[9px] opacity-80 shrink-0">{item.startTime}</span>
                    )}
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}

                {moreCount > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block px-1">
                    +{moreCount} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
