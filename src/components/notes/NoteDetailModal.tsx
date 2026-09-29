import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  FamilyNote,
  NoteStatus,
  NotePriority,
  User,
  NoteCategory,
  FamilyMemberProfile,
  Child,
} from '../../types';
import { noteService } from '../../services/noteService';
import {
  Pin,
  Archive,
  Trash2,
  Calendar,
  Clock,
  User as UserIcon,
  Tag,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Edit2,
  Check,
  RotateCcw,
  X,
  Bell,
} from 'lucide-react';

interface NoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: FamilyNote | null;
  categories: NoteCategory[];
  members: FamilyMemberProfile[];
  childrenList: Child[];
  currentUser: User;
  familyId: string;
  onUpdate: (updatedNote?: FamilyNote) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  isOpen,
  onClose,
  note,
  categories,
  members,
  childrenList,
  currentUser,
  familyId,
  onUpdate,
}) => {
  if (!note) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editDescription, setEditDescription] = useState(note.description || note.content || '');
  const [editCategoryId, setEditCategoryId] = useState(note.categoryId);
  const [editPriority, setEditPriority] = useState<NotePriority>(note.priority || 'normal');
  const [editDueDate, setEditDueDate] = useState(note.dueDate || '');
  const [editDueTime, setEditDueTime] = useState(note.dueTime || '');
  const [editAssignedId, setEditAssignedId] = useState(note.assignedToMemberId || '');

  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Status handlers
  const handleStatusChange = async (newStatus: NoteStatus) => {
    setActionLoading(true);
    try {
      await noteService.updateStatus(familyId, note.id, newStatus, currentUser);
      onUpdate();
    } catch (err) {
      console.warn('Could not update status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePin = async () => {
    setActionLoading(true);
    try {
      await noteService.togglePin(familyId, note.id, !!note.isPinned, currentUser);
      onUpdate();
    } catch (err) {
      console.warn('Could not toggle pin:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    setActionLoading(true);
    try {
      await noteService.toggleArchive(familyId, note.id, !!note.isArchived, currentUser);
      onUpdate();
      onClose();
    } catch (err) {
      console.warn('Could not toggle archive:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await noteService.softDeleteNote(familyId, note.id, currentUser);
      onUpdate();
      onClose();
    } catch (err) {
      console.warn('Could not delete note:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setActionLoading(true);
    try {
      const matchedCat = categories.find((c) => c.id === editCategoryId);
      const categoryName = matchedCat ? matchedCat.name : editCategoryId;

      let assignedToMemberName: string | undefined;
      if (editAssignedId) {
        const m = members.find((mem) => mem.id === editAssignedId || mem.userId === editAssignedId);
        assignedToMemberName = m ? m.fullName : undefined;
      }

      await noteService.updateNote(
        familyId,
        note.id,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          categoryId: editCategoryId,
          categoryName,
          priority: editPriority,
          dueDate: editDueDate || undefined,
          dueTime: editDueTime || undefined,
          assignedToMemberId: editAssignedId || undefined,
          assignedToMemberName,
        },
        currentUser
      );

      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.warn('Could not save note updates:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingAttachment(true);
    try {
      await noteService.uploadAttachment(familyId, note.id, file, currentUser);
      onUpdate();
    } catch (err) {
      console.warn('Could not upload file:', err);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, storagePath: string) => {
    setActionLoading(true);
    try {
      await noteService.deleteAttachment(familyId, note.id, attachmentId, storagePath, currentUser);
      onUpdate();
    } catch (err) {
      console.warn('Could not remove attachment:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const isOverdue =
    note.dueDate &&
    note.dueDate < new Date().toISOString().split('T')[0] &&
    note.status !== 'completed' &&
    note.status !== 'cancelled';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Note' : note.title}
      subtitle={
        isEditing
          ? 'Modify details and assignments.'
          : `${(note.type || 'general').toUpperCase()} • Created by ${note.createdByName || note.authorName || 'Family Member'}`
      }
    >
      <div className="space-y-4">
        {isDeleting ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <h4 className="text-xs font-bold text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete this note?
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              This note will be safely removed from active and upcoming lists. Historical records and audit logs will be maintained.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDeleting(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        ) : isEditing ? (
          /* Editing Form */
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Instructions
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
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
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as NotePriority)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={editDueTime}
                  onChange={(e) => setEditDueTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assign To
              </label>
              <select
                value={editAssignedId}
                onChange={(e) => setEditAssignedId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.userId || m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveEdit}
                disabled={actionLoading}
                icon={<Check className="w-4 h-4" />}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            {/* Top Badges & Overdue Alert */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  note.type === 'urgent'
                    ? 'danger'
                    : note.type === 'important'
                    ? 'warning'
                    : 'secondary'
                }
              >
                {(note.type || 'general').toUpperCase()}
              </Badge>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {note.categoryName || note.categoryId}
              </span>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  note.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                    : note.priority === 'high'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Priority: {(note.priority || 'normal').toUpperCase()}
              </span>

              {note.isPinned && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}

              {isOverdue && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>

            {/* Description Body */}
            {(note.description || note.content) && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {note.description || note.content}
                </p>
              </div>
            )}

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {note.dueDate && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Due Date</p>
                    <p className="font-semibold">
                      {note.dueDate} {note.dueTime ? `at ${note.dueTime}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {note.assignedToMemberName && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                  <UserIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Assigned To</p>
                    <p className="font-semibold">{note.assignedToMemberName}</p>
                  </div>
                </div>
              )}

              {note.linkedPersonName && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                  <Tag className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Concerning Person</p>
                    <p className="font-semibold">{note.linkedPersonName}</p>
                  </div>
                </div>
              )}

              {note.reminder?.enabled && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                  <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400">Reminder</p>
                    <p className="font-semibold">
                      {note.reminder.option.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Status Change Strip */}
            <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                Status: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">{note.status}</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStatusChange('pending')}
                  disabled={actionLoading}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    note.status === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Pending
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={actionLoading}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    note.status === 'in_progress'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('completed')}
                  disabled={actionLoading}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    note.status === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  ✓ Completed
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={actionLoading}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    note.status === 'cancelled'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            {/* Attachments Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  Attachments ({note.attachments?.length || 0})
                </h4>
                <label className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3 h-3" />
                  {uploadingAttachment ? 'Uploading...' : 'Add File'}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
                    onChange={handleUploadAttachment}
                    disabled={uploadingAttachment}
                    className="hidden"
                  />
                </label>
              </div>

              {note.attachments && note.attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {note.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[200px] font-medium text-slate-800 dark:text-slate-200">
                          {att.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(att.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.fileName}
                          className="p-1 text-slate-500 hover:text-indigo-600"
                          title="Download / View"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id, att.storagePath)}
                          className="p-1 text-slate-400 hover:text-rose-500"
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No attachments attached.</p>
              )}
            </div>

            {/* Audit Metadata */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 space-y-0.5">
              <p>Created on {note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Recently'}</p>
              {note.updatedAt && (
                <p>Last updated {new Date(note.updatedAt).toLocaleString()}</p>
              )}
              {note.completedAt && (
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Completed on {new Date(note.completedAt).toLocaleString()} by {note.completedByName || 'Member'}
                </p>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTogglePin}
                  disabled={actionLoading}
                  icon={<Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'text-amber-500' : ''}`} />}
                >
                  {note.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleArchive}
                  disabled={actionLoading}
                  icon={<Archive className="w-3.5 h-3.5 text-slate-500" />}
                >
                  {note.isArchived ? 'Unarchive' : 'Archive'}
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={actionLoading}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setIsDeleting(true)}
                  disabled={actionLoading}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
