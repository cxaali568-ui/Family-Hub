import { RecurrenceRule, FamilyEvent, UnifiedCalendarItem } from '../types';

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD into a local Date object without UTC drift
 */
export const parseDateKey = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

/**
 * Add days to a date without mutation
 */
export const addDays = (d: Date, days: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Expands recurring events within a specific view window [windowStart, windowEnd].
 * Prevents infinite loops and bounds expansion.
 */
export const expandRecurringEvent = (
  event: FamilyEvent,
  windowStart: Date,
  windowEnd: Date
): UnifiedCalendarItem[] => {
  if (!event.recurrence || event.recurrence.frequency === 'none') {
    return [eventToCalendarItem(event)];
  }

  const items: UnifiedCalendarItem[] = [];
  const rule = event.recurrence;
  const interval = Math.max(1, rule.interval || 1);
  const eventStart = parseDateKey(event.startDate);
  const recurrenceEnd = rule.endDate ? parseDateKey(rule.endDate) : addDays(windowEnd, 1);
  const effectiveEnd = recurrenceEnd < windowEnd ? recurrenceEnd : windowEnd;
  const exceptions = new Set(rule.exceptions || []);

  let current = new Date(eventStart);
  let count = 0;
  const maxOccurrences = rule.occurrencesCount || 365;

  while (current <= effectiveEnd && count < maxOccurrences) {
    const dateKey = formatDateKey(current);

    if (current >= windowStart && !exceptions.has(dateKey)) {
      items.push({
        id: `${event.id}_${dateKey}`,
        source: 'event',
        title: event.title,
        description: event.description,
        startDate: dateKey,
        startTime: event.startTime,
        endDate: event.endDate ? formatDateKey(addDays(current, getDurationDays(event))) : undefined,
        endTime: event.endTime,
        allDay: event.allDay,
        category: event.category,
        location: event.location,
        assignedMemberIds: event.assignedMemberIds,
        status: event.status,
        color: getCategoryColor(event.category),
        rawEntity: event,
        isRecurringOccurrence: true,
        occurrenceDate: dateKey,
        createdBy: event.createdBy,
        createdByName: event.createdByName,
      });
    }

    count++;

    // Step forward based on frequency
    if (rule.frequency === 'daily') {
      current = addDays(current, interval);
    } else if (rule.frequency === 'weekly') {
      current = addDays(current, 7 * interval);
    } else if (rule.frequency === 'monthly') {
      const next = new Date(current);
      next.setMonth(next.getMonth() + interval);
      current = next;
    } else if (rule.frequency === 'yearly') {
      const next = new Date(current);
      next.setFullYear(next.getFullYear() + interval);
      current = next;
    } else {
      break;
    }
  }

  return items;
};

const getDurationDays = (event: FamilyEvent): number => {
  if (!event.endDate || event.endDate === event.startDate) return 0;
  const s = parseDateKey(event.startDate).getTime();
  const e = parseDateKey(event.endDate).getTime();
  const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const eventToCalendarItem = (event: FamilyEvent): UnifiedCalendarItem => ({
  id: event.id,
  source: 'event',
  title: event.title,
  description: event.description,
  startDate: event.startDate,
  startTime: event.startTime,
  endDate: event.endDate,
  endTime: event.endTime,
  allDay: event.allDay,
  category: event.category,
  location: event.location,
  assignedMemberIds: event.assignedMemberIds,
  status: event.status,
  color: getCategoryColor(event.category),
  rawEntity: event,
  createdBy: event.createdBy,
  createdByName: event.createdByName,
});

export const getCategoryColor = (category: string): string => {
  switch (category?.toLowerCase()) {
    case 'birthday':
      return 'bg-pink-500 text-white';
    case 'anniversary':
      return 'bg-purple-500 text-white';
    case 'school':
      return 'bg-emerald-500 text-white';
    case 'medical':
    case 'appointment':
      return 'bg-rose-500 text-white';
    case 'bill':
    case 'bills':
      return 'bg-amber-500 text-white';
    case 'family':
      return 'bg-indigo-500 text-white';
    case 'travel':
      return 'bg-cyan-500 text-white';
    case 'home':
      return 'bg-teal-500 text-white';
    case 'work':
      return 'bg-blue-500 text-white';
    case 'holiday':
      return 'bg-red-500 text-white';
    case 'urgent':
      return 'bg-rose-600 text-white animate-pulse';
    case 'note':
    case 'notes':
      return 'bg-violet-500 text-white';
    case 'reminder':
      return 'bg-orange-500 text-white';
    default:
      return 'bg-slate-600 text-white';
  }
};
