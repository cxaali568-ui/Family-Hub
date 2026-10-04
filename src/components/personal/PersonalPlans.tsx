import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { PersonalPlan } from '../../types';
import {
  Compass,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  Tag,
} from 'lucide-react';

const PLAN_CATEGORIES = ['Study', 'Travel', 'Work', 'Fitness', 'Monthly', 'Savings', 'Other'] as const;

export const PersonalPlans: React.FC = () => {
  const { plans, addPlan, updatePlan, deletePlan } = usePersonal();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'planned' | 'completed'>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PersonalPlan | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<PersonalPlan['category']>('Study');
  const [status, setStatus] = useState<PersonalPlan['status']>('planned');
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const openAdd = () => {
    setEditingPlan(null);
    setTitle('');
    setDescription('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setCategory('Study');
    setStatus('planned');
    setProgress(0);
    setNotes('');
    setIsAddOpen(true);
  };

  const openEdit = (plan: PersonalPlan) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setDescription(plan.description || '');
    setStartDate(plan.startDate);
    setEndDate(plan.endDate || '');
    setCategory(plan.category || 'Study');
    setStatus(plan.status);
    setProgress(plan.progress || 0);
    setNotes(plan.notes || '');
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    setLoading(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate: endDate || undefined,
          category,
          status,
          progress: Number(progress) || 0,
          notes: notes.trim() || undefined,
        });
      } else {
        await addPlan({
          title: title.trim(),
          description: description.trim() || undefined,
          startDate,
          endDate: endDate || undefined,
          category,
          status,
          progress: Number(progress) || 0,
          notes: notes.trim() || undefined,
        });
      }
      setIsAddOpen(false);
    } catch (err) {
      console.warn('Could not save plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = plans.filter((p) => {
    if (activeTab === 'all') return true;
    return p.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-600" />
            Personal Goals & Plans
          </h2>
          <p className="text-xs text-slate-500">
            Study schedules, travel plans, savings targets, and personal goals.
          </p>
        </div>

        <Button size="sm" onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
          Add Plan
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        {[
          { id: 'all', label: 'All Plans' },
          { id: 'active', label: 'In Progress' },
          { id: 'planned', label: 'Planned' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((plan) => (
          <Card key={plan.id} className="p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {plan.category || 'Plan'}
                </span>
                <Badge
                  variant={
                    plan.status === 'completed'
                      ? 'success'
                      : plan.status === 'active'
                      ? 'primary'
                      : 'outline'
                  }
                  className="text-[10px] uppercase"
                >
                  {plan.status}
                </Badge>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {plan.title}
              </h3>

              {plan.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {plan.description}
                </p>
              )}

              {/* Progress Bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{plan.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, plan.progress))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                {plan.startDate} {plan.endDate ? `→ ${plan.endDate}` : ''}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5"
                  onClick={() => openEdit(plan)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5 text-rose-500 hover:text-rose-700"
                  onClick={() => deletePlan(plan.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6">
            <Compass className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No personal plans yet.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Set personal targets, workout regimes, or study roadmaps.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={editingPlan ? 'Edit Personal Plan' : 'Add Personal Plan'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Plan Title *"
            placeholder="e.g. Master React & TypeScript, European Vacation, 5k Run Goal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLAN_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1 rounded-xl font-medium transition-all ${
                    category === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label="Start Date *"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              type="date"
              label="Target End Date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="planned">Planned</option>
                <option value="active">Active / In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Progress ({progress}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
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
              placeholder="Outline steps, milestones, or notes..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading}>
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
