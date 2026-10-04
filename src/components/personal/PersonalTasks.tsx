import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  PersonalSchoolWorkItem,
  SchoolWorkType,
  SchoolWorkStatus,
  SchoolWorkPriority,
} from '../../types';
import {
  Briefcase,
  GraduationCap,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  MapPin,
  Trash2,
  Edit2,
  Tag,
  Lock,
} from 'lucide-react';

const ITEM_TYPES: SchoolWorkType[] = [
  'Assignment',
  'Exam',
  'Meeting',
  'Project',
  'Deadline',
  'Office Task',
  'Interview',
  'Class',
  'Study Session',
];

export const PersonalTasks: React.FC = () => {
  const { schoolWork, addSchoolWorkItem, updateSchoolWorkItem, deleteSchoolWorkItem } = usePersonal();

  const [domainFilter, setDomainFilter] = useState<'all' | 'school' | 'work'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalSchoolWorkItem | null>(null);

  // Form states
  const [domain, setDomain] = useState<PersonalSchoolWorkItem['domain']>('work');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SchoolWorkType>('Meeting');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<SchoolWorkPriority>('normal');
  const [status, setStatus] = useState<SchoolWorkStatus>('pending');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const openAdd = () => {
    setEditingItem(null);
    setDomain('work');
    setTitle('');
    setType('Meeting');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setTime('');
    setLocation('');
    setPriority('normal');
    setStatus('pending');
    setNotes('');
    setIsAddOpen(true);
  };

  const openEdit = (item: PersonalSchoolWorkItem) => {
    setEditingItem(item);
    setDomain(item.domain);
    setTitle(item.title);
    setType(item.type);
    setDescription(item.description || '');
    setDate(item.date);
    setTime(item.time || '');
    setLocation(item.location || '');
    setPriority(item.priority);
    setStatus(item.status);
    setNotes(item.notes || '');
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setLoading(true);
    try {
      if (editingItem) {
        await updateSchoolWorkItem(editingItem.id, {
          domain,
          title: title.trim(),
          type,
          description: description.trim() || undefined,
          date,
          time: time || undefined,
          location: location.trim() || undefined,
          priority,
          status,
          notes: notes.trim() || undefined,
        });
      } else {
        await addSchoolWorkItem({
          domain,
          title: title.trim(),
          type,
          description: description.trim() || undefined,
          date,
          time: time || undefined,
          location: location.trim() || undefined,
          priority,
          status,
          notes: notes.trim() || undefined,
        });
      }
      setIsAddOpen(false);
    } catch (err) {
      console.warn('Could not save school/work item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item: PersonalSchoolWorkItem) => {
    const nextStatus: SchoolWorkStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateSchoolWorkItem(item.id, {
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const filtered = schoolWork.filter((item) => {
    if (domainFilter !== 'all' && item.domain !== domainFilter && item.domain !== 'both') {
      return false;
    }
    if (statusFilter === 'active' && item.status === 'completed') return false;
    if (statusFilter === 'completed' && item.status !== 'completed') return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-indigo-600" />
              Personal School & Work
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Work deadlines, office meetings, exams, and classes strictly for you.
          </p>
        </div>

        <Button size="sm" onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
          Add Item
        </Button>
      </div>

      {/* Domain & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          {[
            { id: 'all', label: 'All Domains' },
            { id: 'work', label: 'Work' },
            { id: 'school', label: 'School' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDomainFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                domainFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          {[
            { id: 'active', label: 'Active' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All Items' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filtered.map((item) => {
          const isDone = item.status === 'completed';

          return (
            <Card
              key={item.id}
              className={`p-4 flex items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
                isDone ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
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
                        isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {item.title}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase">
                      {item.type}
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
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </span>
                    {item.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.time}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="p-1.5" onClick={() => openEdit(item)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5 text-rose-500 hover:text-rose-700"
                  onClick={() => deleteSchoolWorkItem(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <Briefcase className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No school or work tasks.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add assignments, study schedules, or client meetings.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingItem ? 'Edit Task' : 'Add School / Work Task'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Task Title *"
            placeholder="e.g. Physics Midterm Exam, Quarterly Sales Review"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Domain
              </label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="work">Work</option>
                <option value="school">School / College</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              label="Time (optional)"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Location"
              placeholder="e.g. Room 204, Zoom, Head Office"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Syllabus, project deliverables, agenda..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              {editingItem ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
