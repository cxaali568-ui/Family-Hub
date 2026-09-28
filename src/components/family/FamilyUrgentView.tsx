import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { AlertCircle, Plus, CheckCircle, ShieldAlert, PhoneCall } from 'lucide-react';
import { UrgentItem } from '../../types';

export const FamilyUrgentView: React.FC = () => {
  const { urgentItems, addUrgentItem, resolveUrgentItem, family } = useFamily();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<UrgentItem['severity']>('alert');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addUrgentItem(title.trim(), description.trim(), severity);

    setTitle('');
    setDescription('');
    setIsAddOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Urgent Needs & Emergency
          </h1>
          <p className="text-xs text-slate-500">
            Immediate alerts, school pickups, or time-sensitive family needs.
          </p>
        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Broadcast Urgent Need
        </Button>
      </div>

      {/* Quick Emergency Dial Banner */}
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
            911
          </div>
          <div>
            <h4 className="font-bold text-rose-900 dark:text-rose-200">Emergency Quick Access</h4>
            <p className="text-rose-700 dark:text-rose-300 text-[11px]">
              Police, Medical, Fire emergency line.
            </p>
          </div>
        </div>
        <a
          href="tel:911"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Call 911
        </a>
      </div>

      {urgentItems.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-7 h-7 text-emerald-500" />}
          title="All clear! No active urgent alerts."
          description="Everything in the household is peaceful. Use the broadcast button above if an immediate situation occurs."
        />
      ) : (
        <div className="space-y-3">
          {urgentItems.map(item => (
            <Card key={item.id} variant="urgent" className="p-4 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                      {item.title}
                    </h3>
                    <Badge variant="danger">{item.severity.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
                    {item.description}
                  </p>
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1.5">
                    Reported by <strong>{item.createdByName}</strong> • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveUrgentItem(item.id)}
                className="shrink-0 text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
              >
                Resolve
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Broadcast Urgent Family Alert"
        subtitle="This will alert every family member immediately."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Urgent Situation"
            placeholder="e.g. Car has a flat tire on Route 101"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Severity Level
            </label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="alert">Alert (Time Sensitive)</option>
              <option value="urgent">Urgent Need</option>
              <option value="critical">Critical Emergency</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Details & Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What help is required? Who should respond?"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm p-3.5 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              Send Alert
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
