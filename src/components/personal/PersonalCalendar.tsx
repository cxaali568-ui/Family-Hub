import React, { useState, useMemo } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDateKey, parseDateKey, addDays } from '../../utils/recurrenceUtils';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Lock,
  Compass,
  CheckCircle2,
  Bell,
  CheckSquare,
} from 'lucide-react';

interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  time?: string;
  source: 'reminder' | 'school_work' | 'plan' | 'daily_need';
  color: string;
}

export const PersonalCalendar: React.FC = () => {
  const { reminders, schoolWork, plans, dailyNeeds } = usePersonal();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'month' | 'agenda'>('month');

  // Assemble unified private items
  const items: CalendarEventItem[] = useMemo(() => {
    const list: CalendarEventItem[] = [];

    // Reminders
    for (const r of reminders) {
      if (r.status !== 'completed') {
        list.push({
          id: `rem_${r.id}`,
          title: `🔔 ${r.title}`,
          date: r.date,
          time: r.time,
          source: 'reminder',
          color: 'bg-orange-500 text-white',
        });
      }
    }

    // School / Work
    for (const sw of schoolWork) {
      if (sw.status !== 'cancelled') {
        list.push({
          id: `sw_${sw.id}`,
          title: `💼 ${sw.title}`,
          date: sw.date,
          time: sw.time,
          source: 'school_work',
          color: 'bg-indigo-600 text-white',
        });
      }
    }

    // Daily Needs
    for (const n of dailyNeeds) {
      if (n.status !== 'completed') {
        list.push({
          id: `dn_${n.id}`,
          title: `✅ ${n.title}`,
          date: n.dueDate,
          time: n.dueTime,
          source: 'daily_need',
          color: 'bg-emerald-600 text-white',
        });
      }
    }

    // Plans
    for (const p of plans) {
      if (p.status !== 'cancelled') {
        list.push({
          id: `plan_${p.id}`,
          title: `🎯 ${p.title} (Plan)`,
          date: p.startDate,
          source: 'plan',
          color: 'bg-purple-600 text-white',
        });
      }
    }

    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [reminders, schoolWork, dailyNeeds, plans]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startingOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const days: { date: Date; dateKey: string; isCurrentMonth: boolean; dayNumber: number }[] = [];

  // Previous month padding
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startingOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLast - i);
    days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: false, dayNumber: prevLast - i });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: true, dayNumber: i });
  }

  // Next month padding to 35
  const remaining = 35 - days.length > 0 ? 35 - days.length : 0;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, dateKey: formatDateKey(d), isCurrentMonth: false, dayNumber: i });
  }

  const todayKey = formatDateKey(new Date());
  const selectedKey = formatDateKey(selectedDate);

  const itemsByDate: Record<string, CalendarEventItem[]> = {};
  for (const item of items) {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  }

  const selectedDayItems = itemsByDate[selectedKey] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-indigo-600" />
              Personal Calendar
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Your personal plans, study tasks, and reminders (never shown in Family Planner).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                view === 'month'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView('agenda')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                view === 'agenda'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {view === 'month' ? (
        <div className="space-y-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="p-1.5"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDate(now);
                }}
              >
                Today
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="p-1.5"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
            </h3>
          </div>

          {/* Month Grid */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center text-[10px] font-bold text-slate-400 uppercase py-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
              {days.map((day) => {
                const dayItems = itemsByDate[day.dateKey] || [];
                const isToday = day.dateKey === todayKey;
                const isSelected = day.dateKey === selectedKey;

                return (
                  <div
                    key={day.dateKey}
                    onClick={() => setSelectedDate(day.date)}
                    className={`min-h-[80px] p-1 sm:p-2 cursor-pointer transition-colors flex flex-col justify-between ${
                      !day.isCurrentMonth ? 'bg-slate-50/40 dark:bg-slate-950/20 text-slate-400' : 'hover:bg-slate-50'
                    } ${isSelected ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/20' : ''}`}
                  >
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day.dayNumber}
                    </span>

                    <div className="space-y-1 mt-1">
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-[9px] px-1 py-0.5 rounded truncate font-medium ${item.color}`}
                        >
                          {item.title}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <span className="text-[9px] font-bold text-indigo-600 block">
                          +{dayItems.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details */}
          <Card className="p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Items for {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h4>

            {selectedDayItems.length > 0 ? (
              <div className="space-y-2">
                {selectedDayItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.color}`}>
                        {item.source}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                    </div>
                    {item.time && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No private items scheduled for this day.</p>
            )}
          </Card>
        </div>
      ) : (
        /* Agenda View */
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${item.color}`}>
                  {item.source}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.title}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{item.date}</span>
                    {item.time && <span>• {item.time}</span>}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <p className="text-xs text-slate-400">No scheduled personal items found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
