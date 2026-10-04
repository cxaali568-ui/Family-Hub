import React from 'react';
import { UnifiedCalendarItem } from '../../types';
import { formatDateKey } from '../../utils/recurrenceUtils';
import { Clock, MapPin, Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface DayViewProps {
  selectedDate: Date;
  items: UnifiedCalendarItem[];
  onItemClick: (item: UnifiedCalendarItem) => void;
  onAddEventForDay: () => void;
}

export const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  items,
  onItemClick,
  onAddEventForDay,
}) => {
  const selectedKey = formatDateKey(selectedDate);
  const dayItems = items.filter((i) => i.startDate === selectedKey);

  const allDayItems = dayItems.filter((i) => i.allDay);
  const timedItems = dayItems.filter((i) => !i.allDay);

  // Sort timed items chronologically
  timedItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const formattedDate = selectedDate.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-6">
      {/* Day Title and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {formattedDate}
          </h2>
          <p className="text-xs text-slate-500">
            {dayItems.length === 0
              ? 'No events scheduled for this day.'
              : `${dayItems.length} item${dayItems.length === 1 ? '' : 's'} scheduled`}
          </p>
        </div>

        <Button
          size="sm"
          onClick={onAddEventForDay}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Event
        </Button>
      </div>

      {/* All-Day Items Section */}
      {allDayItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            All-Day Events & Reminders
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {allDayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className={`p-3 rounded-2xl text-left transition-all hover:scale-[1.01] shadow-xs flex items-center justify-between gap-3 ${item.color}`}
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90 block">
                    {item.category || item.source}
                  </span>
                  <p className="text-sm font-bold leading-tight mt-0.5">{item.title}</p>
                  {item.location && (
                    <span className="text-xs opacity-90 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {item.location}
                    </span>
                  )}
                </div>
                {item.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 shrink-0 opacity-90" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timed Items Chronological Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Timeline & Scheduled Times
        </h3>

        {timedItems.length > 0 ? (
          <div className="space-y-2.5">
            {timedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-white dark:bg-slate-900 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.startTime}</span>
                    {item.endTime && <span className="opacity-70">- {item.endTime}</span>}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.color}`}>
                        {item.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                        {item.title}
                      </h4>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                    {item.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" /> {item.location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                    View Details →
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          allDayItems.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                No events for this day.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Take a break or schedule something for the family!
              </p>
              <div className="mt-4">
                <Button size="sm" onClick={onAddEventForDay}>
                  + Add Event for {formattedDate}
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
