import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { medicalService } from '../../services/medicalService';
import { MedicalProfile, FamilyMemberProfile, Child, User } from '../../types';
import { HeartPulse, AlertTriangle, Shield, Check, Phone, User as UserIcon } from 'lucide-react';

interface AddMedicalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  members: FamilyMemberProfile[];
  children: Child[];
  existingProfiles: MedicalProfile[];
  onProfileAdded: (profile: MedicalProfile) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export const AddMedicalProfileModal: React.FC<AddMedicalProfileModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  members,
  children,
  existingProfiles,
  onProfileAdded,
}) => {
  // Candidate people who don't already have a medical profile
  const existingPersonIds = new Set(existingProfiles.map((p) => p.personId));

  const candidateMembers = members.filter((m) => !existingPersonIds.has(m.id));
  const candidateChildren = children.filter((c) => !existingPersonIds.has(c.id));

  // Selection
  const [selectedType, setSelectedType] = useState<'member' | 'child'>('member');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    candidateMembers[0]?.id || candidateChildren[0]?.id || ''
  );

  const [bloodGroup, setBloodGroup] = useState('O+');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [importantAlert, setImportantAlert] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected person details
  const selectedMember = candidateMembers.find((m) => m.id === selectedPersonId);
  const selectedChild = candidateChildren.find((c) => c.id === selectedPersonId);

  const personName =
    selectedType === 'member'
      ? selectedMember?.fullName || 'Family Member'
      : selectedChild?.fullName || 'Child';

  const photo =
    selectedType === 'member'
      ? selectedMember?.profileImage
      : selectedChild?.photo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedPersonId) {
      setError('Please select a family member or child.');
      return;
    }

    setLoading(true);
    try {
      const newProfile = await medicalService.addMedicalProfile(
        familyId,
        {
          personId: selectedPersonId,
          personName,
          personType: selectedType === 'member' ? (selectedMember?.isChild ? 'child' : 'adult') : 'child',
          photo,
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
          createdBy: currentUser.id,
        },
        currentUser
      );
      onProfileAdded(newProfile);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create medical profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Medical Profile"
      subtitle="Safely store emergency health info, allergies, and ongoing care for a family member."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Person Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            1. Select Family Member or Child
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedType('member');
                setSelectedPersonId(candidateMembers[0]?.id || '');
              }}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                selectedType === 'member'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Adult / Family Member ({candidateMembers.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedType('child');
                setSelectedPersonId(candidateChildren[0]?.id || '');
              }}
              className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center ${
                selectedType === 'child'
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Child ({candidateChildren.length})
            </button>
          </div>

          <div>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 font-medium"
              required
            >
              {selectedType === 'member' ? (
                candidateMembers.length > 0 ? (
                  candidateMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.relationship})
                    </option>
                  ))
                ) : (
                  <option value="">All family members already have medical profiles</option>
                )
              ) : candidateChildren.length > 0 ? (
                candidateChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.classGrade || 'Child'})
                  </option>
                ))
              ) : (
                <option value="">All children already have medical profiles</option>
              )}
            </select>
          </div>
        </div>

        {/* Basic Health Metrics */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            2. Basic Health Metrics
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
              label="Height (optional)"
              placeholder="e.g. 5 ft 8 in or 172 cm"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />

            <Input
              label="Weight (optional)"
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
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Will be prominently displayed at the top of the person's emergency card.
            </p>
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
            3. Primary Emergency Contact
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
            4. Medical History & Previous Surgeries (Optional)
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

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Create Health Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
};
