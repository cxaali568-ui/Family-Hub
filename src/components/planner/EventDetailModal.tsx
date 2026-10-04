import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  UnifiedCalendarItem,
  FamilyEvent,
  FamilyReminder,
  FamilyMember,
} from '../../types';
import { eventService } from '../../services/eventService';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Repeat,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  Printer,
  Shield,
  Tag,
  AlertTriangle,
} from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedCalendarItem | null;
  familyId: string;
  currentUser: any;
  familyMembers: FamilyMember[];
  onEdit?: (event: FamilyEvent) => void;
  onNavigateToModule?: (route: string, id?: string) => void;
  onRefresh?: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  familyId,
  currentUser,
  familyMembers,
  onEdit,
  onNavigateToModule,
  onRefresh,
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'this' | 'all'>('this');
  const [loading, setLoading] = useState(false);

  if (!item) return null;

  const isNativeEvent = item.source === 'event';
  const isReminder = item.source === 'reminder';
  const isRecurring = item.isRecurringOccurrence;
  const isOwnerOrCreator = item.createdBy === currentUser?.id || currentUser?.roleInFamily === 'owner' || currentUser?.roleInFamily === 'admin';

  const assignedNames = (item.assignedMemberIds || [])
    .map((uid) => familyMembers.find((m) => m.userId === uid)?.userName || 'Member')
    .filter(Boolean);

  const handleToggleReminderStatus = async () => {
    if (!isReminder) return;
    setLoading(true);
    try {
      const rem = item.rawEntity as FamilyReminder;
      const newStatus = rem.status === 'completed' ? 'pending' : 'completed';
      await eventService.updateReminderStatus(familyId, rem.id, newStatus, currentUser);
      onRefresh?.();
      onClose();
    } catch (e) {
      console.warn('Could not update reminder status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (isNativeEvent) {
        const ev = item.rawEntity as FamilyEvent;
        if (isRecurring && deleteScope === 'this' && item.occurrenceDate) {
          await eventService.cancelOccurrence(familyId, ev.id, item.occurrenceDate, currentUser);
        } else {
          await eventService.deleteEvent(familyId, ev.id, currentUser, ev.title);
        }
      } else if (isReminder) {
        const rem = item.rawEntity as FamilyReminder;
        await eventService.deleteReminder(familyId, rem.id);
      }
      onRefresh?.();
      setDeleteConfirmOpen(false);
      onClose();
    } catch (e) {
      console.warn('Could not delete calendar item:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Modal isOpen={isOpen && !deleteConfirmOpen} onClose={onClose} title="Item Details" maxWidth="md">
        <div className="space-y-4">
          {/* Header & Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${item.color}`}>
                {item.category || item.source}
              </span>
              <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
                Source: {item.source}
              </Badge>
              {item.status === 'completed' && (
                <Badge variant="success" className="text-[11px]">
                  Completed
                </Badge>
              )}
              {item.status === 'overdue' && (
                <Badge variant="danger" className="text-[11px]">
                  Overdue
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{item.title}</h2>
          </div>

          {/* Timing & Location */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="font-semibold">{item.startDate}</span>
              {item.endDate && item.endDate !== item.startDate && (
                <span>to {item.endDate}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>{item.allDay ? 'All Day' : `${item.startTime || ''} ${item.endTime ? `- ${item.endTime}` : ''}`}</span>
            </div>

            {item.location && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>{item.location}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {/* Assigned Members */}
          {assignedNames.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" /> Assigned Members
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {assignedNames.map((name, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Creator */}
          {item.createdByName && (
            <p className="text-[11px] text-slate-400 italic">
              Created by {item.createdByName}
            </p>
          )}

          {/* Linked Record Navigation */}
          {item.linkedEntityType && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => {
                  if (item.linkedEntityType === 'bill') onNavigateToModule?.('bills', item.linkedEntityId);
                  if (item.linkedEntityType === 'medical') onNavigateToModule?.('medical', item.linkedEntityId);
                  if (item.linkedEntityType === 'note' || item.linkedEntityType === 'urgent') onNavigateToModule?.('notes', item.linkedEntityId);
                  if (item.linkedEntityType === 'school') onNavigateToModule?.('family', item.linkedEntityId);
                  onClose();
                }}
              >
                View Original {item.linkedEntityType.toUpperCase()} Record
              </Button>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print
            </Button>

            <div className="flex items-center gap-2">
              {isReminder && (
                <Button
                  size="sm"
                  variant={item.status === 'completed' ? 'outline' : 'primary'}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  onClick={handleToggleReminderStatus}
                  loading={loading}
                >
                  {item.status === 'completed' ? 'Mark Pending' : 'Mark Completed'}
                </Button>
              )}

              {isNativeEvent && isOwnerOrCreator && (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Edit2 className="w-4 h-4" />}
                  onClick={() => {
                    onEdit?.(item.rawEntity as FamilyEvent);
                    onClose();
                  }}
                >
                  Edit
                </Button>
              )}

              {(isNativeEvent || isReminder) && isOwnerOrCreator && (
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Are you sure you want to delete this {isReminder ? 'reminder' : 'event'}?</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">"{item.title}" will be permanently removed.</p>
            </div>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                This is a recurring event. Select delete scope:
              </label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="this"
                    checked={deleteScope === 'this'}
                    onChange={() => setDeleteScope('this')}
                    className="text-indigo-600"
                  />
                  <span>Delete only this occurrence ({item.occurrenceDate})</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="deleteScope"
                    value="all"
                    checked={deleteScope === 'all'}
                    onChange={() => setDeleteScope('all')}
                    className="text-indigo-600"
                  />
                  <span>Delete entire recurring series</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              loading={loading}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
