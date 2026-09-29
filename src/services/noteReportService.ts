import { FamilyNote, NoteFilter, NotesSummary } from '../types';

class NoteReportService {
  /**
   * Generates summary statistics from live notes
   */
  calculateSummary(notes: FamilyNote[], informationCount: number = 0): NotesSummary {
    const todayStr = new Date().toISOString().split('T')[0];

    let totalNotes = 0;
    let importantCount = 0;
    let urgentCount = 0;
    let pendingNeedsCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let completedCount = 0;
    let archivedCount = 0;

    notes.forEach((note) => {
      if (note.deletedAt) return;

      if (note.isArchived) {
        archivedCount += 1;
        return; // Don't count archived notes in active dashboard metrics
      }

      totalNotes += 1;

      if (note.type === 'important' || note.priority === 'urgent') {
        importantCount += 1;
      }

      if (note.type === 'urgent') {
        urgentCount += 1;
      }

      if (note.status === 'pending') {
        pendingNeedsCount += 1;
      }

      if (note.status === 'completed') {
        completedCount += 1;
      }

      // Date status checks (only for uncompleted/uncancelled items)
      if (note.dueDate && note.status !== 'completed' && note.status !== 'cancelled') {
        if (note.dueDate === todayStr) {
          dueTodayCount += 1;
        } else if (note.dueDate < todayStr) {
          overdueCount += 1;
        }
      }
    });

    return {
      totalNotes,
      importantCount,
      urgentCount,
      pendingNeedsCount,
      dueTodayCount,
      overdueCount,
      completedCount,
      archivedCount,
      informationCount,
    };
  }

  /**
   * Filters and sorts notes according to user criteria
   */
  filterAndSortNotes(notes: FamilyNote[], filter: NoteFilter): FamilyNote[] {
    const todayStr = new Date().toISOString().split('T')[0];
    const query = filter.searchQuery?.trim().toLowerCase();

    // Calculate window dates
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const d7Str = d7.toISOString().split('T')[0];

    const d14 = new Date();
    d14.setDate(d14.getDate() + 14);
    const d14Str = d14.toISOString().split('T')[0];

    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    const d30Str = d30.toISOString().split('T')[0];

    return notes.filter((note) => {
      if (note.deletedAt) return false;

      // Archive filter
      if (filter.isArchived !== undefined) {
        if (!!note.isArchived !== filter.isArchived) return false;
      } else {
        // By default show only non-archived unless explicitly filtering
        if (note.isArchived) return false;
      }

      // Pinned filter
      if (filter.isPinned !== undefined && !!note.isPinned !== filter.isPinned) {
        return false;
      }

      // Type filter
      if (filter.type && filter.type !== 'all' && note.type !== filter.type) {
        return false;
      }

      // Category filter
      if (filter.category && filter.category !== 'all') {
        if (
          note.categoryId !== filter.category &&
          note.categoryName?.toLowerCase() !== filter.category.toLowerCase()
        ) {
          return false;
        }
      }

      // Priority filter
      if (filter.priority && filter.priority !== 'all' && note.priority !== filter.priority) {
        return false;
      }

      // Status filter
      if (filter.status && filter.status !== 'all' && note.status !== filter.status) {
        return false;
      }

      // Assigned to member
      if (filter.assignedToMemberId && note.assignedToMemberId !== filter.assignedToMemberId) {
        return false;
      }

      // Linked person
      if (filter.linkedPersonId && note.linkedPersonId !== filter.linkedPersonId) {
        return false;
      }

      // Due date range filter
      if (filter.dueDateRange && filter.dueDateRange !== 'all') {
        if (!note.dueDate) {
          if (filter.dueDateRange === 'no_date') return true;
          return false;
        }
        if (filter.dueDateRange === 'today' && note.dueDate !== todayStr) return false;
        if (filter.dueDateRange === 'overdue' && (note.dueDate >= todayStr || note.status === 'completed')) return false;
        if (filter.dueDateRange === 'upcoming_7' && (note.dueDate < todayStr || note.dueDate > d7Str)) return false;
        if (filter.dueDateRange === 'upcoming_14' && (note.dueDate < todayStr || note.dueDate > d14Str)) return false;
        if (filter.dueDateRange === 'upcoming_30' && (note.dueDate < todayStr || note.dueDate > d30Str)) return false;
      }

      // Search query
      if (query) {
        const titleMatch = (note.title || '').toLowerCase().includes(query);
        const descMatch = (note.description || note.content || '').toLowerCase().includes(query);
        const catMatch = (note.categoryName || note.categoryId || '').toLowerCase().includes(query);
        const assigneeMatch = (note.assignedToMemberName || '').toLowerCase().includes(query);
        const linkedMatch = (note.linkedPersonName || '').toLowerCase().includes(query);

        if (!titleMatch && !descMatch && !catMatch && !assigneeMatch && !linkedMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Pinned notes always surface to top unless sorting specifically
      if (filter.sortBy !== 'due_date' && filter.sortBy !== 'priority') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }

      switch (filter.sortBy) {
        case 'newest': {
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        case 'oldest': {
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return timeA - timeB;
        }
        case 'due_date': {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        }
        case 'priority': {
          const priorityScore: Record<string, number> = {
            urgent: 4,
            high: 3,
            normal: 2,
            low: 1,
          };
          const scoreB = priorityScore[b.priority || 'normal'] || 0;
          const scoreA = priorityScore[a.priority || 'normal'] || 0;
          return scoreB - scoreA;
        }
        case 'recently_updated':
        default: {
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          return timeB - timeA;
        }
      }
    });
  }
}

export const noteReportService = new NoteReportService();
