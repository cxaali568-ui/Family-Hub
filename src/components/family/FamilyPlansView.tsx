import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Calendar, Clock, MapPin, Plus, Users } from 'lucide-react';
import { FamilyPlan } from '../../types';

export const FamilyPlansView: React.FC = () => {
  const { plans, addPlan } = useFamily();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    addPlan({
      title: title.trim(),
      date,
      time: time || undefined,
      location: location || undefined,
      category: 'gathering',
      attendees: ['Family'],
    });

    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setIsAddOpen(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            Family Plans & Calendar
          </h1>
          <p className="text-xs text-slate-500">
            Upcoming gatherings, school tournaments, doctor visits, and vacations.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setIsAddOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Event
        </Button>
      </div>

      <div className="space-y-3">
        {plans.map(plan => (
          <Card key={plan.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center font-bold shrink-0">
                <span className="text-[10px] uppercase font-semibold text-indigo-400">
                  {new Date(plan.date).toLocaleDateString([], { month: 'short' })}
                </span>
                <span className="text-base leading-none">
                  {new Date(plan.date).getDate() + 1}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  {plan.time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {plan.time}
                    </span>
                  )}
                  {plan.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {plan.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> {plan.attendees.join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider self-start sm:self-auto">
              {plan.category}
            </span>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule Family Event"
        subtitle="Add a plan to synchronize with all household members."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Event Title"
            placeholder="e.g. Grandma's 75th Birthday Dinner"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
            <Input
              label="Time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>

          <Input
            label="Location"
            placeholder="e.g. Olive Garden or Home"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Plan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
