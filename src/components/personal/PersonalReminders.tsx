import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PersonalReminder } from '../../types';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Repeat,
  Trash2,
  Check,
} from 'lucide-react';

export const PersonalReminders: React.FC = () => {
  const { reminders, addReminder, updateReminder, deleteReminder } = usePersonal();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [repeat, setRepeat] = useState<PersonalReminder['repeat']>('none');
  const [reminder, setReminder] = useState('at_time');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setLoading(true);
    try {
      await addReminder({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time: time || undefined,
        repeat,
        reminder,
        status: 'pending',
      });

      setTitle('');
      setDescription('');
      setIsAddOpen(false);
    } catch (err) {
      console.warn('Could not add personal reminder:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: PersonalReminder) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateReminder(item.id, { status: nextStatus });
  };

  const pending = reminders.filter((r) => r.status !== 'completed');
  const completed = reminders.filter((r) => r.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            Personal Reminders
          </h2>
          <p className="text-xs text-slate-500">
            Private alerts and nudges sent exclusively to your account.
          </p>
        </div>

        <Button size="sm" onClick={() => setIsAddOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Add Reminder
        </Button>
      </div>

      {/* Pending Reminders */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Active Reminders ({pending.length})
        </h3>

        {pending.map((rem) => (
          <Card key={rem.id} className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleToggleStatus(rem)}
                className="text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <Circle className="w-5 h-5" />
              </button>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{rem.title}</h4>
                {rem.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{rem.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {rem.date}
                  </span>
                  {rem.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {rem.time}
                    </span>
                  )}
                  {rem.repeat !== 'none' && (
                    <span className="flex items-center gap-1 uppercase font-semibold text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      <Repeat className="w-3 h-3" /> {rem.repeat}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="p-1.5 text-rose-500 hover:text-rose-700"
              onClick={() => deleteReminder(rem.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}

        {pending.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No upcoming reminders.
            </p>
          </div>
        )}
      </div>

      {/* Completed History */}
      {completed.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Completed Reminders ({completed.length})
          </h3>

          <div className="space-y-2 opacity-60">
            {completed.map((rem) => (
              <Card key={rem.id} className="p-3 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(rem)}
                    className="text-emerald-500 cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div>
                    <h4 className="text-xs font-bold line-through text-slate-500">{rem.title}</h4>
                    <span className="text-[10px] text-slate-400">{rem.date}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                  onClick={() => deleteReminder(rem.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Private Reminder" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Reminder Title *"
            placeholder="e.g. Call accountant, Take vitamin D, Review lease"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Date *"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Repeat
              </label>
              <select
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="none">One time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alert Timing
              </label>
              <select
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="at_time">At reminder time</option>
                <option value="15m">15 minutes before</option>
                <option value="1h">1 hour before</option>
                <option value="1d">1 day before</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Create Reminder
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
