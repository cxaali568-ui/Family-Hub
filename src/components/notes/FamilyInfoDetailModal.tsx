import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FamilyInformation, User } from '../../types';
import { familyInformationService } from '../../services/familyInformationService';
import {
  Phone,
  Paperclip,
  Download,
  Trash2,
  Edit2,
  Check,
  Pin,
  Clock,
  User as UserIcon,
  ShieldAlert,
  Home,
  Zap,
  Car,
  Plane,
  FileText,
  Info,
} from 'lucide-react';

interface FamilyInfoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: FamilyInformation | null;
  currentUser: User;
  familyId: string;
  onUpdate: () => void;
}

export const FamilyInfoDetailModal: React.FC<FamilyInfoDetailModalProps> = ({
  isOpen,
  onClose,
  info,
  currentUser,
  familyId,
  onUpdate,
}) => {
  if (!info) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(info.title);
  const [editValue, setEditValue] = useState(info.value);
  const [editDescription, setEditDescription] = useState(info.description || '');
  const [editContactPhone, setEditContactPhone] = useState(info.contactPhone || '');
  const [editContactName, setEditContactName] = useState(info.contactName || '');
  const [editContactRel, setEditContactRel] = useState(info.contactRelationship || '');

  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const isContact =
    info.category === 'Important Contacts' || info.category === 'Emergency Information';

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setLoading(true);
    try {
      await familyInformationService.updateInformation(
        familyId,
        info.id,
        {
          title: editTitle.trim(),
          value: editValue.trim() || editContactPhone.trim(),
          description: editDescription.trim(),
          contactName: editContactName.trim() || undefined,
          contactPhone: editContactPhone.trim() || undefined,
          contactRelationship: editContactRel.trim() || undefined,
        },
        currentUser
      );
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.warn('Could not save information changes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async () => {
    setLoading(true);
    try {
      await familyInformationService.updateInformation(
        familyId,
        info.id,
        { isPinned: !info.isPinned },
        currentUser
      );
      onUpdate();
    } catch (err) {
      console.warn('Could not toggle pin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await familyInformationService.deleteInformation(familyId, info.id, currentUser);
      onUpdate();
      onClose();
    } catch (err) {
      console.warn('Could not delete information record:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Information' : info.title}
      subtitle={info.category}
    >
      <div className="space-y-4">
        {isDeleting ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3">
            <h4 className="text-xs font-bold text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete this information?
            </h4>
            <p className="text-xs text-rose-800 dark:text-rose-300">
              This record will be removed from the Family Information Board.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsDeleting(false)} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        ) : isEditing ? (
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

            {isContact ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editContactName}
                      onChange={(e) => setEditContactName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editContactPhone}
                      onChange={(e) => setEditContactPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Relationship / Role
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editContactRel}
                    onChange={(e) => setEditContactRel(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Value / Account # / Detail
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Instructions
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleSaveEdit} disabled={loading} icon={<Check className="w-4 h-4" />}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{info.category}</Badge>
              {info.isPinned && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              )}
            </div>

            {/* Main Value Display */}
            {isContact && (info.contactPhone || info.contactName) ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                      {info.contactName || info.title}
                    </h3>
                    {info.contactRelationship && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        {info.contactRelationship}
                      </p>
                    )}
                  </div>
                  {info.contactPhone && (
                    <a
                      href={`tel:${info.contactPhone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
                    </a>
                  )}
                </div>
                {info.contactPhone && (
                  <p className="text-xs font-mono font-bold text-emerald-900 dark:text-emerald-200">
                    {info.contactPhone}
                  </p>
                )}
              </div>
            ) : (
              info.value && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Value / Answer</p>
                  <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 font-mono select-all">
                    {info.value}
                  </p>
                </div>
              )
            )}

            {/* Description */}
            {info.description && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {info.description}
                </p>
              </div>
            )}

            {/* Linked Person */}
            {info.linkedPersonName && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                <UserIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Linked Person: <strong>{info.linkedPersonName}</strong></span>
              </div>
            )}

            {/* Attachments */}
            {info.attachments && info.attachments.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  Attachments ({info.attachments.length})
                </h4>
                <div className="space-y-1.5">
                  {info.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <span className="truncate max-w-[220px] font-medium text-slate-800 dark:text-slate-200">
                        {att.fileName}
                      </span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.fileName}
                        className="p-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit */}
            <div className="pt-2 text-[10px] text-slate-400">
              Added by {info.createdByName || 'Member'} on {new Date(info.createdAt).toLocaleDateString()}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTogglePin}
                disabled={loading}
                icon={<Pin className={`w-3.5 h-3.5 ${info.isPinned ? 'text-amber-500' : ''}`} />}
              >
                {info.isPinned ? 'Unpin' : 'Pin'}
              </Button>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setIsDeleting(true)}
                  disabled={loading}
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
