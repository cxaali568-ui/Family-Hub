import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { FamilyMemberProfile, User, FamilyMember } from '../../types';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  User as UserIcon,
  Shield,
  Edit2,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FamilyMemberProfile | null;
  currentUser: User;
  canManage: boolean;
  onEdit: (profile: FamilyMemberProfile) => void;
  onRemove: (profile: FamilyMemberProfile) => Promise<void>;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentUser,
  canManage,
  onEdit,
  onRemove,
}) => {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Expandable sections state
  const [expandBasic, setExpandBasic] = useState(true);
  const [expandContact, setExpandContact] = useState(true);
  const [expandNotes, setExpandNotes] = useState(true);

  if (!profile) return null;

  const handleConfirmRemove = async () => {
    setRemoveLoading(true);
    try {
      await onRemove(profile);
      setShowRemoveConfirm(false);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Could not remove member profile.');
    } finally {
      setRemoveLoading(false);
    }
  };

  // Age calculation from date of birth
  let ageString = '';
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const diffMs = Date.now() - dob.getTime();
      const ageYears = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (ageYears >= 0 && ageYears < 125) {
        ageString = `${ageYears} years old`;
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Family Member Profile"
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <Avatar
            src={profile.profileImage}
            name={profile.fullName}
            size="xl"
            className="ring-4 ring-indigo-500/20 shadow-md shrink-0"
          />

          <div className="text-center sm:text-left overflow-hidden flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                {profile.fullName}
              </h3>
              {profile.nickname && (
                <span className="text-xs font-semibold text-slate-400">
                  ("{profile.nickname}")
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5">
              <Badge variant="primary">{profile.relationship}</Badge>
              {profile.isChild && <Badge variant="warning">Child</Badge>}
              {ageString && (
                <span className="text-xs text-slate-500 font-medium">
                  {ageString}
                </span>
              )}
            </div>

            {profile.userId && (
              <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Connected to FamilyHub App User</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandBasic(!expandBasic)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-indigo-500" />
              Basic Details
            </span>
            {expandBasic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandBasic && (
            <div className="p-4 bg-white dark:bg-slate-900 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Gender</span>
                <span className="font-semibold capitalize">{profile.gender}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Date of Birth</span>
                <span className="font-semibold">
                  {profile.dateOfBirth
                    ? new Date(profile.dateOfBirth).toLocaleDateString([], {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Not specified'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Relationship</span>
                <span className="font-semibold">{profile.relationship}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Contact Information */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandContact(!expandContact)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              Contact & Address
            </span>
            {expandContact ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandContact && (
            <div className="p-4 bg-white dark:bg-slate-900 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </span>
                {profile.phone ? (
                  <a
                    href={`tel:${profile.phone}`}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {profile.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No phone added</span>
                )}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                {profile.email ? (
                  <a
                    href={`mailto:${profile.email}`}
                    className="font-semibold text-slate-800 dark:text-slate-200 hover:underline"
                  >
                    {profile.email}
                  </a>
                ) : (
                  <span className="text-slate-400 italic">No email added</span>
                )}
              </div>

              <div className="py-1">
                <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Address
                </span>
                <p className="font-medium text-slate-800 dark:text-slate-200 pl-5">
                  {profile.address || <span className="text-slate-400 italic">No address listed</span>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Notes */}
        {profile.notes && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandNotes(!expandNotes)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Household Notes
              </span>
              {expandNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {expandNotes && (
              <div className="p-4 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {profile.notes}
              </div>
            )}
          </div>
        )}

        {/* Remove Member Confirmation Box */}
        {showRemoveConfirm && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  Remove {profile.fullName} from Family?
                </h4>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  This archives their family profile. If they have an application login account, it will NOT be deleted, and past chat and expense records will remain intact.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRemove}
                loading={removeLoading}
              >
                Yes, Remove Member
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            {canManage && !showRemoveConfirm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                icon={<Trash2 className="w-4 h-4" />}
              >
                Remove
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {canManage && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onEdit(profile);
                }}
                icon={<Edit2 className="w-4 h-4" />}
                className="font-bold"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
