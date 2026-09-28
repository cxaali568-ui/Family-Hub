import React, { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { memberProfileService } from '../../services/memberProfileService';
import { FamilyMemberProfile, User, FamilyMember } from '../../types';
import { Upload, X, Camera, AlertCircle, Check, Link as LinkIcon, Loader2 } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: User;
  existingMembers: FamilyMember[];
  onMemberAdded: (profile: FamilyMemberProfile) => void;
  editProfile?: FamilyMemberProfile | null;
}

const RELATIONSHIP_OPTIONS = [
  'Father',
  'Mother',
  'Husband',
  'Wife',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Uncle',
  'Aunt',
  'Cousin',
  'Other',
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  familyId,
  currentUser,
  existingMembers,
  onMemberAdded,
  editProfile,
}) => {
  const isEditing = Boolean(editProfile);

  const [fullName, setFullName] = useState(editProfile?.fullName || '');
  const [nickname, setNickname] = useState(editProfile?.nickname || '');
  const [relationship, setRelationship] = useState(
    editProfile
      ? RELATIONSHIP_OPTIONS.includes(editProfile.relationship)
        ? editProfile.relationship
        : 'Other'
      : 'Father'
  );
  const [customRelationship, setCustomRelationship] = useState(
    editProfile && !RELATIONSHIP_OPTIONS.includes(editProfile.relationship)
      ? editProfile.relationship
      : ''
  );
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(editProfile?.gender || 'male');
  const [dateOfBirth, setDateOfBirth] = useState(editProfile?.dateOfBirth || '');
  const [phone, setPhone] = useState(editProfile?.phone || '');
  const [email, setEmail] = useState(editProfile?.email || '');
  const [address, setAddress] = useState(editProfile?.address || '');
  const [notes, setNotes] = useState(editProfile?.notes || '');
  const [isChild, setIsChild] = useState(editProfile?.isChild || false);

  // Link to registered user account (optional)
  const [selectedUserId, setSelectedUserId] = useState<string>(editProfile?.userId || '');

  // Photo upload state
  const [photoUrl, setPhotoUrl] = useState(editProfile?.profileImage || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a valid JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8MB.');
      return;
    }

    setError('');
    setIsUploadingPhoto(true);
    setUploadProgress(0);

    try {
      const url = await memberProfileService.uploadProfilePhoto(
        familyId,
        editProfile?.id || `temp_${Date.now()}`,
        file,
        (p) => setUploadProgress(p)
      );
      setPhotoUrl(url);
    } catch (err: any) {
      setError('Could not upload profile photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter the full name.');
      return;
    }

    const finalRelationship =
      relationship === 'Other' ? customRelationship.trim() || 'Other' : relationship;

    setLoading(true);
    try {
      if (isEditing && editProfile) {
        await memberProfileService.updateMemberProfile(
          familyId,
          editProfile.id,
          {
            fullName: fullName.trim(),
            nickname: nickname.trim() || undefined,
            profileImage: photoUrl || undefined,
            gender,
            dateOfBirth: dateOfBirth || undefined,
            relationship: finalRelationship,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            isChild,
            notes: notes.trim() || undefined,
            userId: selectedUserId || null,
          },
          currentUser
        );
        onMemberAdded({
          ...editProfile,
          fullName: fullName.trim(),
          nickname: nickname.trim() || undefined,
          profileImage: photoUrl || undefined,
          gender,
          dateOfBirth: dateOfBirth || undefined,
          relationship: finalRelationship,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          isChild,
          notes: notes.trim() || undefined,
          userId: selectedUserId || null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newProfile = await memberProfileService.addMemberProfile(
          familyId,
          {
            userId: selectedUserId || null,
            fullName: fullName.trim(),
            nickname: nickname.trim() || undefined,
            profileImage: photoUrl || undefined,
            gender,
            dateOfBirth: dateOfBirth || undefined,
            relationship: finalRelationship,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            isChild,
            notes: notes.trim() || undefined,
            createdBy: currentUser.id,
          },
          currentUser
        );
        onMemberAdded(newProfile);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save family member profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Family Member Profile' : 'Add Family Member'}
      subtitle={
        isEditing
          ? 'Update details for this family member.'
          : 'Create a personal profile for an adult, child, elderly, or other family member.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Photo Uploader */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <div className="relative group">
            <Avatar
              src={photoUrl}
              name={fullName || 'Member'}
              size="xl"
              className="ring-4 ring-indigo-500/20 shadow-md"
            />
            {isUploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center text-white text-[10px]">
                <Loader2 className="w-5 h-5 animate-spin mb-1" />
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Profile Photo
            </h4>
            <p className="text-[11px] text-slate-400">
              Upload a clear photo (JPG, PNG, WEBP). Stored privately in family storage.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                icon={<Camera className="w-3.5 h-3.5" />}
              >
                {photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhotoUrl('')}
                  className="text-rose-500 hover:text-rose-600"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 1: Basic Information */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Basic Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              placeholder="e.g. Ahmed Khan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Nickname / Known As"
              placeholder="e.g. Baba, Chachu"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Relationship *
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {relationship === 'Other' && (
              <div>
                <Input
                  label="Custom Relationship *"
                  placeholder="e.g. Nephew, Guardian"
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Input
                label="Date of Birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isChildCheckbox"
              checked={isChild}
              onChange={(e) => setIsChild(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isChildCheckbox" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              This family member is a child (under 18)
            </label>
          </div>
        </div>

        {/* SECTION 2: Contact & Address */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Contact & Address (Optional)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              placeholder="e.g. +92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Input
            label="Residential Address"
            placeholder="e.g. House 42, Street 10, Lahore"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* SECTION 3: Link Application Account (Optional) */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Link FamilyHub Account (Optional)
            </h4>
            <span className="text-[10px] text-slate-400">
              Only if they use the app
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Young children, elderly grandparents, or relatives without an account can remain profile-only members.
          </p>

          <div>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No linked user account (Profile-only member)</option>
              {existingMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.userName || 'Member'} ({m.userEmail || m.userId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION 4: Profile Notes */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Household Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Prefers morning calls, works evening shifts, dietary notes..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="font-bold">
            {isEditing ? 'Save Changes' : 'Add Family Member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
