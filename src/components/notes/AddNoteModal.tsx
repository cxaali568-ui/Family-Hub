import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  FamilyNote,
  NoteCategory,
  NoteType,
  NotePriority,
  ReminderOption,
  User,
  FamilyMemberProfile,
  Child,
} from '../../types';
import { noteService } from '../../services/noteService';
import {
  FileText,
  AlertTriangle,
  Pin,
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  Paperclip,
  X,
  Bell,
  CheckCircle,
} from 'lucide-react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: NoteType;
  categories: NoteCategory[];
  members: FamilyMemberProfile[];
  childrenList: Child[];
  currentUser: User;
  familyId: string;
  onSuccess: (note: FamilyNote) => void;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'general',
  categories,
  members,
  childrenList,
  currentUser,
  familyId,
  onSuccess,
}) => {
  const [type, setType] = useState<NoteType>(defaultType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('home');
  const [priority, setPriority] = useState<NotePriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [assignedToMemberId, setAssignedToMemberId] = useState('');
  const [linkedPersonId, setLinkedPersonId] = useState('');
  const [linkedPersonType, setLinkedPersonType] = useState<'member' | 'child'>('member');
  const [reminderOption, setReminderOption] = useState<ReminderOption>('none');
  const [isPinned, setIsPinned] = useState(false);
  const [notifyFamily, setNotifyFamily] = useState(false);
  const [notifyAssignedMember, setNotifyAssignedMember] = useState(true);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setTitle('');
      setDescription('');
      setCategoryId(categories.length > 0 ? categories[0].id : 'home');
      setPriority(defaultType === 'urgent' ? 'urgent' : defaultType === 'important' ? 'high' : 'normal');
      setIsPinned(defaultType === 'important');
      setDueDate(defaultType === 'urgent' ? new Date().toISOString().split('T')[0] : '');
      setDueTime('');
      setAssignedToMemberId('');
      setLinkedPersonId('');
      setReminderOption('none');
      setNotifyFamily(defaultType === 'important');
      setNotifyAssignedMember(true);
      setSelectedFiles([]);
      setError(null);
    }
  }, [isOpen, defaultType, categories]);

  // Adjust default priority when type switches
  const handleTypeChange = (newType: NoteType) => {
    setType(newType);
    if (newType === 'urgent') {
      setPriority('urgent');
      if (!dueDate) setDueDate(new Date().toISOString().split('T')[0]);
    } else if (newType === 'important') {
      setPriority('high');
      setIsPinned(true);
      setNotifyFamily(true);
    } else {
      setPriority('normal');
      setIsPinned(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title for the note.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find category name
      const matchedCat = categories.find((c) => c.id === categoryId);
      const categoryName = matchedCat ? matchedCat.name : categoryId;

      // Find assigned member name
      let assignedToMemberName: string | undefined;
      if (assignedToMemberId) {
        const m = members.find((mem) => mem.id === assignedToMemberId || mem.userId === assignedToMemberId);
        assignedToMemberName = m ? m.fullName : undefined;
      }

      // Find linked person name
      let linkedPersonName: string | undefined;
      if (linkedPersonId) {
        if (linkedPersonType === 'child') {
          const ch = childrenList.find((c) => c.id === linkedPersonId);
          linkedPersonName = ch ? ch.fullName : undefined;
        } else {
          const mem = members.find((m) => m.id === linkedPersonId || m.userId === linkedPersonId);
          linkedPersonName = mem ? mem.fullName : undefined;
        }
      }

      const note = await noteService.addNote(
        familyId,
        {
          type,
          title: title.trim(),
          description: description.trim(),
          categoryId,
          categoryName,
          priority,
          status: 'pending',
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          reminder: {
            enabled: reminderOption !== 'none' && !!dueDate,
            option: reminderOption,
          },
          assignedToMemberId: assignedToMemberId || undefined,
          assignedToMemberName,
          linkedPersonId: linkedPersonId || undefined,
          linkedPersonName,
          linkedPersonType: linkedPersonId ? linkedPersonType : undefined,
          isPinned,
          notifyFamily,
          notifyAssignedMember,
        },
        currentUser
      );

      // Upload any attachments attached
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await noteService.uploadAttachment(familyId, note.id, file, currentUser);
          } catch (fileErr) {
            console.warn('Could not upload file:', file.name, fileErr);
          }
        }
      }

      onSuccess(note);
      onClose();
    } catch (err: any) {
      console.error('Failed to create note:', err);
      setError(err.message || 'Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        type === 'urgent'
          ? 'Add Urgent Need'
          : type === 'important'
          ? 'Add Important Note'
          : 'Create Family Note'
      }
      subtitle="Save important instructions, checklists, deadlines, or household needs."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Note Type Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('general')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'general'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> General
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('important')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'important'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Pin className="w-3.5 h-3.5" /> Important
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('urgent')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                type === 'urgent'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Urgent Need
            </button>
          </div>
        </div>

        {/* Title (Required) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Title <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder={
              type === 'urgent'
                ? 'e.g., Medicine needed today'
                : type === 'important'
                ? 'e.g., House deed document location'
                : 'e.g., Buy new living room curtains'
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Description / Content */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description / Instructions
          </label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Add details, steps, or instructions for the family..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Category & Priority in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-500" /> Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NotePriority)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Due Time (Optional)
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Assign To Family Member */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <UserIcon className="w-3.5 h-3.5 text-indigo-500" /> Assign To (Optional)
          </label>
          <select
            value={assignedToMemberId}
            onChange={(e) => setAssignedToMemberId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Unassigned (Open for anyone)</option>
            {members.map((m) => (
              <option key={m.id} value={m.userId || m.id}>
                {m.fullName} ({m.relationship || 'Member'})
              </option>
            ))}
          </select>
        </div>

        {/* Linked Person (Member or Child) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Link Type
            </label>
            <select
              value={linkedPersonType}
              onChange={(e) => {
                setLinkedPersonType(e.target.value as 'member' | 'child');
                setLinkedPersonId('');
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Family Member</option>
              <option value="child">Child / Student</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Concerning Person (Optional)
            </label>
            <select
              value={linkedPersonId}
              onChange={(e) => setLinkedPersonId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">None</option>
              {linkedPersonType === 'child'
                ? childrenList.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.fullName} (Child)
                    </option>
                  ))
                : members.map((mem) => (
                    <option key={mem.id} value={mem.id}>
                      {mem.fullName}
                    </option>
                  ))}
            </select>
          </div>
        </div>

        {/* Reminder (Only available when due date is set) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 text-indigo-500" /> Reminder
          </label>
          <select
            value={reminderOption}
            onChange={(e) => setReminderOption(e.target.value as ReminderOption)}
            disabled={!dueDate}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <option value="none">No Reminder</option>
            <option value="at_due_time">At due time</option>
            <option value="1_day_before">1 day before</option>
            <option value="2_days_before">2 days before</option>
            <option value="3_days_before">3 days before</option>
            <option value="1_week_before">1 week before</option>
          </select>
          {!dueDate && (
            <p className="text-[10px] text-slate-400 mt-1">
              Select a due date above to enable reminders.
            </p>
          )}
        </div>

        {/* Toggles: Pin to top & Notify */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <Pin className="w-3.5 h-3.5 text-amber-500" /> Pin note to top of family board
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={notifyFamily}
              onChange={(e) => setNotifyFamily(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Broadcast in-app alert to all active family members</span>
          </label>
        </div>

        {/* Attachment Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Attachments (JPG, PNG, PDF, TXT)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
            multiple
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />

          {selectedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs"
                >
                  <span className="truncate max-w-[240px] text-slate-700 dark:text-slate-300">
                    {file.name} ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            variant={type === 'urgent' ? 'danger' : 'primary'}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            {loading ? 'Saving...' : type === 'urgent' ? 'Create Urgent Need' : 'Save Note'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
