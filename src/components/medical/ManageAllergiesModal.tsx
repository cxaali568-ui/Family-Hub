import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { Allergy, MedicalProfile, User } from '../../types';
import { AlertTriangle, Plus, Trash2, ShieldAlert } from 'lucide-react';

interface ManageAllergiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profile: MedicalProfile;
  currentUser: User;
}

export const ManageAllergiesModal: React.FC<ManageAllergiesModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profile,
  currentUser,
}) => {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New allergy state
  const [name, setName] = useState('');
  const [type, setType] = useState<Allergy['type']>('Food');
  const [severity, setSeverity] = useState<Allergy['severity']>('Moderate');
  const [reaction, setReaction] = useState('');
  const [isSevereAlert, setIsSevereAlert] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !familyId || !profile.id) return;
    setLoading(true);
    const unsub = medicalService.subscribeAllergies(familyId, profile.id, (list) => {
      setAllergies(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen, familyId, profile.id]);

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Allergy name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await medicalService.addAllergy(
        familyId,
        profile.id,
        {
          name: name.trim(),
          type,
          severity,
          reaction: reaction.trim() || undefined,
          isSevereAlert: isSevereAlert || severity === 'Severe',
          notes: notes.trim() || undefined,
        },
        currentUser
      );
      setName('');
      setReaction('');
      setNotes('');
      setIsSevereAlert(false);
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Failed to add allergy:', err);
      setError(err?.message || 'Failed to add allergy.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllergy = async (allergyId: string) => {
    if (!window.confirm('Are you sure you want to delete this allergy record?')) return;
    try {
      await medicalService.deleteAllergy(familyId, profile.id, allergyId);
    } catch (err: any) {
      console.error('Failed to delete allergy:', err);
      setError(err?.message || 'Failed to delete allergy.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Allergies & Reactions — ${profile.personName}`}
      subtitle="Track dietary, medication, and environmental allergies to keep everyone safe."
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
            Known Allergies ({allergies.length})
          </p>
          {!showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Allergy
            </Button>
          )}
        </div>

        {/* Add Allergy Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddAllergy}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Log New Allergy / Reaction
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
                  label="Allergy / Substance *"
                  placeholder="e.g. Peanuts, Penicillin, Cat Dander"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2.5 font-medium"
                >
                  <option value="Food">Food</option>
                  <option value="Medication">Medication</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => {
                    const sev = e.target.value as Allergy['severity'];
                    setSeverity(sev);
                    if (sev === 'Severe') setIsSevereAlert(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs px-3 py-2.5 font-bold"
                >
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe (Anaphylaxis Risk)</option>
                </select>
              </div>
              <Input
                label="Typical Reaction"
                placeholder="e.g. Hives, Swelling, Wheezing"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
              />
            </div>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isSevereAlert}
                onChange={(e) => setIsSevereAlert(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Highlight as High Priority Critical Alert on profile card
              </span>
            </label>

            <Input
              label="Action Plan / Notes"
              placeholder="e.g. Carry EpiPen; administer Cetirizine if mild hives"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Save Allergy
              </Button>
            </div>
          </form>
        )}

        {/* Allergies List */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading allergies...</div>
        ) : allergies.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium">No allergies logged for {profile.personName}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click "Add Allergy" above to add any dietary, medication, or seasonal reactions.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {allergies.map((allergy) => (
              <div
                key={allergy.id}
                className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${
                  allergy.isSevereAlert || allergy.severity === 'Severe'
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {allergy.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        allergy.severity === 'Severe'
                          ? 'bg-rose-600 text-white'
                          : allergy.severity === 'Moderate'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {allergy.severity}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ({allergy.type})
                    </span>
                  </div>

                  {allergy.reaction && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>Reaction:</strong> {allergy.reaction}
                    </p>
                  )}

                  {allergy.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <strong>Notes:</strong> {allergy.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAllergy(allergy.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                  title="Delete allergy"
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
