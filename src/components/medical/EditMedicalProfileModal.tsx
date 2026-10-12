import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { MedicalProfile, User } from '../../types';
import { AlertTriangle, Shield } from 'lucide-react';

interface EditMedicalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profile: MedicalProfile;
  currentUser: User;
  onProfileUpdated?: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const EditMedicalProfileModal: React.FC<EditMedicalProfileModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profile,
  currentUser,
  onProfileUpdated,
}) => {
  const [personName, setPersonName] = useState(profile.personName);
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup || 'Unknown');
  const [height, setHeight] = useState(profile.height || '');
  const [weight, setWeight] = useState(profile.weight || '');
  const [importantAlert, setImportantAlert] = useState(profile.importantAlert || '');
  const [surgeries, setSurgeries] = useState(profile.surgeries || '');
  const [medicalHistory, setMedicalHistory] = useState(profile.medicalHistory || '');
  const [emergencyNotes, setEmergencyNotes] = useState(profile.emergencyNotes || '');

  const [emergencyContactName, setEmergencyContactName] = useState(profile.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile.emergencyContactPhone || '');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(profile.emergencyContactRelation || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setError('Person name cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await medicalService.updateMedicalProfile(
        familyId,
        profile.id,
        {
          personName: personName.trim(),
          bloodGroup,
          height: height.trim() || undefined,
          weight: weight.trim() || undefined,
          importantAlert: importantAlert.trim() || undefined,
          surgeries: surgeries.trim() || undefined,
          medicalHistory: medicalHistory.trim() || undefined,
          emergencyNotes: emergencyNotes.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
        },
        currentUser
      );
      onProfileUpdated?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to update medical profile:', err);
      setError(err?.message || 'Failed to update medical profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Medical Profile — ${profile.personName}`}
      subtitle="Update vital health metrics, allergies, and emergency information."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <Input
          label="Person / Dependent Name"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          required
        />

        {/* Basic Health Metrics */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Health Metrics
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Blood Group *
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 font-bold text-rose-600"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <Input
              label="Height"
              placeholder="e.g. 5 ft 8 in or 172 cm"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />

            <Input
              label="Weight"
              placeholder="e.g. 68 kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* High Priority Critical Alert */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Critical Health Alert / Severe Allergy Notice</span>
            </div>
            <Input
              placeholder="e.g. ⚠️ Severe Penicillin Allergy - Anaphylaxis Risk"
              value={importantAlert}
              onChange={(e) => setImportantAlert(e.target.value)}
              className="bg-white dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Primary Emergency Contact
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Contact Name"
              placeholder="e.g. Tariq Khan"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
            <Input
              label="Relationship"
              placeholder="e.g. Father, Spouse"
              value={emergencyContactRelation}
              onChange={(e) => setEmergencyContactRelation(e.target.value)}
            />
            <Input
              label="Emergency Phone"
              placeholder="e.g. +92 300 1234567"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>

          <Input
            label="Emergency Instructions / Hospital Preference"
            placeholder="e.g. Preferred Hospital: Shifa International; Keep inhaler in backpack"
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
          />
        </div>

        {/* Medical History */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Medical History & Previous Surgeries
          </label>
          <textarea
            rows={2}
            value={medicalHistory}
            onChange={(e) => setMedicalHistory(e.target.value)}
            placeholder="e.g. Appendectomy in 2018, history of asthma in childhood..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Responsible Disclaimer */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
          <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            FamilyHub is an organization tool for your household records and does not provide medical diagnoses or advice. In an emergency, always contact local emergency services immediately.
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
