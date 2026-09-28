import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { childService } from '../../services/childService';
import { Child, User } from '../../types';
import {
  GraduationCap,
  DollarSign,
  PhoneCall,
  User as UserIcon,
  Camera,
  AlertCircle,
  FileText,
  Clock,
  Calendar,
} from 'lucide-react';

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  onChildSaved: (child: Child) => void;
  editChild?: Child | null;
}

export const AddChildModal: React.FC<AddChildModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  onChildSaved,
  editChild,
}) => {
  const isEditing = Boolean(editChild);
  const [activeTab, setActiveTab] = useState<'basic' | 'school' | 'fees' | 'emergency'>('basic');

  // Basic Information
  const [fullName, setFullName] = useState(editChild?.fullName || '');
  const [nickname, setNickname] = useState(editChild?.nickname || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(editChild?.gender || 'male');
  const [dateOfBirth, setDateOfBirth] = useState(editChild?.dateOfBirth || '');
  const [bloodGroup, setBloodGroup] = useState(editChild?.bloodGroup || '');
  const [relationship, setRelationship] = useState(editChild?.relationship || 'Son');
  const [phone, setPhone] = useState(editChild?.phone || '');

  // School Information
  const [schoolName, setSchoolName] = useState(editChild?.schoolName || '');
  const [schoolAddress, setSchoolAddress] = useState(editChild?.schoolAddress || '');
  const [schoolPhone, setSchoolPhone] = useState(editChild?.schoolPhone || '');
  const [schoolEmail, setSchoolEmail] = useState(editChild?.schoolEmail || '');
  const [classGrade, setClassGrade] = useState(editChild?.classGrade || '');
  const [section, setSection] = useState(editChild?.section || '');
  const [rollNumber, setRollNumber] = useState(editChild?.rollNumber || '');
  const [admissionNumber, setAdmissionNumber] = useState(editChild?.admissionNumber || '');
  const [teacherName, setTeacherName] = useState(editChild?.teacherName || '');
  const [teacherPhone, setTeacherPhone] = useState(editChild?.teacherPhone || '');
  const [schoolTiming, setSchoolTiming] = useState(editChild?.schoolTiming || '');

  // School Fees (auto computed total)
  const [tuitionFee, setTuitionFee] = useState<number | string>(editChild?.tuitionFee ?? '');
  const [transportFee, setTransportFee] = useState<number | string>(editChild?.transportFee ?? '');
  const [otherFee, setOtherFee] = useState<number | string>(editChild?.otherFee ?? '');
  const [feeDueDate, setFeeDueDate] = useState<number | string>(editChild?.feeDueDate || '');
  const [feeNotes, setFeeNotes] = useState(editChild?.feeNotes || '');

  // Emergency & Contact
  const [emergencyContactName, setEmergencyContactName] = useState(editChild?.emergencyContactName || '');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(editChild?.emergencyContactRelation || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(editChild?.emergencyContactPhone || '');
  const [emergencyContactAltPhone, setEmergencyContactAltPhone] = useState(editChild?.emergencyContactAltPhone || '');
  const [emergencyNotes, setEmergencyNotes] = useState(editChild?.emergencyNotes || '');

  const [generalNotes, setGeneralNotes] = useState(editChild?.generalNotes || '');

  // Photo
  const [photoUrl, setPhotoUrl] = useState(editChild?.photo || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-calculated total monthly fee
  const calculatedTotalFee =
    (Number(tuitionFee) || 0) + (Number(transportFee) || 0) + (Number(otherFee) || 0);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 8 * 1024 * 1024) {
      setError('Photo must be less than 8MB.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const url = await childService.uploadChildPhoto(
        familyId,
        editChild?.id || `temp_${Date.now()}`,
        file
      );
      setPhotoUrl(url);
    } catch {
      setError('Could not upload photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setActiveTab('basic');
      setError('Child full name is required.');
      return;
    }

    if (!dateOfBirth) {
      setActiveTab('basic');
      setError('Please provide date of birth.');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && editChild) {
        await childService.updateChild(
          familyId,
          editChild.id,
          {
            fullName: fullName.trim(),
            nickname: nickname.trim() || undefined,
            photo: photoUrl || undefined,
            gender,
            dateOfBirth,
            bloodGroup: bloodGroup.trim() || undefined,
            relationship,
            phone: phone.trim() || undefined,

            schoolName: schoolName.trim() || undefined,
            schoolAddress: schoolAddress.trim() || undefined,
            schoolPhone: schoolPhone.trim() || undefined,
            schoolEmail: schoolEmail.trim() || undefined,
            classGrade: classGrade.trim() || undefined,
            section: section.trim() || undefined,
            rollNumber: rollNumber.trim() || undefined,
            admissionNumber: admissionNumber.trim() || undefined,
            teacherName: teacherName.trim() || undefined,
            teacherPhone: teacherPhone.trim() || undefined,
            schoolTiming: schoolTiming.trim() || undefined,

            tuitionFee: Number(tuitionFee) || 0,
            transportFee: Number(transportFee) || 0,
            otherFee: Number(otherFee) || 0,
            feeDueDate: feeDueDate || undefined,
            feeNotes: feeNotes.trim() || undefined,

            emergencyContactName: emergencyContactName.trim() || undefined,
            emergencyContactRelation: emergencyContactRelation.trim() || undefined,
            emergencyContactPhone: emergencyContactPhone.trim() || undefined,
            emergencyContactAltPhone: emergencyContactAltPhone.trim() || undefined,
            emergencyNotes: emergencyNotes.trim() || undefined,

            generalNotes: generalNotes.trim() || undefined,
          },
          currentUser
        );
        onChildSaved({
          ...editChild,
          fullName: fullName.trim(),
          nickname: nickname.trim() || undefined,
          photo: photoUrl || undefined,
          gender,
          dateOfBirth,
          bloodGroup: bloodGroup.trim() || undefined,
          relationship,
          phone: phone.trim() || undefined,
          schoolName: schoolName.trim() || undefined,
          schoolAddress: schoolAddress.trim() || undefined,
          schoolPhone: schoolPhone.trim() || undefined,
          schoolEmail: schoolEmail.trim() || undefined,
          classGrade: classGrade.trim() || undefined,
          section: section.trim() || undefined,
          rollNumber: rollNumber.trim() || undefined,
          admissionNumber: admissionNumber.trim() || undefined,
          teacherName: teacherName.trim() || undefined,
          teacherPhone: teacherPhone.trim() || undefined,
          schoolTiming: schoolTiming.trim() || undefined,
          tuitionFee: Number(tuitionFee) || 0,
          transportFee: Number(transportFee) || 0,
          otherFee: Number(otherFee) || 0,
          totalMonthlyFee: calculatedTotalFee,
          feeDueDate: feeDueDate || undefined,
          feeNotes: feeNotes.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactAltPhone: emergencyContactAltPhone.trim() || undefined,
          emergencyNotes: emergencyNotes.trim() || undefined,
          generalNotes: generalNotes.trim() || undefined,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newChild = await childService.addChild(
          familyId,
          {
            fullName: fullName.trim(),
            nickname: nickname.trim() || undefined,
            photo: photoUrl || undefined,
            gender,
            dateOfBirth,
            bloodGroup: bloodGroup.trim() || undefined,
            relationship,
            phone: phone.trim() || undefined,

            schoolName: schoolName.trim() || undefined,
            schoolAddress: schoolAddress.trim() || undefined,
            schoolPhone: schoolPhone.trim() || undefined,
            schoolEmail: schoolEmail.trim() || undefined,
            classGrade: classGrade.trim() || undefined,
            section: section.trim() || undefined,
            rollNumber: rollNumber.trim() || undefined,
            admissionNumber: admissionNumber.trim() || undefined,
            teacherName: teacherName.trim() || undefined,
            teacherPhone: teacherPhone.trim() || undefined,
            schoolTiming: schoolTiming.trim() || undefined,

            tuitionFee: Number(tuitionFee) || 0,
            transportFee: Number(transportFee) || 0,
            otherFee: Number(otherFee) || 0,
            feeDueDate: feeDueDate || undefined,
            feeNotes: feeNotes.trim() || undefined,

            emergencyContactName: emergencyContactName.trim() || undefined,
            emergencyContactRelation: emergencyContactRelation.trim() || undefined,
            emergencyContactPhone: emergencyContactPhone.trim() || undefined,
            emergencyContactAltPhone: emergencyContactAltPhone.trim() || undefined,
            emergencyNotes: emergencyNotes.trim() || undefined,

            generalNotes: generalNotes.trim() || undefined,
            createdBy: currentUser.id,
          },
          currentUser
        );
        onChildSaved(newChild);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save child profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Child Profile' : 'Add Child'}
      subtitle="Manage child records, schooling, tuition fees, and emergency contacts."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" /> Basic Info
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'school'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> School & Teacher
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'fees'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" /> School Fees
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`px-3.5 py-2.5 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'emergency'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-4 h-4" /> Emergency Contacts
          </button>
        </div>

        {/* TAB 1: BASIC INFORMATION */}
        {activeTab === 'basic' && (
          <div className="space-y-4 pt-1">
            {/* Photo Uploader */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Avatar
                src={photoUrl}
                name={fullName || 'Child'}
                size="lg"
                className="ring-2 ring-indigo-500/30"
              />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Child Photo
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={isUploadingPhoto}
                    icon={<Camera className="w-3.5 h-3.5" />}
                  >
                    {photoUrl ? 'Change' : 'Upload'}
                  </Button>
                  {photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl('')}
                      className="text-rose-500"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Child Full Name *"
                placeholder="e.g. Ali Khan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Nickname"
                placeholder="e.g. Ali, Sonu"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gender *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="male">Boy (Male)</option>
                  <option value="female">Girl (Female)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <Input
                  label="Date of Birth *"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="Blood Group (Optional)"
                  placeholder="e.g. B+, O-"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Relationship in Family
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Nephew">Nephew</option>
                  <option value="Niece">Niece</option>
                  <option value="Grandson">Grandson</option>
                  <option value="Granddaughter">Granddaughter</option>
                  <option value="Ward">Ward</option>
                </select>
              </div>

              <Input
                label="Child Phone / Watch (optional)"
                placeholder="e.g. +92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: SCHOOL & TEACHER INFORMATION */}
        {activeTab === 'school' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="School / Institution Name"
                placeholder="e.g. Beaconhouse, City School, Army Public"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              <Input
                label="School Address / Campus"
                placeholder="e.g. F-8/3 Campus, Islamabad"
                value={schoolAddress}
                onChange={(e) => setSchoolAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="Class / Grade"
                placeholder="e.g. Class 5"
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
              />
              <Input
                label="Section"
                placeholder="e.g. Red, B"
                value={section}
                onChange={(e) => setSection(e.target.value)}
              />
              <Input
                label="Roll Number"
                placeholder="e.g. 18"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />
              <Input
                label="Admission ID"
                placeholder="e.g. ADM-2024-09"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
              />
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
              <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                Teacher Information
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Teacher / Class In-charge"
                  placeholder="e.g. Ms. Fatima Khan"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
                <Input
                  label="Teacher Contact Phone"
                  placeholder="e.g. +92 321 9876543"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="School Timing"
                placeholder="e.g. 7:45 AM - 1:30 PM"
                value={schoolTiming}
                onChange={(e) => setSchoolTiming(e.target.value)}
              />
              <Input
                label="School Office Phone"
                placeholder="e.g. 051-1234567"
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 3: SCHOOL FEES BREAKDOWN */}
        {activeTab === 'fees' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  Total Expected Monthly School Cost
                </p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  Rs. {calculatedTotalFee.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Monthly Tuition Fee (Rs.)"
                type="number"
                min="0"
                placeholder="e.g. 8000"
                value={tuitionFee}
                onChange={(e) => setTuitionFee(e.target.value)}
              />
              <Input
                label="Transport / Van Fee (Rs.)"
                type="number"
                min="0"
                placeholder="e.g. 2500"
                value={transportFee}
                onChange={(e) => setTransportFee(e.target.value)}
              />
              <Input
                label="Other Monthly Fees (Rs.)"
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={otherFee}
                onChange={(e) => setOtherFee(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Monthly Fee Due Date"
                placeholder="e.g. 5th of every month"
                value={feeDueDate}
                onChange={(e) => setFeeDueDate(e.target.value)}
              />
              <Input
                label="Fee Challan / Account Notes"
                placeholder="e.g. HBL Branch Challan, online app"
                value={feeNotes}
                onChange={(e) => setFeeNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* TAB 4: GUARDIANS & EMERGENCY CONTACTS */}
        {activeTab === 'emergency' && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-3">
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                Emergency Contact
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Emergency Contact Name"
                  placeholder="e.g. Tariq Khan (Uncle)"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
                <Input
                  label="Relationship to Child"
                  placeholder="e.g. Father, Mother, Uncle"
                  value={emergencyContactRelation}
                  onChange={(e) => setEmergencyContactRelation(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Primary Emergency Phone *"
                  placeholder="e.g. +92 300 1234567"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
                <Input
                  label="Alternative Phone"
                  placeholder="e.g. +92 321 7654321"
                  value={emergencyContactAltPhone}
                  onChange={(e) => setEmergencyContactAltPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                General Profile Notes
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="e.g. Pickup instructions, allergies notes, favorite activities..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* Footer Navigation & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {activeTab !== 'basic' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (activeTab === 'emergency') setActiveTab('fees');
                  else if (activeTab === 'fees') setActiveTab('school');
                  else if (activeTab === 'school') setActiveTab('basic');
                }}
              >
                Back
              </Button>
            )}
            {activeTab !== 'emergency' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'basic') setActiveTab('school');
                  else if (activeTab === 'school') setActiveTab('fees');
                  else if (activeTab === 'fees') setActiveTab('emergency');
                }}
              >
                Next Section →
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={loading} className="font-bold">
              {isEditing ? 'Save Changes' : 'Create Child Profile'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
