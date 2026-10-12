import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { MedicalCondition, MedicalProfile, User } from '../../types';
import { HeartPulse, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface ManageConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profile: MedicalProfile;
  currentUser: User;
}

export const ManageConditionsModal: React.FC<ManageConditionsModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profile,
  currentUser,
}) => {
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New condition state
  const [name, setName] = useState('');
  const [dateDiagnosed, setDateDiagnosed] = useState('');
  const [status, setStatus] = useState<MedicalCondition['status']>('Active');
  const [doctor, setDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !familyId || !profile.id) return;
    setLoading(true);
    const unsub = medicalService.subscribeConditions(familyId, profile.id, (list) => {
      setConditions(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen, familyId, profile.id]);

  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Condition name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await medicalService.addCondition(familyId, profile.id, {
        name: name.trim(),
        dateDiagnosed: dateDiagnosed.trim() || undefined,
        status,
        doctor: doctor.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setName('');
      setDateDiagnosed('');
      setDoctor('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Failed to add condition:', err);
      setError(err?.message || 'Failed to add condition.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cond: MedicalCondition) => {
    const nextStatus: MedicalCondition['status'] =
      cond.status === 'Active' ? 'Controlled' : cond.status === 'Controlled' ? 'Resolved' : 'Active';
    try {
      await medicalService.updateConditionStatus(familyId, profile.id, cond.id, nextStatus);
    } catch (err: any) {
      console.error('Failed to update condition status:', err);
      setError(err?.message || 'Failed to update condition status.');
    }
  };

  const handleDeleteCondition = async (condId: string) => {
    if (!window.confirm('Are you sure you want to delete this condition record?')) return;
    try {
      await medicalService.deleteCondition(familyId, profile.id, condId);
    } catch (err: any) {
      console.error('Failed to delete condition:', err);
      setError(err?.message || 'Failed to delete condition.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Medical Conditions — ${profile.personName}`}
      subtitle="Track ongoing health conditions, asthma, hypertension, or past diagnoses."
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
            Health Conditions ({conditions.length})
          </p>
          {!showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Condition
            </Button>
          )}
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddCondition}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Log Medical Condition
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Condition Name *"
                placeholder="e.g. Asthma, Type 2 Diabetes, Eczema"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2.5 font-bold"
                >
                  <option value="Active">Active</option>
                  <option value="Controlled">Controlled</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Historical">Historical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Date Diagnosed (optional)"
                type="date"
                value={dateDiagnosed}
                onChange={(e) => setDateDiagnosed(e.target.value)}
              />
              <Input
                label="Specialist / Diagnosing Doctor"
                placeholder="e.g. Dr. Salman (Pulmonology)"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
              />
            </div>

            <Input
              label="Management Plan / Notes"
              placeholder="e.g. Inhaler before physical exercise, yearly checkup"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Save Condition
              </Button>
            </div>
          </form>
        )}

        {/* Conditions List */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading conditions...</div>
        ) : conditions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium">No medical conditions logged for {profile.personName}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click "Add Condition" above to record any diagnosis or chronic condition.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {conditions.map((cond) => (
              <div
                key={cond.id}
                className="p-3.5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                      {cond.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(cond)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                        cond.status === 'Active'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : cond.status === 'Controlled'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      }`}
                      title="Click to cycle status: Active -> Controlled -> Resolved"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {cond.status}
                    </button>
                  </div>

                  {cond.doctor && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>Doctor:</strong> {cond.doctor}
                    </p>
                  )}

                  {cond.dateDiagnosed && (
                    <p className="text-[11px] text-slate-400">
                      Diagnosed: {cond.dateDiagnosed}
                    </p>
                  )}

                  {cond.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      Notes: {cond.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCondition(cond.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                  title="Delete condition"
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
