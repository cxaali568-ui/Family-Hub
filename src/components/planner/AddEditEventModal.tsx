import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  FamilyEvent,
  FamilyMember,
  EventCategoryType,
  EventReminderOption,
  RecurrenceFrequency,
} from '../../types';
import { eventService } from '../../services/eventService';
import { formatDateKey } from '../../utils/recurrenceUtils';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
  Tag,
  Paperclip,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface AddEditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: any;
  familyMembers: FamilyMember[];
  eventToEdit?: FamilyEvent | null;
  initialDate?: string;
  initialCategory?: string;
  onSuccess?: () => void;
}

const DEFAULT_CATEGORIES: EventCategoryType[] = [
  'Family',
  'Birthday',
  'Anniversary',
  'School',
  'Medical',
  'Appointment',
  'Travel',
  'Home',
  'Work',
  'Holiday',
  'Other',
];

export const AddEditEventModal: React.FC<AddEditEventModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  familyMembers,
  eventToEdit,
  initialDate,
  initialCategory,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(initialDate || formatDateKey(new Date()));
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [allDay, setAllDay] = useState(false);
  const [category, setCategory] = useState<string>(initialCategory || 'Family');
  const [customCategory, setCustomCategory] = useState('');
  const [location, setLocation] = useState('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [visibleTo, setVisibleTo] = useState<'entire_family' | 'selected_members'>('entire_family');
  const [reminder, setReminder] = useState<EventReminderOption>('1d');
  const [repeat, setRepeat] = useState<RecurrenceFrequency>('none');
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      setStartDate(eventToEdit.startDate);
      setStartTime(eventToEdit.startTime || '10:00');
      setEndDate(eventToEdit.endDate || '');
      setEndTime(eventToEdit.endTime || '11:00');
      setAllDay(eventToEdit.allDay);
      if (DEFAULT_CATEGORIES.includes(eventToEdit.category as any)) {
        setCategory(eventToEdit.category);
        setCustomCategory('');
      } else {
        setCategory('Other');
        setCustomCategory(eventToEdit.category);
      }
      setLocation(eventToEdit.location || '');
      setAssignedMemberIds(eventToEdit.assignedMemberIds || []);
      setVisibleTo(eventToEdit.visibleTo || 'entire_family');
      setReminder(eventToEdit.reminder || 'none');
      setRepeat(eventToEdit.recurrence?.frequency || 'none');
      setRepeatEndDate(eventToEdit.recurrence?.endDate || '');
      setNotes(eventToEdit.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setStartDate(initialDate || formatDateKey(new Date()));
      setStartTime('10:00');
      setEndDate('');
      setEndTime('11:00');
      setAllDay(false);
      setCategory(initialCategory || 'Family');
      setCustomCategory('');
      setLocation('');
      setAssignedMemberIds([]);
      setVisibleTo('entire_family');
      setReminder('1d');
      setRepeat('none');
      setRepeatEndDate('');
      setNotes('');
    }
    setError('');
  }, [eventToEdit, initialDate, initialCategory, isOpen]);

  const toggleMember = (userId: string) => {
    setAssignedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide an event title.');
      return;
    }
    if (!startDate) {
      setError('Please select a start date.');
      return;
    }

    const effectiveCategory = category === 'Other' && customCategory.trim()
      ? customCategory.trim()
      : category;

    setLoading(true);

    try {
      const recurrenceRule =
        repeat !== 'none'
          ? {
              frequency: repeat,
              interval: 1,
              endDate: repeatEndDate || undefined,
            }
          : undefined;

      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        startTime: allDay ? undefined : startTime,
        endDate: endDate || startDate,
        endTime: allDay ? undefined : endTime,
        allDay,
        category: effectiveCategory,
        location: location.trim() || undefined,
        assignedMemberIds,
        visibleTo,
        reminder,
        recurrence: recurrenceRule,
        notes: notes.trim() || undefined,
        status: 'scheduled',
      };

      if (eventToEdit) {
        await eventService.updateEvent(familyId, eventToEdit.id, payload, currentUser);
      } else {
        await eventService.addEvent(familyId, payload, currentUser);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save event. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Edit Event' : 'Add Family Event'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <Input
          label="Event Title *"
          placeholder="e.g. Grandma's 75th Birthday, School Sports Day, Dentist"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                  category === cat
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {category === 'Other' && (
            <div className="mt-2">
              <Input
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Date and Time */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Date & Timing
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              All Day Event
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start Date *"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            {!allDay && (
              <Input
                type="time"
                label="Start Time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="End Date (optional)"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {!allDay && (
              <Input
                type="time"
                label="End Time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Location */}
        <Input
          label="Location"
          placeholder="e.g. Home, City Hospital, West High School, Online"
          icon={<MapPin className="w-4 h-4" />}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {/* Assigned Members */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Assign Family Members
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {familyMembers.map((m) => {
              const isSelected = assignedMemberIds.includes(m.userId);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleMember(m.userId)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-medium truncate">{m.userName || 'Member'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder & Recurrence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
              Event Reminder
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value as EventReminderOption)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">No reminder</option>
              <option value="at_time">At event time</option>
              <option value="5m">5 minutes before</option>
              <option value="10m">10 minutes before</option>
              <option value="30m">30 minutes before</option>
              <option value="1h">1 hour before</option>
              <option value="1d">1 day before</option>
              <option value="2d">2 days before</option>
              <option value="1w">1 week before</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 text-indigo-500" />
              Repeat
            </label>
            <select
              value={repeat}
              onChange={(e) => setRepeat(e.target.value as RecurrenceFrequency)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {repeat !== 'none' && (
          <div>
            <Input
              type="date"
              label="Repeat Until (optional)"
              value={repeatEndDate}
              min={startDate}
              onChange={(e) => setRepeatEndDate(e.target.value)}
            />
          </div>
        )}

        {/* Description & Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, agendas, what to bring, etc."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            {eventToEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
