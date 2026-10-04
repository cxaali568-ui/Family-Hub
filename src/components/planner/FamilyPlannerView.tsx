import React, { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
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
} from '../../types';
import { eventService } from '../../services/eventService';
import { calendarService } from '../../services/calendarService';
import { memberProfileService } from '../../services/memberProfileService';
import { childService } from '../../services/childService';
import { medicalService } from '../../services/medicalService';
import { billService } from '../../services/billService';
import { noteService } from '../../services/noteService';
import {
  formatDateKey,
  parseDateKey,
  addDays,
} from '../../utils/recurrenceUtils';

import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { AddEditEventModal } from './AddEditEventModal';
import { AddReminderModal } from './AddReminderModal';
import { EventDetailModal } from './EventDetailModal';
import { CalendarSettingsModal } from './CalendarSettingsModal';

import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  Printer,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Gift,
  HeartPulse,
  CreditCard,
  StickyNote,
  GraduationCap,
  Users,
  Settings,
  X,
  FileDown,
} from 'lucide-react';

export const FamilyPlannerView: React.FC = () => {
  const { currentFamily, members: familyMemberships, setCurrentRoute } = useFamily();
  const { user } = useAuth();

  const familyId = currentFamily?.id || '';

  // Settings
  const [settings, setSettings] = useState<CalendarSettings>(() =>
    eventService.getCalendarSettings(familyId)
  );

  // Active Top Section: 'today' | 'upcoming' | 'calendar'
  const [topSection, setTopSection] = useState<'today' | 'upcoming' | 'calendar'>('calendar');

  // Active Calendar View: 'month' | 'week' | 'day' | 'agenda'
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'agenda'>(
    settings.defaultView || 'month'
  );

  // Date States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter State
  const [filter, setFilter] = useState<CalendarFilter>({
    category: 'all',
    source: 'all',
    searchQuery: '',
    status: 'all',
    upcomingDays: 7,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Data Collections
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [reminders, setReminders] = useState<FamilyReminder[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [medicalAppointments, setMedicalAppointments] = useState<MedicalAppointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [notes, setNotes] = useState<FamilyNote[]>([]);

  // Modals
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<FamilyEvent | null>(null);
  const [inspectedItem, setInspectedItem] = useState<UnifiedCalendarItem | null>(null);
  const [initialCategory, setInitialCategory] = useState<string>('Family');

  // Load calendar settings on family change
  useEffect(() => {
    if (familyId) {
      const s = eventService.getCalendarSettings(familyId);
      setSettings(s);
    }
  }, [familyId]);

  // Real-time Subscriptions across all family modules
  useEffect(() => {
    if (!familyId) return;

    const unsubEvents = eventService.subscribeEvents(familyId, setEvents);
    const unsubReminders = eventService.subscribeReminders(familyId, setReminders);
    const unsubMembers = memberProfileService.subscribeMemberProfiles(familyId, setMemberProfiles);
    const unsubChildren = childService.subscribeChildren(familyId, setChildren);
    const unsubMedical = medicalService.subscribeAppointments(familyId, setMedicalAppointments);
    const unsubBills = billService.subscribeAllActiveBills(familyId, setBills);
    const unsubNotes = noteService.subscribeNotes(familyId, setNotes);

    return () => {
      unsubEvents();
      unsubReminders();
      unsubMembers();
      unsubChildren();
      unsubMedical();
      unsubBills();
      unsubNotes();
    };
  }, [familyId]);

  // Compute Active Date Window based on current view & date
  const dateWindow = useMemo(() => {
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();

    if (calendarView === 'month') {
      const start = new Date(yr, mo - 1, 20);
      const end = new Date(yr, mo + 2, 10);
      return { start, end };
    } else if (calendarView === 'week') {
      const start = addDays(currentDate, -14);
      const end = addDays(currentDate, 14);
      return { start, end };
    } else if (calendarView === 'day') {
      const start = addDays(selectedDate, -1);
      const end = addDays(selectedDate, 1);
      return { start, end };
    } else {
      // Agenda view: broad upcoming window
      const start = addDays(new Date(), -1);
      const end = addDays(new Date(), filter.upcomingDays + 15);
      return { start, end };
    }
  }, [calendarView, currentDate, selectedDate, filter.upcomingDays]);

  // Unified items calculation
  const allUnifiedItems = useMemo(() => {
    return calendarService.getUnifiedCalendarItems({
      events,
      reminders,
      members: memberProfiles,
      children,
      medicalAppointments,
      bills,
      notes,
      settings,
      windowStart: dateWindow.start,
      windowEnd: dateWindow.end,
    });
  }, [
    events,
    reminders,
    memberProfiles,
    children,
    medicalAppointments,
    bills,
    notes,
    settings,
    dateWindow,
  ]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return calendarService.filterItems(allUnifiedItems, filter);
  }, [allUnifiedItems, filter]);

  // Trigger non-intrusive reminder check for today/tomorrow items
  useEffect(() => {
    if (familyId && user && allUnifiedItems.length > 0) {
      calendarService.checkAndDispatchReminders(familyId, allUnifiedItems, user);
    }
  }, [familyId, user, allUnifiedItems]);

  // Today's Items
  const todayKey = formatDateKey(new Date());
  const todayItems = useMemo(() => {
    return allUnifiedItems.filter((i) => i.startDate === todayKey);
  }, [allUnifiedItems, todayKey]);

  // Upcoming Items (Next 7, 14, 30 days)
  const upcomingItems = useMemo(() => {
    const startStr = formatDateKey(new Date());
    const endStr = formatDateKey(addDays(new Date(), filter.upcomingDays));
    return allUnifiedItems.filter((i) => i.startDate >= startStr && i.startDate <= endStr);
  }, [allUnifiedItems, filter.upcomingDays]);

  // Navigation handlers
  const handlePrev = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (calendarView === 'day') {
      setSelectedDate(addDays(selectedDate, -1));
    }
  };

  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (calendarView === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (calendarView === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const handleExportCsv = () => {
    const csv = calendarService.exportToCsv(filteredItems);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Family_Planner_${formatDateKey(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedMonthHeader = currentDate.toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ----------------- Top Header & Actions ----------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Family Planner & Calendar
              </h1>
              <p className="text-xs text-slate-500">
                Unified gatherings, birthdays, appointments, bill due dates, and reminders.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setEventToEdit(null);
              setInitialCategory('Family');
              setIsAddEventOpen(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Event
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEventToEdit(null);
              setInitialCategory('Appointment');
              setIsAddEventOpen(true);
            }}
            icon={<HeartPulse className="w-4 h-4 text-rose-500" />}
          >
            Add Appointment
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddReminderOpen(true)}
            icon={<Bell className="w-4 h-4 text-orange-500" />}
          >
            Add Reminder
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSettingsOpen(true)}
            className="p-2"
            title="Calendar Settings"
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </Button>
        </div>
      </div>

      {/* ----------------- Top Navigation Tabs (Today / Upcoming / Calendar) ----------------- */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
          <button
            type="button"
            onClick={() => setTopSection('today')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              topSection === 'today'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today</span>
            {todayItems.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {todayItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTopSection('upcoming')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              topSection === 'upcoming'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Upcoming</span>
            <span className="text-[10px] opacity-70">({upcomingItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTopSection('calendar')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              topSection === 'calendar'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
            title="Export CSV"
            className="text-xs hidden sm:flex"
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePrint}
            icon={<Printer className="w-3.5 h-3.5" />}
            title="Print Calendar"
            className="text-xs"
          >
            Print
          </Button>
        </div>
      </div>

      {/* ----------------- TODAY SECTION ----------------- */}
      {topSection === 'today' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Today's Schedule & Reminders
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {todayItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setInspectedItem(item)}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/60 shadow-xs hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg ${item.color}`}>
                        {item.category || item.source}
                      </span>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {item.allDay ? 'All Day' : item.startTime}
                      </span>
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                      {item.title}
                    </h4>

                    {item.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span className="uppercase tracking-wider font-semibold">Source: {item.source}</span>
                    <span className="text-indigo-600 font-bold group-hover:underline">Open →</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                You're all clear today!
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                No events, doctor visits, or bills due today.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ----------------- UPCOMING SECTION (7 / 14 / 30 Days) ----------------- */}
      {topSection === 'upcoming' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Upcoming Agenda ({upcomingItems.length} items)
              </h2>
              <p className="text-xs text-slate-400">
                Everything scheduled for your family in the next {filter.upcomingDays} days.
              </p>
            </div>

            {/* 7 / 14 / 30 day buttons */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setFilter({ ...filter, upcomingDays: days as any })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filter.upcomingDays === days
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          <AgendaView
            items={upcomingItems}
            onItemClick={(item) => setInspectedItem(item)}
            onAddEvent={() => setIsAddEventOpen(true)}
          />
        </div>
      )}

      {/* ----------------- CALENDAR SECTION (Month / Week / Day / Agenda) ----------------- */}
      {topSection === 'calendar' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Calendar Controls & Navigation Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Previous, Today, Next + Month Header */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrev}
                  className="p-1.5"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToday}
                  className="text-xs px-3"
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNext}
                  className="p-1.5"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 ml-2">
                {calendarView === 'day'
                  ? selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                  : formattedMonthHeader}
              </h2>
            </div>

            {/* View Switcher (Month / Week / Day / Agenda) */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      calendarView === view
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                variant={isFilterOpen ? 'primary' : 'outline'}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Filters
              </Button>
            </div>
          </div>

          {/* Search & Filters Drawer */}
          {isFilterOpen && (
            <Card className="p-4 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Input
                    placeholder="Search by title, location, category..."
                    value={filter.searchQuery}
                    onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
                    icon={<Search className="w-4 h-4" />}
                  />
                  {filter.searchQuery && (
                    <button
                      type="button"
                      onClick={() => setFilter({ ...filter, searchQuery: '' })}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Source Filter */}
                <div>
                  <select
                    value={filter.source}
                    onChange={(e) => setFilter({ ...filter, source: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Sources</option>
                    <option value="event">Family Events</option>
                    <option value="reminder">Reminders</option>
                    <option value="birthday">Birthdays</option>
                    <option value="medical">Medical Appointments</option>
                    <option value="school">School Events / Fees</option>
                    <option value="bill">Bills</option>
                    <option value="note">Notes & Urgent Needs</option>
                  </select>
                </div>

                {/* Assigned Member Filter */}
                <div>
                  <select
                    value={filter.assignedMemberId || 'all'}
                    onChange={(e) => setFilter({ ...filter, assignedMemberId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="all">All Family Members</option>
                    {familyMemberships.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userName || 'Member'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() =>
                      setFilter({
                        category: 'all',
                        source: 'all',
                        searchQuery: '',
                        status: 'all',
                        upcomingDays: 7,
                      })
                    }
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Active View Display */}
          {calendarView === 'month' && (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setCalendarView('day');
              }}
              items={filteredItems}
              onItemClick={(item) => setInspectedItem(item)}
              weekStartsOn={settings.weekStartsOn}
            />
          )}

          {calendarView === 'week' && (
            <WeekView
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={(d) => setSelectedDate(d)}
              items={filteredItems}
              onItemClick={(item) => setInspectedItem(item)}
              weekStartsOn={settings.weekStartsOn}
            />
          )}

          {calendarView === 'day' && (
            <DayView
              selectedDate={selectedDate}
              items={filteredItems}
              onItemClick={(item) => setInspectedItem(item)}
              onAddEventForDay={() => {
                setEventToEdit(null);
                setIsAddEventOpen(true);
              }}
            />
          )}

          {calendarView === 'agenda' && (
            <AgendaView
              items={filteredItems}
              onItemClick={(item) => setInspectedItem(item)}
              onAddEvent={() => setIsAddEventOpen(true)}
            />
          )}
        </div>
      )}

      {/* ----------------- MODALS ----------------- */}
      <AddEditEventModal
        isOpen={isAddEventOpen}
        onClose={() => {
          setIsAddEventOpen(false);
          setEventToEdit(null);
        }}
        familyId={familyId}
        currentUser={user}
        familyMembers={familyMemberships}
        eventToEdit={eventToEdit}
        initialDate={formatDateKey(selectedDate)}
        initialCategory={initialCategory}
      />

      <AddReminderModal
        isOpen={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        familyId={familyId}
        currentUser={user}
        familyMembers={familyMemberships}
        initialDate={formatDateKey(selectedDate)}
      />

      <EventDetailModal
        isOpen={!!inspectedItem}
        onClose={() => setInspectedItem(null)}
        item={inspectedItem}
        familyId={familyId}
        currentUser={user}
        familyMembers={familyMemberships}
        onEdit={(event) => {
          setEventToEdit(event);
          setIsAddEventOpen(true);
        }}
        onNavigateToModule={(route) => setCurrentRoute(route as any)}
      />

      <CalendarSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          eventService.saveCalendarSettings(familyId, newSettings);
        }}
      />
    </div>
  );
};
