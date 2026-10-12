import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { Medicine, MedicalProfile, User } from '../../types';
import { Pill, Plus, Trash2, Clock, CheckCircle2, PauseCircle } from 'lucide-react';

interface ManageMedicinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profile: MedicalProfile;
  currentUser: User;
}

export const ManageMedicinesModal: React.FC<ManageMedicinesModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profile,
  currentUser,
}) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New medicine state
  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [form, setForm] = useState('Tablet');
  const [dose, setDose] = useState('1 tablet');
  const [frequency, setFrequency] = useState('Once daily');
  const [reminderTime, setReminderTime] = useState('08:00 AM');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !familyId || !profile.id) return;
    setLoading(true);
    const unsub = medicalService.subscribeMedicines(familyId, profile.id, (list) => {
      setMedicines(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen, familyId, profile.id]);

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Medication name is required.');
      return;
    }
    if (!dose.trim()) {
      setError('Dose is required (e.g. 1 tablet, 5 ml).');
      return;
    }
    if (!frequency.trim()) {
      setError('Frequency is required (e.g. Twice daily).');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await medicalService.addMedicine(familyId, profile.id, {
        name: name.trim(),
        strength: strength.trim() || undefined,
        form,
        dose: dose.trim(),
        frequency: frequency.trim(),
        reminderTime: reminderTime.trim() || undefined,
        startDate,
        endDate: endDate.trim() || undefined,
        prescribedBy: prescribedBy.trim() || undefined,
        status: 'Active',
        notes: notes.trim() || undefined,
      });

      setName('');
      setStrength('');
      setNotes('');
      setPrescribedBy('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Failed to add medication:', err);
      setError(err?.message || 'Failed to add medication.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (med: Medicine) => {
    const nextStatus = med.status === 'Active' ? 'Completed' : 'Active';
    try {
      await medicalService.updateMedicineStatus(familyId, profile.id, med.id, nextStatus);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      setError(err?.message || 'Failed to update medication status.');
    }
  };

  const handleDeleteMedicine = async (medId: string) => {
    if (!window.confirm('Are you sure you want to delete this medication record?')) return;
    try {
      await medicalService.deleteMedicine(familyId, profile.id, medId);
    } catch (err: any) {
      console.error('Failed to delete medication:', err);
      setError(err?.message || 'Failed to delete medication.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Daily Medications & Prescriptions — ${profile.personName}`}
      subtitle="Track ongoing dosages, schedules, and prescriber instructions."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Medications List ({medicines.length})
          </p>
          {!showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medication
            </Button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddMedicine}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Log New Prescription / Medication
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <Input
                  label="Medication Name *"
                  placeholder="e.g. Amoxicillin, Ventolin, Metformin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <Input
                label="Strength"
                placeholder="e.g. 500mg, 10mg/ml"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Form
                </label>
                <select
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2.5 font-medium"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup / Liquid">Syrup / Liquid</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Injection">Injection</option>
                  <option value="Drops">Drops</option>
                  <option value="Cream / Ointment">Cream / Ointment</option>
                </select>
              </div>
              <Input
                label="Dose *"
                placeholder="e.g. 1 tablet, 5 ml"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                required
              />
              <Input
                label="Frequency *"
                placeholder="e.g. Twice daily with meals"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <Input
                label="Schedule / Reminder"
                placeholder="e.g. 08:00 AM, 08:00 PM"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Prescribing Doctor (optional)"
                placeholder="e.g. Dr. Ahmed Farooq"
                value={prescribedBy}
                onChange={(e) => setPrescribedBy(e.target.value)}
              />
              <Input
                label="Instructions / Special Notes"
                placeholder="e.g. Drink full glass of water, avoid dairy"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Save Medication
              </Button>
            </div>
          </form>
        )}

        {/* Medicines List */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading medications...</div>
        ) : medicines.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium">No medications recorded for {profile.personName}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click "Add Medication" above to track active prescriptions or daily vitamins.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {medicines.map((med) => (
              <div
                key={med.id}
                className="p-3.5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-indigo-500" />
                      {med.name} {med.strength ? `(${med.strength})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(med)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                        med.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                      title="Click to toggle status"
                    >
                      {med.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                      {med.status}
                    </button>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {med.form}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {med.dose} &bull; {med.frequency}
                  </p>

                  {med.reminderTime && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Times: {med.reminderTime}
                    </p>
                  )}

                  {med.prescribedBy && (
                    <p className="text-[11px] text-slate-400">
                      Prescribed by: {med.prescribedBy}
                    </p>
                  )}

                  {med.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      Note: {med.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMedicine(med.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                  title="Delete medication"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
