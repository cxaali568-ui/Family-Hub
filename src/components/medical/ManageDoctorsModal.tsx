import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { Doctor, MedicalProfile, User } from '../../types';
import { UserCheck, Plus, Trash2, Phone, Mail, MapPin } from 'lucide-react';

interface ManageDoctorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profile: MedicalProfile;
  currentUser: User;
}

export const ManageDoctorsModal: React.FC<ManageDoctorsModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profile,
  currentUser,
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New doctor state
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('Pediatrician / Family Physician');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !familyId || !profile.id) return;
    setLoading(true);
    const unsub = medicalService.subscribeDoctors(familyId, profile.id, (list) => {
      setDoctors(list);
      setLoading(false);
    });
    return () => unsub();
  }, [isOpen, familyId, profile.id]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Doctor name is required.');
      return;
    }
    if (!hospitalClinic.trim()) {
      setError('Hospital or clinic name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await medicalService.addDoctor(familyId, profile.id, {
        name: name.trim(),
        specialty: specialty.trim(),
        hospitalClinic: hospitalClinic.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setName('');
      setHospitalClinic('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      console.error('Failed to add doctor:', err);
      setError(err?.message || 'Failed to add doctor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!window.confirm('Are you sure you want to remove this doctor from records?')) return;
    try {
      await medicalService.deleteDoctor(familyId, profile.id, doctorId);
    } catch (err: any) {
      console.error('Failed to delete doctor:', err);
      setError(err?.message || 'Failed to delete doctor.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Primary Doctors & Specialists — ${profile.personName}`}
      subtitle="Quick access to contact info for family physicians, clinics, and specialists."
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
            Assigned Doctors ({doctors.length})
          </p>
          {!showAddForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Doctor
            </Button>
          )}
        </div>

        {/* Add Doctor Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddDoctor}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Add Doctor or Clinic Record
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
                label="Doctor Name *"
                placeholder="e.g. Dr. Ayesha Siddiqui"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Specialty *"
                placeholder="e.g. Pediatrician, Cardiologist, Dentist"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Hospital / Clinic Name *"
                placeholder="e.g. Aga Khan University Hospital"
                value={hospitalClinic}
                onChange={(e) => setHospitalClinic(e.target.value)}
                required
              />
              <Input
                label="Phone Number *"
                placeholder="e.g. +92 21 111 911 911"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                label="Email (optional)"
                placeholder="e.g. clinic@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Clinic Address (optional)"
                placeholder="e.g. Stadium Road, Karachi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <Input
              label="Consultation Hours / Notes"
              placeholder="e.g. Mon-Thu 4pm-7pm by appointment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="submit" loading={saving}>
                Save Doctor
              </Button>
            </div>
          </form>
        )}

        {/* Doctors List */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 font-medium">No doctors recorded for {profile.personName}.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click "Add Doctor" above to keep their primary clinic contacts handy.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {doctors.map((docItem) => (
              <div
                key={docItem.id}
                className="p-3.5 rounded-2xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                      {docItem.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                      {docItem.specialty}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {docItem.hospitalClinic}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-500">
                    <a
                      href={`tel:${docItem.phone}`}
                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      <Phone className="w-3 h-3" /> {docItem.phone}
                    </a>
                    {docItem.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> {docItem.email}
                      </span>
                    )}
                    {docItem.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {docItem.address}
                      </span>
                    )}
                  </div>

                  {docItem.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      Notes: {docItem.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${docItem.phone}`}
                    className="p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg hover:bg-emerald-100"
                    title="Call doctor"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoctor(docItem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    title="Delete doctor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
