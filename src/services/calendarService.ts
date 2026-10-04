import {
  FamilyEvent,
  FamilyReminder,
  FamilyMemberProfile,
  Child,
  MedicalAppointment,
  Bill,
  FamilyNote,
  CalendarSettings,
  CalendarFilter,
  UnifiedCalendarItem,
  User,
} from '../types';
import {
  formatDateKey,
  parseDateKey,
  addDays,
  expandRecurringEvent,
  getCategoryColor,
} from '../utils/recurrenceUtils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

class CalendarService {
  private checkedReminderKeys = new Set<string>();

  /**
   * Builds the complete unified calendar item list by assembling events,
   * reminders, birthdays, school items, medical appointments, bills, and notes.
   */
  getUnifiedCalendarItems(params: {
    events: FamilyEvent[];
    reminders: FamilyReminder[];
    members: FamilyMemberProfile[];
    children: Child[];
    medicalAppointments: MedicalAppointment[];
    bills: Bill[];
    notes: FamilyNote[];
    settings: CalendarSettings;
    windowStart: Date;
    windowEnd: Date;
  }): UnifiedCalendarItem[] {
    const {
      events,
      reminders,
      members,
      children,
      medicalAppointments,
      bills,
      notes,
      settings,
      windowStart,
      windowEnd,
    } = params;

    const items: UnifiedCalendarItem[] = [];

    // 1. Native Family Events (including recurring event expansion)
    for (const ev of events) {
      if (ev.status === 'cancelled') continue;
      const expanded = expandRecurringEvent(ev, windowStart, windowEnd);
      items.push(...expanded);
    }

    // 2. Native Family Reminders
    if (settings.showReminders) {
      const todayStr = formatDateKey(new Date());
      for (const rem of reminders) {
        if (rem.status === 'cancelled') continue;
        const isOverdue = rem.dueDate < todayStr && rem.status !== 'completed';
        items.push({
          id: `reminder_${rem.id}`,
          source: 'reminder',
          title: rem.title,
          description: rem.description,
          startDate: rem.dueDate,
          startTime: rem.dueTime,
          allDay: !rem.dueTime,
          category: 'Reminder',
          assignedMemberIds: rem.assignedMemberIds,
          status: isOverdue ? 'overdue' : rem.status,
          color: rem.status === 'completed' ? 'bg-slate-400 text-white' : isOverdue ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white',
          rawEntity: rem,
          createdBy: rem.createdBy,
          createdByName: rem.createdByName,
        });
      }
    }

    // 3. Birthdays (calculated dynamically from DOB without duplicate Firestore docs)
    if (settings.showBirthdays) {
      const startYear = windowStart.getFullYear();
      const endYear = windowEnd.getFullYear();

      // Member Profiles
      for (const m of members) {
        if (m.dateOfBirth && m.status !== 'archived') {
          for (let yr = startYear; yr <= endYear; yr++) {
            const bdayKey = this.computeBirthdayForYear(m.dateOfBirth, yr);
            if (bdayKey) {
              const bdayDate = parseDateKey(bdayKey);
              if (bdayDate >= windowStart && bdayDate <= windowEnd) {
                const age = yr - parseInt(m.dateOfBirth.split('-')[0], 10);
                items.push({
                  id: `bday_member_${m.id}_${yr}`,
                  source: 'birthday',
                  title: `🎂 ${m.fullName}'s Birthday${age > 0 ? ` (${age})` : ''}`,
                  description: `Celebrate ${m.nickname ? `${m.fullName} (${m.nickname})` : m.fullName}'s birthday!`,
                  startDate: bdayKey,
                  allDay: true,
                  category: 'Birthday',
                  status: 'scheduled',
                  color: 'bg-pink-500 text-white',
                  isVirtual: true,
                  rawEntity: m,
                });
              }
            }
          }
        }
      }

      // Children
      for (const c of children) {
        if (c.dateOfBirth) {
          for (let yr = startYear; yr <= endYear; yr++) {
            const bdayKey = this.computeBirthdayForYear(c.dateOfBirth, yr);
            if (bdayKey) {
              const bdayDate = parseDateKey(bdayKey);
              if (bdayDate >= windowStart && bdayDate <= windowEnd) {
                const age = yr - parseInt(c.dateOfBirth.split('-')[0], 10);
                items.push({
                  id: `bday_child_${c.id}_${yr}`,
                  source: 'birthday',
                  title: `🎂 ${c.fullName}'s Birthday${age > 0 ? ` (${age})` : ''}`,
                  description: `Child birthday celebration for ${c.fullName}`,
                  startDate: bdayKey,
                  allDay: true,
                  category: 'Birthday',
                  status: 'scheduled',
                  color: 'bg-pink-500 text-white',
                  isVirtual: true,
                  rawEntity: c,
                });
              }
            }
          }
        }
      }
    }

    // 4. Medical Appointments (privacy-respecting minimal wording)
    if (settings.showMedical) {
      for (const appt of medicalAppointments) {
        if (appt.status === 'Cancelled') continue;
        const apptDate = parseDateKey(appt.date);
        if (apptDate >= windowStart && apptDate <= windowEnd) {
          items.push({
            id: `medical_${appt.id}`,
            source: 'medical',
            title: `🩺 Doctor Appointment: ${appt.doctorName || 'Provider'}`,
            description: `Appointment for ${appt.personName || 'Family Member'} at ${appt.hospitalClinic || 'Clinic'}`,
            startDate: appt.date,
            startTime: appt.time,
            allDay: !appt.time,
            category: 'Medical',
            location: appt.hospitalClinic,
            status: appt.status === 'Completed' ? 'completed' : 'scheduled',
            color: 'bg-rose-500 text-white',
            linkedEntityType: 'medical',
            linkedEntityId: appt.id,
            rawEntity: appt,
          });
        }
      }
    }

    // 5. School Fee Due Dates
    if (settings.showSchool) {
      for (const c of children) {
        if (c.feeDueDate && c.schoolName) {
          // If feeDueDate is day of month (e.g. 5 or "5"), format for current viewing month
          let feeDateStr = String(c.feeDueDate);
          if (!feeDateStr.includes('-')) {
            const dayNum = String(parseInt(feeDateStr, 10) || 5).padStart(2, '0');
            const viewMonth = String(windowStart.getMonth() + 1).padStart(2, '0');
            feeDateStr = `${windowStart.getFullYear()}-${viewMonth}-${dayNum}`;
          }

          const feeDate = parseDateKey(feeDateStr);
          if (feeDate >= windowStart && feeDate <= windowEnd) {
            items.push({
              id: `school_fee_${c.id}_${feeDateStr}`,
              source: 'school',
              title: `📚 School Fee Due: ${c.fullName}`,
              description: `${c.schoolName} monthly tuition fee due (${c.tuitionFee ? `$${c.tuitionFee}` : ''})`,
              startDate: feeDateStr,
              allDay: true,
              category: 'School',
              location: c.schoolName,
              status: 'pending',
              color: 'bg-emerald-600 text-white',
              linkedEntityType: 'school',
              linkedEntityId: c.id,
              rawEntity: c,
            });
          }
        }
      }
    }

    // 6. Bill Due Dates (unpaid/pending/overdue bills)
    if (settings.showBills) {
      const todayStr = formatDateKey(new Date());
      for (const bill of bills) {
        if (bill.status === 'Cancelled') continue;
        const billDate = parseDateKey(bill.dueDate);
        if (billDate >= windowStart && billDate <= windowEnd) {
          const isOverdue = bill.dueDate < todayStr && bill.status !== 'Paid';
          items.push({
            id: `bill_${bill.id}`,
            source: 'bill',
            title: `💳 ${bill.providerName} Bill Due (${bill.currency} ${bill.amount.toLocaleString()})`,
            description: `${bill.billTypeName} bill due on ${bill.dueDate}. Remaining: ${bill.currency} ${bill.remainingAmount.toLocaleString()}`,
            startDate: bill.dueDate,
            allDay: true,
            category: 'Bills',
            status: bill.status === 'Paid' ? 'paid' : isOverdue ? 'overdue' : 'pending',
            color: bill.status === 'Paid' ? 'bg-emerald-500 text-white' : isOverdue ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white',
            linkedEntityType: 'bill',
            linkedEntityId: bill.id,
            rawEntity: bill,
          });
        }
      }
    }

    // 7. Notes with Due Dates & Urgent Needs
    if (settings.showNotes || settings.showUrgentNeeds) {
      for (const note of notes) {
        if (note.deletedAt || !note.dueDate) continue;

        const isUrgent = note.priority === 'urgent' || note.type === 'urgent';
        if (isUrgent && !settings.showUrgentNeeds) continue;
        if (!isUrgent && !settings.showNotes) continue;

        const noteDate = parseDateKey(note.dueDate);
        if (noteDate >= windowStart && noteDate <= windowEnd) {
          items.push({
            id: `note_${note.id}`,
            source: isUrgent ? 'urgent' : 'note',
            title: isUrgent ? `🚨 URGENT: ${note.title}` : `📝 ${note.title}`,
            description: note.content || note.description,
            startDate: note.dueDate,
            allDay: true,
            category: isUrgent ? 'Urgent' : 'Notes',
            assignedMemberIds: note.assignedToMemberId ? [note.assignedToMemberId] : [],
            status: note.status === 'completed' ? 'completed' : 'pending',
            color: isUrgent ? 'bg-rose-600 text-white font-bold' : 'bg-violet-500 text-white',
            linkedEntityType: 'note',
            linkedEntityId: note.id,
            rawEntity: note,
          });
        }
      }
    }

    // Sort chronologically: date first, then allDay first, then time
    items.sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    return items;
  }

  /**
   * Computes yearly birthday date string (YYYY-MM-DD) for a given year
   */
  private computeBirthdayForYear(dob: string, year: number): string | null {
    if (!dob) return null;
    const parts = dob.split('-');
    if (parts.length < 3) return null;
    const month = parts[1];
    const day = parts[2];
    return `${year}-${month}-${day}`;
  }

  /**
   * Applies client-side search and filters to unified calendar items
   */
  filterItems(items: UnifiedCalendarItem[], filter: CalendarFilter): UnifiedCalendarItem[] {
    return items.filter((item) => {
      // Category filter
      if (filter.category !== 'all' && item.category?.toLowerCase() !== filter.category.toLowerCase()) {
        return false;
      }

      // Source filter
      if (filter.source !== 'all' && item.source !== filter.source) {
        return false;
      }

      // Assigned member filter
      if (
        filter.assignedMemberId &&
        filter.assignedMemberId !== 'all' &&
        (!item.assignedMemberIds || !item.assignedMemberIds.includes(filter.assignedMemberId))
      ) {
        return false;
      }

      // Status filter
      if (filter.status !== 'all') {
        if (filter.status === 'completed' && item.status !== 'completed' && item.status !== 'paid') {
          return false;
        }
        if (filter.status === 'pending' && item.status !== 'pending' && item.status !== 'scheduled' && item.status !== 'overdue') {
          return false;
        }
        if (filter.status === 'overdue' && item.status !== 'overdue') {
          return false;
        }
      }

      // Search query
      if (filter.searchQuery.trim()) {
        const queryLower = filter.searchQuery.toLowerCase().trim();
        const matchesTitle = item.title?.toLowerCase().includes(queryLower);
        const matchesDesc = item.description?.toLowerCase().includes(queryLower);
        const matchesLoc = item.location?.toLowerCase().includes(queryLower);
        const matchesCat = item.category?.toLowerCase().includes(queryLower);
        const matchesCreator = item.createdByName?.toLowerCase().includes(queryLower);

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesCat && !matchesCreator) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Checks for upcoming events and reminders and dispatches notifications
   * with strict deduplication keys.
   */
  async checkAndDispatchReminders(
    familyId: string,
    items: UnifiedCalendarItem[],
    currentUser: User
  ): Promise<void> {
    if (!familyId || !currentUser) return;

    const todayStr = formatDateKey(new Date());
    const tomorrowStr = formatDateKey(addDays(new Date(), 1));

    for (const item of items) {
      if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'paid') {
        continue;
      }

      let reminderType: string | null = null;
      let title = '';
      let message = '';

      if (item.startDate === todayStr) {
        reminderType = 'due_today';
        title = `Today: ${item.title}`;
        message = item.allDay
          ? `All day: ${item.title}`
          : `At ${item.startTime || 'today'}: ${item.title}`;
      } else if (item.startDate === tomorrowStr) {
        reminderType = 'due_tomorrow';
        title = `Tomorrow: ${item.title}`;
        message = item.allDay
          ? `Tomorrow: ${item.title}`
          : `Tomorrow at ${item.startTime || 'scheduled time'}: ${item.title}`;
      }

      if (!reminderType) continue;

      const dedupeKey = `cal_rem_${familyId}_${item.id}_${reminderType}_${currentUser.id}`;
      if (this.checkedReminderKeys.has(dedupeKey)) continue;
      this.checkedReminderKeys.add(dedupeKey);

      try {
        const notifRef = doc(db, 'notifications', dedupeKey);
        const snap = await getDoc(notifRef);
        if (snap.exists()) continue;

        await setDoc(notifRef, {
          id: dedupeKey,
          recipientUserId: currentUser.id,
          familyId,
          type: 'event_reminder',
          title,
          message,
          createdAt: new Date().toISOString(),
          readAt: null,
          linkRoute: 'planner',
        });
      } catch (err) {
        // Suppress failure
      }
    }
  }

  /**
   * Export items as CSV string
   */
  exportToCsv(items: UnifiedCalendarItem[]): string {
    const headers = ['Title', 'Source', 'Category', 'Date', 'Time', 'All Day', 'Location', 'Status'];
    const rows = items.map((i) => [
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${i.source}"`,
      `"${i.category || ''}"`,
      `"${i.startDate}"`,
      `"${i.startTime || (i.allDay ? 'All Day' : '')}"`,
      `"${i.allDay ? 'Yes' : 'No'}"`,
      `"${(i.location || '').replace(/"/g, '""')}"`,
      `"${i.status}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const calendarService = new CalendarService();
