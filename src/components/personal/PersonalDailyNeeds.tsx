import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PersonalDailyNeed } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  Trash2,
  Search,
  Filter,
  Check,
} from 'lucide-react';

export const PersonalDailyNeeds: React.FC = () => {
  const { dailyNeeds, addDailyNeed, updateDailyNeed, deleteDailyNeed } = usePersonal();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue' | 'completed' | 'all'>('today');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<PersonalDailyNeed['priority']>('normal');
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await addDailyNeed({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
        dueTime: dueTime || undefined,
        priority,
        status: 'pending',
      });

      setTitle('');
      setDescription('');
      setDueTime('');
      setIsAddOpen(false);
    } catch (err) {
      console.warn('Could not add daily need:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: PersonalDailyNeed) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateDailyNeed(item.id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  // Filter items
  const filtered = dailyNeeds.filter((item) => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!item.title.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (activeTab === 'completed') return item.status === 'completed';
    if (item.status === 'completed') return false;

    if (activeTab === 'today') return item.dueDate === todayStr;
    if (activeTab === 'upcoming') return item.dueDate > todayStr;
    if (activeTab === 'overdue') return item.dueDate < todayStr;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            Personal Daily Needs
          </h2>
          <p className="text-xs text-slate-500">
            Personal to-dos, errands, and daily tasks strictly private to you.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Daily Need
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto no-scrollbar">
          {[
            { id: 'today', label: 'Today' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All Active' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Input
            placeholder="Search daily needs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Needs List */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const isDone = item.status === 'completed';
          const isOverdue = item.dueDate < todayStr && !isDone;

          return (
            <Card
              key={item.id}
              className={`p-3.5 flex items-start sm:items-center justify-between gap-3 transition-all ${
                isDone ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(item)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isDone
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.title}
                    </span>

                    {item.priority === 'urgent' && (
                      <Badge variant="danger" className="text-[10px]">
                        Urgent
                      </Badge>
                    )}
                    {item.priority === 'high' && (
                      <Badge variant="warning" className="text-[10px]">
                        High
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge variant="danger" className="text-[10px]">
                        Overdue
                      </Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.dueDate}
                    </span>
                    {item.dueTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.dueTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-500 hover:text-rose-700 p-1.5"
                  onClick={() => deleteDailyNeed(item.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No daily needs found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add your personal errands, grocery items, or calls to keep your day organized.
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Daily Need" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Need / Task Title *"
            placeholder="e.g. Buy groceries, Call dentist, Pay phone bill"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Due Date *"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
            <Input
              type="time"
              label="Due Time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`text-xs py-2 rounded-xl font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    priority === p
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes or item checklist..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              Add Need
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
