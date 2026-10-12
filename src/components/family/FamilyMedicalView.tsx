import React, { useState, useEffect } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import {
  HeartPulse,
  AlertTriangle,
  Pill,
  Phone,
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Stethoscope,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Activity,
  UserCheck,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';
import { medicalService } from '../../services/medicalService';
import { memberProfileService } from '../../services/memberProfileService';
import { childService } from '../../services/childService';
import {
  MedicalProfile,
  MedicalAppointment,
  FamilyMemberProfile,
  Child,
} from '../../types';
import { AddMedicalProfileModal } from '../medical/AddMedicalProfileModal';
import { EditMedicalProfileModal } from '../medical/EditMedicalProfileModal';
import { ManageAllergiesModal } from '../medical/ManageAllergiesModal';
import { ManageMedicinesModal } from '../medical/ManageMedicinesModal';
import { ManageConditionsModal } from '../medical/ManageConditionsModal';
import { ManageDoctorsModal } from '../medical/ManageDoctorsModal';
import { AddAppointmentModal } from '../medical/AddAppointmentModal';

export const FamilyMedicalView: React.FC = () => {
  const { currentFamily, familyRole, familyPermissions } = useFamily();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const familyId = currentFamily?.id || '';

  // Data states
  const [profiles, setProfiles] = useState<MedicalProfile[]>([]);
  const [appointments, setAppointments] = useState<MedicalAppointment[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<FamilyMemberProfile[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active top tab
  const [activeTab, setActiveTab] = useState<'profiles' | 'appointments'>('profiles');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('all');
  const [selectedPersonType, setSelectedPersonType] = useState<'all' | 'adult' | 'child' | 'elderly'>('all');

  // Modals state
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<MedicalProfile | null>(null);
  const [allergiesProfile, setAllergiesProfile] = useState<MedicalProfile | null>(null);
  const [medicinesProfile, setMedicinesProfile] = useState<MedicalProfile | null>(null);
  const [conditionsProfile, setConditionsProfile] = useState<MedicalProfile | null>(null);
  const [doctorsProfile, setDoctorsProfile] = useState<MedicalProfile | null>(null);
  const [isAddApptOpen, setIsAddApptOpen] = useState(false);

  // Subscriptions
  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Ensure owner has member profile if needed
    if (user) {
      memberProfileService.ensureOwnerProfile(familyId, user, familyRole || 'owner').catch(() => {});
    }

    const unsubProfiles = medicalService.subscribeMedicalProfiles(
      familyId,
      (list) => {
        setProfiles(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching medical profiles:', err);
        setError('Failed to load medical profiles. Please check permissions.');
        setLoading(false);
      }
    );

    const unsubAppointments = medicalService.subscribeAppointments(
      familyId,
      (list) => setAppointments(list)
    );

    const unsubMembers = memberProfileService.subscribeMemberProfiles(
      familyId,
      (list) => setMemberProfiles(list)
    );

    const unsubChildren = childService.subscribeChildren(
      familyId,
      (list) => setChildren(list)
    );

    return () => {
      unsubProfiles();
      unsubAppointments();
      unsubMembers();
      unsubChildren();
    };
  }, [familyId, user, familyRole]);

  // Handlers
  const handleDeleteProfile = async (profile: MedicalProfile) => {
    if (!user) return;
    const confirm = window.confirm(
      `Are you sure you want to delete the medical profile for "${profile.personName}"? This action cannot be undone.`
    );
    if (!confirm) return;

    try {
      await medicalService.deleteMedicalProfile(familyId, profile.id, profile.personName, user);
      showSuccess(`Deleted medical profile for ${profile.personName}`);
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      showError(err?.message || 'Failed to delete medical profile.');
    }
  };

  const handleToggleApptStatus = async (appt: MedicalAppointment) => {
    const nextStatus = appt.status === 'Upcoming' ? 'Completed' : 'Upcoming';
    try {
      await medicalService.updateAppointmentStatus(familyId, appt.id, nextStatus);
      showSuccess(`Appointment marked as ${nextStatus.toLowerCase()}`);
    } catch (err: any) {
      console.error('Error updating appointment:', err);
      showError(err?.message || 'Failed to update appointment status.');
    }
  };

  const handleDeleteAppt = async (apptId: string) => {
    if (!window.confirm('Delete this appointment record?')) return;
    try {
      await medicalService.deleteAppointment(familyId, apptId);
      showSuccess('Appointment removed');
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      showError(err?.message || 'Failed to delete appointment.');
    }
  };

  // Filtered profiles
  const filteredProfiles = profiles.filter((p) => {
    if (selectedBloodGroup !== 'all' && p.bloodGroup !== selectedBloodGroup) return false;
    if (selectedPersonType !== 'all' && p.personType !== selectedPersonType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.personName.toLowerCase().includes(q);
      const matchAlert = p.importantAlert?.toLowerCase().includes(q);
      const matchBlood = p.bloodGroup?.toLowerCase().includes(q);
      const matchContact = p.emergencyContactName?.toLowerCase().includes(q);
      if (!matchName && !matchAlert && !matchBlood && !matchContact) return false;
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <HeartPulse className="w-5 h-5" />
            </div>
            Family Medical & Health Records
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Emergency cards, allergies, chronic conditions, daily prescriptions, and doctor visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddApptOpen(true)}
            className="text-xs font-bold gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Log Visit
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddProfileOpen(true)}
            className="text-xs font-bold gap-1.5 shadow-sm bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Health Profile
          </Button>
        </div>
      </div>

      {/* Error banner if present */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('profiles')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'profiles'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Health Profiles ({profiles.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'appointments'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Doctor Visits & Appointments ({appointments.length})
        </button>
      </div>

      {/* TAB 1: HEALTH PROFILES */}
      {activeTab === 'profiles' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative sm:col-span-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, allergy, alert..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <select
                value={selectedBloodGroup}
                onChange={(e) => setSelectedBloodGroup(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="all">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div>
              <select
                value={selectedPersonType}
                onChange={(e) => setSelectedPersonType(e.target.value as any)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
              >
                <option value="all">All Age Groups</option>
                <option value="adult">Adults</option>
                <option value="child">Children</option>
                <option value="elderly">Elderly / Seniors</option>
              </select>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-2 flex-1">
                      <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                      <div className="w-1/4 h-3 bg-slate-100 dark:bg-slate-800/60 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 mx-auto flex items-center justify-center">
                <HeartPulse className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {profiles.length === 0 ? 'No Medical Profiles Added Yet' : 'No Profiles Match Your Filter'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {profiles.length === 0
                  ? 'Store essential blood types, emergency contacts, allergy alerts, and prescription reminders in one secure family place.'
                  : 'Try clearing your search query or changing the blood group filter.'}
              </p>
              {profiles.length === 0 && (
                <Button
                  variant="primary"
                  onClick={() => setIsAddProfileOpen(true)}
                  className="font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create First Medical Profile
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredProfiles.map((p) => (
                <Card key={p.id} className="p-5 space-y-4 rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar
                          src={p.photo}
                          name={p.personName}
                          size="lg"
                          className="rounded-2xl ring-2 ring-rose-500/20"
                        />
                        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-lg bg-rose-600 text-white font-black text-[10px] shadow-sm">
                          {p.bloodGroup}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                          {p.personName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {p.personType}
                          </span>
                          {(p.height || p.weight) && (
                            <span className="text-[11px] text-slate-400">
                              &bull; {[p.height, p.weight].filter(Boolean).join(' / ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingProfile(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Critical Alert Banner if present */}
                  {p.importantAlert && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5 text-xs font-bold leading-snug">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{p.importantAlert}</span>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {p.emergencyContactName && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Emergency Contact ({p.emergencyContactRelation || 'Primary'})
                        </p>
                        <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {p.emergencyContactName}
                        </p>
                      </div>

                      {p.emergencyContactPhone && (
                        <a
                          href={`tel:${p.emergencyContactPhone}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      )}
                    </div>
                  )}

                  {/* Medical History or Instructions preview */}
                  {(p.emergencyNotes || p.medicalHistory) && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      {p.emergencyNotes && (
                        <p>
                          <strong className="text-slate-800 dark:text-slate-200">Notes:</strong>{' '}
                          {p.emergencyNotes}
                        </p>
                      )}
                      {p.medicalHistory && (
                        <p className="text-[11px] text-slate-500 italic">
                          <strong>History:</strong> {p.medicalHistory}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quick-Access Management Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAllergiesProfile(p)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all text-center flex flex-col items-center gap-1"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Allergies</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMedicinesProfile(p)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all text-center flex flex-col items-center gap-1"
                    >
                      <Pill className="w-4 h-4 text-indigo-500" />
                      <span>Medicines</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConditionsProfile(p)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all text-center flex flex-col items-center gap-1"
                    >
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      <span>Conditions</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDoctorsProfile(p)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition-all text-center flex flex-col items-center gap-1"
                    >
                      <UserCheck className="w-4 h-4 text-blue-500" />
                      <span>Doctors</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPOINTMENTS & CLINIC VISITS */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Upcoming & Recorded Visits ({appointments.length})
            </p>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddApptOpen(true)}
              className="text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Visit
            </Button>
          </div>

          {appointments.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Medical Appointments Scheduled
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Keep the whole family aligned on doctor appointments, pediatrician checkups, vaccinations, and dental visits.
              </p>
              <Button
                variant="primary"
                onClick={() => setIsAddApptOpen(true)}
                className="font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Log First Appointment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div
                  key={appt.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    appt.status === 'Completed'
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex flex-col items-center justify-center font-bold shrink-0">
                      <span className="text-[10px] uppercase">{new Date(appt.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                      <span className="text-base leading-none">{new Date(appt.date).getDate() || appt.date.split('-')[2]}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {appt.doctorName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {appt.appointmentType}
                        </span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          Patient: {appt.personName}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {appt.hospitalClinic} &bull; {appt.time} {appt.reminderTime ? `(Reminder: ${appt.reminderTime})` : ''}
                      </p>

                      {appt.reasonNotes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          Notes: {appt.reasonNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleApptStatus(appt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        appt.status === 'Completed'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {appt.status === 'Completed' ? 'Completed' : 'Mark Done'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAppt(appt.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete appointment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Medical Responsibility Disclaimer */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 flex items-start gap-2.5 leading-relaxed">
        <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Emergency & Safety Notice:</strong> FamilyHub stores household health records for family preparedness only and does not offer medical diagnosis, dosing prescriptions, or treatment advice. In a health emergency, immediately contact your local emergency number (e.g. 1122 or 911).
        </span>
      </div>

      {/* Modals */}
      {user && (
        <>
          <AddMedicalProfileModal
            isOpen={isAddProfileOpen}
            onClose={() => setIsAddProfileOpen(false)}
            familyId={familyId}
            currentUser={user}
            members={memberProfiles}
            children={children}
            existingProfiles={profiles}
            onProfileAdded={(newP) => {
              showSuccess(`Created health profile for ${newP.personName}`);
            }}
          />

          {editingProfile && (
            <EditMedicalProfileModal
              isOpen={!!editingProfile}
              onClose={() => setEditingProfile(null)}
              familyId={familyId}
              profile={editingProfile}
              currentUser={user}
              onProfileUpdated={() => {
                showSuccess('Medical profile updated successfully');
              }}
            />
          )}

          {allergiesProfile && (
            <ManageAllergiesModal
              isOpen={!!allergiesProfile}
              onClose={() => setAllergiesProfile(null)}
              familyId={familyId}
              profile={allergiesProfile}
              currentUser={user}
            />
          )}

          {medicinesProfile && (
            <ManageMedicinesModal
              isOpen={!!medicinesProfile}
              onClose={() => setMedicinesProfile(null)}
              familyId={familyId}
              profile={medicinesProfile}
              currentUser={user}
            />
          )}

          {conditionsProfile && (
            <ManageConditionsModal
              isOpen={!!conditionsProfile}
              onClose={() => setConditionsProfile(null)}
              familyId={familyId}
              profile={conditionsProfile}
              currentUser={user}
            />
          )}

          {doctorsProfile && (
            <ManageDoctorsModal
              isOpen={!!doctorsProfile}
              onClose={() => setDoctorsProfile(null)}
              familyId={familyId}
              profile={doctorsProfile}
              currentUser={user}
            />
          )}

          <AddAppointmentModal
            isOpen={isAddApptOpen}
            onClose={() => setIsAddApptOpen(false)}
            familyId={familyId}
            profiles={profiles}
            currentUser={user}
            onAppointmentAdded={(appt) => {
              showSuccess(`Scheduled visit with ${appt.doctorName}`);
            }}
          />
        </>
      )}
    </div>
  );
};
