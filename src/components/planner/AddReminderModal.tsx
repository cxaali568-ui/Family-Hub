import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  FamilyMember,
  EventReminderOption,
  RecurrenceFrequency,
} from '../../types';
import { eventService } from '../../services/eventService';
import { formatDateKey } from '../../utils/recurrenceUtils';
import {
  Bell,
  Clock,
  Calendar,
  Users,
  Repeat,
  AlertCircle,
  Check,
} from 'lucide-react';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: any;
  familyMembers: FamilyMember[];
  initialDate?: string;
  onSuccess?: () => void;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  familyMembers,
  initialDate,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(initialDate || formatDateKey(new Date()));
  const [dueTime, setDueTime] = useState('');
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [reminder, setReminder] = useState<EventReminderOption>('at_time');
  const [repeat, setRepeat] = useState<RecurrenceFrequency>('none');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleMember = (userId: string) => {
    setAssignedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a reminder title.');
      return;
    }
    if (!dueDate) {
      setError('Please choose a due date.');
      return;
    }

    setLoading(true);

    try {
      await eventService.addReminder(
        familyId,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          dueTime: dueTime || undefined,
          assignedMemberIds,
          reminder,
          repeat: repeat !== 'none' ? repeat : undefined,
          notes: notes.trim() || undefined,
          status: 'pending',
          createdBy: currentUser.id,
        },
        currentUser
      );

      setTitle('');
      setDescription('');
      setNotes('');
      setAssignedMemberIds([]);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create reminder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Family Reminder" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Reminder Title *"
          placeholder="e.g. Buy groceries, Pay electricity bill, Water plants"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Due Date *"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
          <Input
            type="time"
            label="Due Time (optional)"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        {/* Assigned Members */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            Assign To (optional)
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
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-medium truncate">{m.userName || 'Member'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reminder notification and repeat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-indigo-500" />
              Reminder Alert
            </label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value as EventReminderOption)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="none">No alert</option>
              <option value="at_time">At due time</option>
              <option value="1h">1 hour before</option>
              <option value="1d">1 day before</option>
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
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Notes / Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional instructions or notes..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            Add Reminder
          </Button>
        </div>
      </form>
    </Modal>
  );
};
