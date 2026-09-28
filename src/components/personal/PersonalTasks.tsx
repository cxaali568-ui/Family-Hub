import React, { useState } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { CheckSquare, Plus, Check, Clock, Briefcase, GraduationCap, User } from 'lucide-react';
import { PersonalTask } from '../../types';

export const PersonalTasks: React.FC = () => {
  const { tasks, addTask, toggleTask } = usePersonal();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PersonalTask['type']>('work');
  const [priority, setPriority] = useState<PersonalTask['priority']>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      type,
      priority,
      completed: false,
      dueDate: dueDate || undefined,
    });

    setTitle('');
    setDueDate('');
    setIsAddModalOpen(false);
  };

  const getCategoryIcon = (t: PersonalTask['type']) => {
    switch (t) {
      case 'school':
        return <GraduationCap className="w-4 h-4 text-sky-500" />;
      case 'work':
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      default:
        return <User className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            School & Work Tasks
          </h2>
          <p className="text-xs text-slate-500">
            Personal assignments, work projects, and deadlines.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-7 h-7" />}
          title="No personal tasks yet"
          description="Keep your personal career or school objectives organized in one place."
          actionLabel="Create Personal Task"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-2.5">
          {tasks.map(task => (
            <Card
              key={task.id}
              className={`p-3.5 flex items-center justify-between transition-all ${
                task.completed ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    task.completed
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
                  }`}
                >
                  {task.completed && <Check className="w-3.5 h-3.5" />}
                </button>

                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      task.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {task.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 capitalize">
                      {getCategoryIcon(task.type)} {task.type}
                    </span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {task.dueDate}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  task.priority === 'high'
                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {task.priority}
              </span>
            </Card>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Personal Task"
        subtitle="Keep your school or work goals separate from family chores."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Finish Calculus Chapter 4 review"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Area
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="school">School / College</option>
                <option value="work">Work / Career</option>
                <option value="personal">Personal Project</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <Input
            label="Due Date (optional)"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
