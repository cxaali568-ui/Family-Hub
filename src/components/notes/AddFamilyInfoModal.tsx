import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { FamilyInformation, FamilyInfoCategory, User, FamilyMemberProfile, Child } from '../../types';
import { familyInformationService } from '../../services/familyInformationService';
import {
  Info,
  Phone,
  Home,
  ShieldAlert,
  Zap,
  Car,
  Plane,
  FileText,
  User as UserIcon,
  Paperclip,
  CheckCircle,
} from 'lucide-react';

interface AddFamilyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  familyId: string;
  members: FamilyMemberProfile[];
  childrenList: Child[];
  onSuccess: (info: FamilyInformation) => void;
}

const INFO_CATEGORIES: { id: FamilyInfoCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'House Information', label: 'House Information', icon: <Home className="w-4 h-4 text-indigo-500" /> },
  { id: 'Important Contacts', label: 'Important Contacts', icon: <Phone className="w-4 h-4 text-emerald-500" /> },
  { id: 'Emergency Information', label: 'Emergency Information', icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
  { id: 'Utility Information', label: 'Utility Information', icon: <Zap className="w-4 h-4 text-amber-500" /> },
  { id: 'Vehicle Information', label: 'Vehicle Information', icon: <Car className="w-4 h-4 text-blue-500" /> },
  { id: 'Travel Information', label: 'Travel Information', icon: <Plane className="w-4 h-4 text-sky-500" /> },
  { id: 'Document References', label: 'Document References', icon: <FileText className="w-4 h-4 text-purple-500" /> },
  { id: 'Other', label: 'Other', icon: <Info className="w-4 h-4 text-slate-500" /> },
];

export const AddFamilyInfoModal: React.FC<AddFamilyInfoModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  familyId,
  members,
  childrenList,
  onSuccess,
}) => {
  const [category, setCategory] = useState<FamilyInfoCategory>('House Information');
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [linkedPersonId, setLinkedPersonId] = useState('');
  const [visibility, setVisibility] = useState<'family' | 'admins_only'>('family');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isContactType =
    category === 'Important Contacts' || category === 'Emergency Information';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let linkedPersonName: string | undefined;
      if (linkedPersonId) {
        const mem = members.find((m) => m.id === linkedPersonId || m.userId === linkedPersonId);
        if (mem) {
          linkedPersonName = mem.fullName;
        } else {
          const ch = childrenList.find((c) => c.id === linkedPersonId);
          if (ch) linkedPersonName = ch.fullName;
        }
      }

      const info = await familyInformationService.addInformation(
        familyId,
        {
          title: title.trim(),
          value: value.trim() || (isContactType ? contactPhone : ''),
          description: description.trim(),
          category,
          contactName: isContactType ? contactName.trim() : undefined,
          contactPhone: isContactType ? contactPhone.trim() : undefined,
          contactRelationship: isContactType ? contactRelationship.trim() : undefined,
          linkedPersonId: linkedPersonId || undefined,
          linkedPersonName,
          visibility,
          isPinned,
        },
        currentUser
      );

      if (selectedFile) {
        try {
          await familyInformationService.uploadAttachment(familyId, info.id, selectedFile, currentUser);
        } catch (fErr) {
          console.warn('Could not upload file:', fErr);
        }
      }

      onSuccess(info);
      onClose();
    } catch (err: any) {
      console.error('Failed to add family info:', err);
      setError(err.message || 'Failed to save information.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Family Information"
      subtitle="Store quick-reference contacts, utility details, house rules, or emergency info."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INFO_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-2.5 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-center ${
                  category === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span className="truncate max-w-full">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Title / Record Name <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder={
              category === 'House Information'
                ? 'e.g. Wi-Fi Password or Spare Key Location'
                : category === 'Important Contacts'
                ? 'e.g. Plumber or Electrician'
                : category === 'Emergency Information'
                ? 'e.g. Nearest Hospital or Poison Control'
                : category === 'Utility Information'
                ? 'e.g. Electricity Provider & Account #'
                : 'e.g. Car Insurance Policy Ref'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Contact Specific Fields */}
        {isContactType ? (
          <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-500" /> Contact Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rashid / Ahmed Plumber"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300-1234567"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Relationship / Service Type
              </label>
              <input
                type="text"
                placeholder="e.g. Pediatrician / Emergency Line / Home Repair"
                value={contactRelationship}
                onChange={(e) => setContactRelationship(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ) : (
          /* Value field for Non-contact cards */
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Value / Quick Answer / Account #
            </label>
            <input
              type="text"
              placeholder="e.g. Safe key is with Uncle Tariq / Password: home1234"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Description / Extra Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Additional Notes / Instructions
          </label>
          <textarea
            rows={2}
            placeholder="Any extra context or helpful details for family members..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Linked Person & Visibility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <UserIcon className="w-3.5 h-3.5 text-indigo-500" /> Linked Person (Optional)
            </label>
            <select
              value={linkedPersonId}
              onChange={(e) => setLinkedPersonId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None</option>
              {members.map((m) => (
                <option key={m.id} value={m.userId || m.id}>
                  {m.fullName}
                </option>
              ))}
              {childrenList.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.fullName} (Child)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'family' | 'admins_only')}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="family">All Family Members</option>
              <option value="admins_only">Admins & Owners Only</option>
            </select>
          </div>
        </div>

        {/* Pin toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Pin to top of Family Information Board</span>
        </label>

        {/* Attachment upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Attachment (Optional)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
            onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            variant="primary"
            icon={<CheckCircle className="w-4 h-4" />}
          >
            {loading ? 'Saving...' : 'Save Information'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
