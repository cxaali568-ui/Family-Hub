import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import {
  FamilyNote,
  NoteCategory,
  FamilyInformation,
  NoteType,
  NotePriority,
  NoteStatus,
  NotesSummary,
  FamilyMemberProfile,
  Child,
} from '../../types';
import { noteService } from '../../services/noteService';
import { noteCategoryService } from '../../services/noteCategoryService';
import { familyInformationService } from '../../services/familyInformationService';
import { noteReportService } from '../../services/noteReportService';
import { memberProfileService } from '../../services/memberProfileService';
import { childService } from '../../services/childService';

import { AddNoteModal } from './AddNoteModal';
import { NoteDetailModal } from './NoteDetailModal';
import { AddFamilyInfoModal } from './AddFamilyInfoModal';
import { FamilyInfoDetailModal } from './FamilyInfoDetailModal';
import { ManageNoteCategoriesModal } from './ManageNoteCategoriesModal';

import {
  FileText,
  Plus,
  AlertTriangle,
  Pin,
  Calendar,
  CheckCircle,
  Clock,
  User as UserIcon,
  Search,
  Filter,
  Download,
  Printer,
  Tag,
  Paperclip,
  Archive,
  Phone,
  Home,
  ShieldAlert,
  Zap,
  Car,
  Plane,
  ChevronDown,
  Info,
  Check,
  AlertCircle,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';

export const FamilyNotesDashboard: React.FC = () => {
  const { currentFamily, familyMembership, members: familyMembers } = useFamily();
  const { user } = useAuth();

  const familyId = currentFamily?.id || '';

  // Data states
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [informationList, setInformationList] = useState<FamilyInformation[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [addNoteDefaultType, setAddNoteDefaultType] = useState<NoteType>('general');
  const [selectedNote, setSelectedNote] = useState<FamilyNote | null>(null);

  const [isAddInfoOpen, setIsAddInfoOpen] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<FamilyInformation | null>(null);

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'urgent' | 'important' | 'pending' | 'due_today' | 'completed' | 'information' | 'archived'
  >('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | NotePriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'recently_updated' | 'newest' | 'oldest' | 'due_date' | 'priority'>('recently_updated');
  const [upcomingDaysWindow, setUpcomingDaysWindow] = useState<7 | 14 | 30>(7);

  // Pagination (Section 66: 20 per load)
  const [visibleCount, setVisibleCount] = useState(20);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Real-time Subscriptions
  useEffect(() => {
    if (!familyId) return;

    setLoading(true);

    // Initialize default categories if needed
    if (user) {
      noteCategoryService.initDefaultCategories(familyId, user);
    }

    const unsubNotes = noteService.subscribeNotes(familyId, (liveNotes) => {
      setNotes(liveNotes);
      setLoading(false);
    });

    const unsubCategories = noteCategoryService.subscribeCategories(familyId, (liveCats) => {
      setCategories(liveCats);
    });

    const unsubInfo = familyInformationService.subscribeInformation(familyId, (liveInfo) => {
      setInformationList(liveInfo);
    });

    const unsubProfiles = memberProfileService.subscribeMemberProfiles(familyId, (profiles) => {
      setMemberProfiles(profiles);
    });

    const unsubChildren = childService.subscribeChildren(familyId, (children) => {
      setChildrenList(children);
    });

    return () => {
      unsubNotes();
      unsubCategories();
      unsubInfo();
      unsubProfiles();
      unsubChildren();
    };
  }, [familyId, user?.id]);

  // Sync selectedNote if live notes update
  useEffect(() => {
    if (selectedNote) {
      const refreshed = notes.find((n) => n.id === selectedNote.id);
      if (refreshed) setSelectedNote(refreshed);
    }
  }, [notes]);

  // Calculate live summary
  const summary: NotesSummary = useMemo(() => {
    return noteReportService.calculateSummary(notes, informationList.length);
  }, [notes, informationList.length]);

  // Filtered and Sorted notes
  const filteredNotes = useMemo(() => {
    const isArchivedTab = activeTab === 'archived';

    return noteReportService.filterAndSortNotes(notes, {
      type:
        activeTab === 'urgent'
          ? 'urgent'
          : activeTab === 'important'
          ? 'important'
          : 'all',
      status:
        activeTab === 'pending'
          ? 'pending'
          : activeTab === 'completed'
          ? 'completed'
          : 'all',
      dueDateRange: activeTab === 'due_today' ? 'today' : 'all',
      category: categoryFilter,
      priority: priorityFilter,
      assignedToMemberId: assigneeFilter !== 'all' ? assigneeFilter : undefined,
      isArchived: isArchivedTab ? true : false,
      searchQuery,
      sortBy,
    });
  }, [notes, activeTab, categoryFilter, priorityFilter, assigneeFilter, searchQuery, sortBy]);

  // Slice for pagination
  const displayedNotes = useMemo(() => {
    return filteredNotes.slice(0, visibleCount);
  }, [filteredNotes, visibleCount]);

  // Urgent items for dedicated top alert section
  const urgentNeedsList = useMemo(() => {
    return notes.filter(
      (n) =>
        !n.deletedAt &&
        !n.isArchived &&
        n.type === 'urgent' &&
        n.status !== 'completed' &&
        n.status !== 'cancelled'
    );
  }, [notes]);

  // Pinned items
  const pinnedNotesList = useMemo(() => {
    return notes.filter(
      (n) => !n.deletedAt && !n.isArchived && n.isPinned && n.type !== 'urgent'
    );
  }, [notes]);

  // Due today items
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTodayList = useMemo(() => {
    return notes.filter(
      (n) =>
        !n.deletedAt &&
        !n.isArchived &&
        n.dueDate === todayStr &&
        n.status !== 'completed' &&
        n.status !== 'cancelled'
    );
  }, [notes, todayStr]);

  // Upcoming items within window
  const upcomingList = useMemo(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + upcomingDaysWindow);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    return notes.filter(
      (n) =>
        !n.deletedAt &&
        !n.isArchived &&
        n.dueDate &&
        n.dueDate > todayStr &&
        n.dueDate <= maxDateStr &&
        n.status !== 'completed' &&
        n.status !== 'cancelled'
    );
  }, [notes, todayStr, upcomingDaysWindow]);

  // Filtered Information records
  const filteredInformation = useMemo(() => {
    if (!searchQuery.trim()) return informationList;
    const q = searchQuery.toLowerCase();
    return informationList.filter(
      (item) =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.value || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.contactName || '').toLowerCase().includes(q)
    );
  }, [informationList, searchQuery]);

  // Quick Open Handlers
  const handleOpenAdd = (type: NoteType = 'general') => {
    setAddNoteDefaultType(type);
    setIsAddNoteOpen(true);
  };

  const handleStatusToggle = async (note: FamilyNote, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const nextStatus: NoteStatus = note.status === 'completed' ? 'pending' : 'completed';
    try {
      await noteService.updateStatus(familyId, note.id, nextStatus, user);
      showToast(nextStatus === 'completed' ? '✓ Marked as Completed' : 'Marked as Pending');
    } catch (err) {
      console.warn('Status change error:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Family Notes & Needs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {currentFamily?.name || 'Family Space'} • Important instructions, urgent needs & family information center.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleOpenAdd('urgent')}
            icon={<AlertTriangle className="w-4 h-4" />}
          >
            + Urgent Need
          </Button>

          <Button
            size="sm"
            variant="urgent"
            onClick={() => handleOpenAdd('important')}
            icon={<Pin className="w-4 h-4" />}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            + Important
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenAdd('general')}
            icon={<Plus className="w-4 h-4" />}
          >
            + Add Note
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddInfoOpen(true)}
            icon={<Info className="w-4 h-4" />}
          >
            + Family Info
          </Button>

          <div className="relative inline-block">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCategoriesOpen(true)}
              icon={<Tag className="w-4 h-4" />}
              title="Manage Categories"
            >
              Tags
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => noteService.exportNotesToCSV(notes, currentFamily?.name)}
            icon={<Download className="w-4 h-4" />}
            title="Export CSV"
          >
            Export
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => noteService.printNotes(filteredNotes, 'Family Notes', currentFamily?.name)}
            icon={<Printer className="w-4 h-4" />}
            title="Print Notes"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards (Section 3: Real Firestore calculated) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          onClick={() => setActiveTab('all')}
          className={`p-4 transition-all cursor-pointer border ${
            activeTab === 'all'
              ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
              : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">Total Notes</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {summary.totalNotes}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.completedCount} completed
          </p>
        </Card>

        <Card
          onClick={() => setActiveTab('important')}
          className={`p-4 transition-all cursor-pointer border ${
            activeTab === 'important'
              ? 'border-amber-500 shadow-md ring-1 ring-amber-500/20'
              : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
            <span className="font-bold">Important</span>
            <Pin className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
            {summary.importantCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Pinned & high priority
          </p>
        </Card>

        <Card
          onClick={() => setActiveTab('urgent')}
          className={`p-4 transition-all cursor-pointer border ${
            activeTab === 'urgent'
              ? 'border-rose-500 shadow-md ring-1 ring-rose-500/20'
              : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 mb-1">
            <span className="font-bold">Urgent Needs</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {summary.urgentCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.overdueCount > 0 ? (
              <span className="text-rose-500 font-bold">{summary.overdueCount} overdue</span>
            ) : (
              'Time-sensitive'
            )}
          </p>
        </Card>

        <Card
          onClick={() => setActiveTab('pending')}
          className={`p-4 transition-all cursor-pointer border ${
            activeTab === 'pending'
              ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20'
              : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 mb-1">
            <span className="font-bold">Pending Needs</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {summary.pendingNeedsCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.dueTodayCount > 0 ? `${summary.dueTodayCount} due today` : 'Actionable tasks'}
          </p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, description, category, assignee, or person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Assignees</option>
              {memberProfiles.map((m) => (
                <option key={m.id} value={m.userId || m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Notes' },
            { id: 'urgent', label: `Urgent (${summary.urgentCount})` },
            { id: 'important', label: `Important (${summary.importantCount})` },
            { id: 'pending', label: `Pending (${summary.pendingNeedsCount})` },
            { id: 'due_today', label: `Due Today (${summary.dueTodayCount})` },
            { id: 'completed', label: `Completed (${summary.completedCount})` },
            { id: 'information', label: `Family Info (${summary.informationCount})` },
            { id: 'archived', label: `Archive (${summary.archivedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setVisibleCount(20);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* ============================================================== */}
      {/* SECTION A: URGENT NEEDS (Section 7, 8, 45) */}
      {/* ============================================================== */}
      {activeTab !== 'information' && activeTab !== 'archived' && urgentNeedsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
              Active Urgent Needs ({urgentNeedsList.length})
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenAdd('urgent')}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              + Quick Urgent Need
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentNeedsList.map((item) => {
              const overdue =
                item.dueDate &&
                item.dueDate < todayStr &&
                item.status !== 'completed' &&
                item.status !== 'cancelled';

              return (
                <Card
                  key={item.id}
                  onClick={() => setSelectedNote(item)}
                  className="p-4 border-l-4 border-l-rose-500 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          {(item.priority || 'normal').toUpperCase()}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.categoryName || item.categoryId}
                        </span>
                      </div>

                      {overdue ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                          Overdue
                        </span>
                      ) : item.dueDate === todayStr ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          Due Today
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {item.title}
                    </h3>
                    {(item.description || item.content) && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {item.description || item.content}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500">
                      {item.assignedToMemberName && (
                        <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                          <UserIcon className="w-3 h-3" /> {item.assignedToMemberName}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" /> {item.dueDate}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleStatusToggle(item, e)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                        item.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}
                    >
                      {item.status === 'completed' ? '✓ Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION B: PINNED IMPORTANT NOTES (Section 15, 16) */}
      {/* ============================================================== */}
      {activeTab === 'all' && pinnedNotesList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Pin className="w-4 h-4 text-amber-600" />
            Pinned Notes ({pinnedNotesList.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedNotesList.map((item) => (
              <Card
                key={item.id}
                onClick={() => setSelectedNote(item)}
                className="p-4 bg-amber-50/40 dark:bg-slate-900 border-amber-200 dark:border-amber-900/40 hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {item.categoryName || item.categoryId}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {item.title}
                  </h3>
                  {(item.description || item.content) && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {item.description || item.content}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-amber-200/50 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>By {item.createdByName || item.authorName || 'Family'}</span>
                  {item.attachments && item.attachments.length > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-indigo-600">
                      <Paperclip className="w-3 h-3" /> {item.attachments.length}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION C: DUE TODAY (Section 40) */}
      {/* ============================================================== */}
      {activeTab === 'all' && dueTodayList.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              Due Today ({dueTodayList.length} items)
            </h3>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
              Today: {todayStr}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {dueTodayList.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNote(item)}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-between text-xs cursor-pointer hover:shadow-xs transition-shadow"
              >
                <div className="truncate mr-2">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {item.assignedToMemberName ? `Assignee: ${item.assignedToMemberName}` : item.categoryName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleStatusToggle(item, e)}
                  className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                  title="Mark complete"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION D: FAMILY INFORMATION CENTER (Section 24-29) */}
      {/* ============================================================== */}
      {(activeTab === 'information' || (activeTab === 'all' && filteredInformation.length > 0)) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="w-4 h-4 text-indigo-600" />
                Family Information & Emergency Board ({filteredInformation.length})
              </h2>
              <p className="text-xs text-slate-500">
                Quick-reference house rules, Wi-Fi keys, trusted plumber/doctor contacts, and utilities.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => familyInformationService.exportToCSV(informationList, currentFamily?.name)}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                CSV
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAddInfoOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                + Add Info
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredInformation.map((info) => {
              const isContact =
                info.category === 'Important Contacts' || info.category === 'Emergency Information';

              return (
                <Card
                  key={info.id}
                  onClick={() => setSelectedInfo(info)}
                  className="p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        {info.category}
                      </span>
                      {info.isPinned && (
                        <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {info.title}
                    </h3>

                    {isContact && (info.contactPhone || info.contactName) ? (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-emerald-950 dark:text-emerald-100 truncate">
                            {info.contactName || info.title}
                          </p>
                          <p className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 truncate">
                            {info.contactPhone}
                          </p>
                        </div>
                        {info.contactPhone && (
                          <a
                            href={`tel:${info.contactPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                            title="Call now"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      info.value && (
                        <p className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 truncate select-all">
                          {info.value}
                        </p>
                      )
                    )}

                    {info.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                        {info.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>By {info.createdByName || 'Member'}</span>
                    {info.attachments && info.attachments.length > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-indigo-600">
                        <Paperclip className="w-3 h-3" /> {info.attachments.length}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION E: GENERAL & HOUSEHOLD NOTES (Section 5, 45) */}
      {/* ============================================================== */}
      {activeTab !== 'information' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
              {activeTab === 'archived'
                ? `Archived Notes (${displayedNotes.length})`
                : activeTab === 'completed'
                ? `Completed History (${displayedNotes.length})`
                : activeTab === 'urgent'
                ? `All Urgent Needs (${displayedNotes.length})`
                : activeTab === 'important'
                ? `Important Notes (${displayedNotes.length})`
                : `Active Family Notes & Lists (${displayedNotes.length})`}
            </h2>

            {/* Pagination stats */}
            <span className="text-xs text-slate-500">
              Showing {displayedNotes.length} of {filteredNotes.length}
            </span>
          </div>

          {displayedNotes.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-8 h-8 text-slate-400" />}
              title={
                activeTab === 'archived'
                  ? 'No archived notes.'
                  : activeTab === 'urgent'
                  ? 'No urgent needs right now.'
                  : activeTab === 'important'
                  ? 'No important notes tagged.'
                  : 'No family notes found.'
              }
              description={
                searchQuery
                  ? 'No notes match your current search query or filter.'
                  : 'Keep your household organized with checklists, instructions, and reminders.'
              }
              actionLabel="+ Add First Note"
              onAction={() => handleOpenAdd('general')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedNotes.map((note) => {
                const overdue =
                  note.dueDate &&
                  note.dueDate < todayStr &&
                  note.status !== 'completed' &&
                  note.status !== 'cancelled';

                return (
                  <Card
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-4 flex flex-col justify-between transition-all cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 ${
                      note.status === 'completed' ? 'opacity-80 bg-slate-50/50 dark:bg-slate-900/50' : ''
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {note.categoryName || note.categoryId}
                          </span>

                          <Badge
                            variant={
                              note.type === 'urgent'
                                ? 'danger'
                                : note.type === 'important'
                                ? 'warning'
                                : 'secondary'
                            }
                          >
                            {(note.type || 'general').toUpperCase()}
                          </Badge>
                        </div>

                        {/* Status / Overdue Badge */}
                        {overdue ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                            Overdue
                          </span>
                        ) : note.status === 'completed' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            ✓ Done
                          </span>
                        ) : note.status === 'in_progress' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            In Progress
                          </span>
                        ) : note.isPinned ? (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                            <Pin className="w-3 h-3" />
                          </span>
                        ) : null}
                      </div>

                      {/* Title & Body */}
                      <h3
                        className={`text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 ${
                          note.status === 'completed' ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {note.title}
                      </h3>

                      {(note.description || note.content) && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {note.description || note.content}
                        </p>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {note.assignedToMemberName ? (
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]">
                            @{note.assignedToMemberName}
                          </span>
                        ) : (
                          <span className="truncate max-w-[120px]">
                            {note.createdByName || note.authorName || 'Family'}
                          </span>
                        )}

                        {note.dueDate && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {note.dueDate}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {note.attachments && note.attachments.length > 0 && (
                          <span className="flex items-center gap-0.5 font-semibold text-indigo-600">
                            <Paperclip className="w-3 h-3" /> {note.attachments.length}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleStatusToggle(note, e)}
                          className={`p-1 rounded-lg transition-colors cursor-pointer ${
                            note.status === 'completed'
                              ? 'text-emerald-600 hover:text-slate-400'
                              : 'text-slate-400 hover:text-emerald-600'
                          }`}
                          title={note.status === 'completed' ? 'Mark pending' : 'Mark completed'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Load More Pagination (Section 66) */}
          {displayedNotes.length < filteredNotes.length && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                icon={<ChevronDown className="w-4 h-4" />}
              >
                Load More ({filteredNotes.length - displayedNotes.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddNoteModal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        defaultType={addNoteDefaultType}
        categories={categories}
        members={memberProfiles}
        childrenList={childrenList}
        currentUser={user!}
        familyId={familyId}
        onSuccess={(newNote) => {
          showToast(`Note "${newNote.title}" created successfully.`);
        }}
      />

      <NoteDetailModal
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        note={selectedNote}
        categories={categories}
        members={memberProfiles}
        childrenList={childrenList}
        currentUser={user!}
        familyId={familyId}
        onUpdate={() => {
          showToast('Note updated.');
        }}
      />

      <AddFamilyInfoModal
        isOpen={isAddInfoOpen}
        onClose={() => setIsAddInfoOpen(false)}
        currentUser={user!}
        familyId={familyId}
        members={memberProfiles}
        childrenList={childrenList}
        onSuccess={(info) => {
          showToast(`Family information "${info.title}" added.`);
        }}
      />

      <FamilyInfoDetailModal
        isOpen={!!selectedInfo}
        onClose={() => setSelectedInfo(null)}
        info={selectedInfo}
        currentUser={user!}
        familyId={familyId}
        onUpdate={() => {
          showToast('Family info updated.');
        }}
      />

      <ManageNoteCategoriesModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={categories}
        familyId={familyId}
        currentUser={user!}
        onUpdate={() => {
          showToast('Categories updated.');
        }}
      />
    </div>
  );
};
