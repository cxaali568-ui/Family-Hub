import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { medicalService } from '../../services/medicalService';
import { MedicalProfile, MedicalAppointment, User } from '../../types';
import { Calendar, Clock, MapPin, Stethoscope } from 'lucide-react';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  profiles: MedicalProfile[];
  currentUser: User;
  onAppointmentAdded?: (appt: MedicalAppointment) => void;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({
  isOpen,
  onClose,
  familyId,
  profiles,
  currentUser,
  onAppointmentAdded,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id || '');
  const [customPersonName, setCustomPersonName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [hospitalClinic, setHospitalClinic] = useState('');
  const [appointmentType, setAppointmentType] = useState('Routine Checkup');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [reasonNotes, setReasonNotes] = useState('');
  const [reminderTime, setReminderTime] = useState('2 hours before');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const personName = selectedProfile ? selectedProfile.personName : (customPersonName.trim() || currentUser.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName) {
      setError('Please select or specify a family member.');
      return;
    }
    if (!doctorName.trim()) {
      setError('Doctor name is required.');
      return;
    }
    if (!hospitalClinic.trim()) {
      setError('Clinic or hospital name is required.');
      return;
    }
    if (!date || !time) {
      setError('Date and time are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const newAppt = await medicalService.addAppointment(familyId, {
        profileId: selectedProfileId || `person_${Date.now()}`,
        personName,
        doctorName: doctorName.trim(),
        hospitalClinic: hospitalClinic.trim(),
        date,
        time,
        appointmentType,
        reasonNotes: reasonNotes.trim() || undefined,
        status: 'Upcoming',
        reminderTime,
      });

      onAppointmentAdded?.(newAppt);
      onClose();
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setError(err?.message || 'Failed to schedule appointment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Medical Appointment"
      subtitle="Log doctor visits, clinic checkups, and vaccination schedules for the household."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Family Member / Patient *
          </label>
          {profiles.length > 0 ? (
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 font-medium"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.personName} ({p.bloodGroup})
                </option>
              ))}
            </select>
          ) : (
            <Input
              placeholder="e.g. Tariq Khan, Sarah Khan"
              value={customPersonName}
              onChange={(e) => setCustomPersonName(e.target.value)}
              required
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Doctor / Specialist Name *"
            placeholder="e.g. Dr. Ayesha Siddiqui"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Visit Type
            </label>
            <select
              value={appointmentType}
              onChange={(e) => setAppointmentType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 font-medium"
            >
              <option value="Routine Checkup">Routine Checkup</option>
              <option value="Consultation">Specialist Consultation</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Follow-up">Follow-up Visit</option>
              <option value="Dental">Dental Checkup</option>
              <option value="Eye Exam">Eye / Ophthalmology</option>
              <option value="Lab / Diagnostic">Blood Test / Diagnostic</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Hospital / Clinic *"
            placeholder="e.g. Shifa Hospital, Clifton Clinic"
            value={hospitalClinic}
            onChange={(e) => setHospitalClinic(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reminder Notification
            </label>
            <select
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 font-medium"
            >
              <option value="1 hour before">1 hour before</option>
              <option value="2 hours before">2 hours before</option>
              <option value="1 day before">1 day before</option>
              <option value="2 days before">2 days before</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label="Time *"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <Input
          label="Purpose / Symptoms / Notes"
          placeholder="e.g. 6-month pediatric follow-up, bring vaccination booklet"
          value={reasonNotes}
          onChange={(e) => setReasonNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            Schedule Appointment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
