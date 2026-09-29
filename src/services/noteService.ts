import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  FamilyNote,
  NoteType,
  NotePriority,
  NoteStatus,
  NoteAttachment,
  NoteReminder,
  User,
  FamilyMember,
} from '../types';
import { familyService } from './familyService';
import { noteReminderService } from './noteReminderService';

class NoteService {
  /**
   * Subscribes to real-time notes for a family
   */
  subscribeNotes(
    familyId: string,
    callback: (notes: FamilyNote[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'notes');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const notes: FamilyNote[] = [];
        snapshot.forEach((d) => {
          const note = d.data() as FamilyNote;
          if (!note.deletedAt) {
            // Guarantee backwards compatibility fields
            note.type = note.type || 'general';
            note.priority = note.priority || 'normal';
            note.status = note.status || 'pending';
            note.content = note.content || note.description;
            note.authorName = note.authorName || note.createdByName;
            note.isArchived = !!note.isArchived;
            note.attachments = note.attachments || [];
            notes.push(note);
          }
        });

        // Trigger reminder check in background asynchronously
        noteReminderService.processDueReminders(notes);

        callback(notes);
      },
      (error) => {
        console.warn('Error listening to family notes:', error);
        callback([]);
      }
    );
  }

  /**
   * Gets a single note document
   */
  async getNote(familyId: string, noteId: string): Promise<FamilyNote | null> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const note = snap.data() as FamilyNote;
    if (note.deletedAt) return null;
    return note;
  }

  /**
   * Adds a new family note or urgent need
   */
  async addNote(
    familyId: string,
    data: {
      type?: NoteType;
      title: string;
      description?: string;
      categoryId: string;
      categoryName?: string;
      priority?: NotePriority;
      status?: NoteStatus;
      dueDate?: string;
      dueTime?: string;
      reminder?: NoteReminder;
      assignedToMemberId?: string;
      assignedToMemberName?: string;
      linkedPersonId?: string;
      linkedPersonName?: string;
      linkedPersonType?: 'member' | 'child';
      isPinned?: boolean;
      notifyFamily?: boolean;
      notifyAssignedMember?: boolean;
      attachments?: NoteAttachment[];
    },
    currentUser: User,
    familyMembers?: FamilyMember[]
  ): Promise<FamilyNote> {
    if (!familyId) throw new Error('Missing familyId');
    if (!data.title?.trim()) throw new Error('Note title is required');

    const colRef = collection(db, 'families', familyId, 'notes');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const noteType: NoteType = data.type || 'general';
    const notePriority: NotePriority = data.priority || (noteType === 'urgent' ? 'urgent' : 'normal');
    const noteStatus: NoteStatus = data.status || 'pending';

    // Compute reminder target date if reminder is active
    let reminderData = data.reminder;
    if (reminderData?.enabled && data.dueDate) {
      const targetDate = noteReminderService.computeReminderTargetDate(
        data.dueDate,
        data.dueTime || '09:00',
        reminderData.option
      );
      reminderData = {
        ...reminderData,
        targetDate,
        notified: false,
      };
    }

    const note: FamilyNote = {
      id: newDoc.id,
      familyId,
      type: noteType,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      content: data.description?.trim() || '', // Backwards compatibility alias
      categoryId: data.categoryId || 'general',
      categoryName: data.categoryName || 'General',
      priority: notePriority,
      status: noteStatus,
      dueDate: data.dueDate || undefined,
      dueTime: data.dueTime || undefined,
      reminder: reminderData,
      assignedToMemberId: data.assignedToMemberId || undefined,
      assignedToMemberName: data.assignedToMemberName || undefined,
      linkedPersonId: data.linkedPersonId || undefined,
      linkedPersonName: data.linkedPersonName || undefined,
      linkedPersonType: data.linkedPersonType || undefined,
      isPinned: !!data.isPinned,
      pinnedAt: data.isPinned ? now : undefined,
      isArchived: false,
      attachments: data.attachments || [],
      notifyFamily: !!data.notifyFamily,
      notifyAssignedMember: !!data.notifyAssignedMember,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      authorName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, note);

    // Audit log
    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Created ${note.type} note: "${note.title}"`,
      entityType: 'family_note',
      entityId: note.id,
    });

    // Notify assigned member if configured
    if (note.assignedToMemberId && note.assignedToMemberId !== currentUser.id) {
      try {
        const notifCol = collection(db, 'notifications');
        await addDoc(notifCol, {
          id: `notif_assign_${note.id}_${Date.now()}`,
          recipientUserId: note.assignedToMemberId,
          familyId,
          type: note.type === 'urgent' ? 'urgent_need' : 'note_assigned',
          title: note.type === 'urgent' ? `Urgent Need Assigned: ${note.title}` : `Note Assigned: ${note.title}`,
          message: `${currentUser.name} assigned you to "${note.title}". Due: ${note.dueDate || 'No date'}`,
          relatedEntityType: 'family_note',
          relatedEntityId: note.id,
          createdAt: now,
          readAt: null,
        });
      } catch (err) {
        console.warn('Could not send assignment notification:', err);
      }
    }

    // Notify family if requested
    if (data.notifyFamily && familyMembers && familyMembers.length > 0) {
      try {
        const notifCol = collection(db, 'notifications');
        for (const member of familyMembers) {
          if (member.userId !== currentUser.id && member.userId !== note.assignedToMemberId) {
            await addDoc(notifCol, {
              id: `notif_note_${note.id}_${member.userId}_${Date.now()}`,
              recipientUserId: member.userId,
              familyId,
              type: note.type === 'urgent' ? 'urgent_need' : 'note_assigned',
              title: `Important Note: ${note.title}`,
              message: `${currentUser.name} shared an important family note: "${note.title}"`,
              relatedEntityType: 'family_note',
              relatedEntityId: note.id,
              createdAt: now,
              readAt: null,
            });
          }
        }
      } catch (err) {
        console.warn('Could not broadcast family notification:', err);
      }
    }

    return note;
  }

  /**
   * Updates an existing family note
   */
  async updateNote(
    familyId: string,
    noteId: string,
    updates: Partial<FamilyNote>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const now = new Date().toISOString();

    const patch: any = {
      ...updates,
      updatedAt: now,
      updatedBy: currentUser.id,
    };

    if (updates.description) {
      patch.content = updates.description; // sync alias
    }

    // Recompute reminder if dueDate or reminder option changed
    if (updates.reminder && updates.dueDate) {
      const targetDate = noteReminderService.computeReminderTargetDate(
        updates.dueDate,
        updates.dueTime || '09:00',
        updates.reminder.option
      );
      patch['reminder.targetDate'] = targetDate;
      patch['reminder.notified'] = false;
    }

    await updateDoc(docRef, patch);

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Updated note "${updates.title || 'details'}"`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Updates status of a note / urgent need (e.g. Completed, In Progress, Pending)
   */
  async updateStatus(
    familyId: string,
    noteId: string,
    status: NoteStatus,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const now = new Date().toISOString();

    const patch: any = {
      status,
      updatedAt: now,
      updatedBy: currentUser.id,
    };

    if (status === 'completed') {
      patch.completedAt = now;
      patch.completedBy = currentUser.id;
      patch.completedByName = currentUser.name;
    } else {
      patch.completedAt = null;
      patch.completedBy = null;
      patch.completedByName = null;
    }

    await updateDoc(docRef, patch);

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Marked note status as ${status}`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Toggles pin status for a note
   */
  async togglePin(
    familyId: string,
    noteId: string,
    currentPinned: boolean,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      isPinned: !currentPinned,
      pinnedAt: !currentPinned ? now : null,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `${!currentPinned ? 'Pinned' : 'Unpinned'} note`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Toggles archive status for a note
   */
  async toggleArchive(
    familyId: string,
    noteId: string,
    currentArchived: boolean,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      isArchived: !currentArchived,
      archivedAt: !currentArchived ? now : null,
      archivedBy: !currentArchived ? currentUser.id : null,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `${!currentArchived ? 'Archived' : 'Unarchived'} note`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Soft-deletes a note (Section 18 & 71)
   */
  async softDeleteNote(
    familyId: string,
    noteId: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      deletedAt: now,
      deletedBy: currentUser.id,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Deleted note`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Uploads an attachment to a note (JPG, PNG, WEBP, PDF, TXT)
   */
  async uploadAttachment(
    familyId: string,
    noteId: string,
    file: File,
    currentUser: User
  ): Promise<NoteAttachment> {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/notes/${noteId}/attachments/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    let downloadUrl: string;
    try {
      const snap = await uploadBytesResumable(storageRef, file);
      downloadUrl = await getDownloadURL(snap.ref);
    } catch {
      // Fallback to data URL for testing environments
      downloadUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const attachment: NoteAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      url: downloadUrl,
      storagePath,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name,
    };

    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const snap = await getDoc(docRef);
    const existingAttachments = snap.exists() ? (snap.data() as FamilyNote).attachments || [] : [];

    await updateDoc(docRef, {
      attachments: [...existingAttachments, attachment],
      updatedAt: new Date().toISOString(),
    });

    return attachment;
  }

  /**
   * Deletes an attachment from a note
   */
  async deleteAttachment(
    familyId: string,
    noteId: string,
    attachmentId: string,
    storagePath: string,
    currentUser: User
  ): Promise<void> {
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn('Could not delete storage object:', err);
      }
    }

    const docRef = doc(db, 'families', familyId, 'notes', noteId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const note = snap.data() as FamilyNote;
    const filtered = (note.attachments || []).filter((a) => a.id !== attachmentId);

    await updateDoc(docRef, {
      attachments: filtered,
      updatedAt: new Date().toISOString(),
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Removed attachment from note "${note.title}"`,
      entityType: 'family_note',
      entityId: noteId,
    });
  }

  /**
   * Exports family notes to CSV format
   */
  exportNotesToCSV(notes: FamilyNote[], familyName: string = 'Family'): void {
    const headers = [
      'Title',
      'Type',
      'Category',
      'Priority',
      'Status',
      'Due Date',
      'Assigned To',
      'Description',
      'Created By',
      'Created Date',
      'Completed Date',
    ];

    const rows = notes.map((note) => [
      `"${(note.title || '').replace(/"/g, '""')}"`,
      `"${note.type || 'general'}"`,
      `"${(note.categoryName || note.categoryId || '').replace(/"/g, '""')}"`,
      `"${note.priority || 'normal'}"`,
      `"${note.status || 'pending'}"`,
      `"${note.dueDate || ''}"`,
      `"${(note.assignedToMemberName || '').replace(/"/g, '""')}"`,
      `"${(note.description || note.content || '').replace(/"/g, '""')}"`,
      `"${(note.createdByName || note.authorName || '').replace(/"/g, '""')}"`,
      `"${note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}"`,
      `"${note.completedAt ? new Date(note.completedAt).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${familyName.replace(/\s+/g, '_')}_Notes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Prints family notes in clean printable view
   */
  printNotes(notes: FamilyNote[], title: string = 'Family Notes & Needs', familyName: string = 'Family'): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${familyName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; color: #0f172a; }
            p.meta { font-size: 12px; color: #64748b; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; page-break-inside: avoid; }
            .card-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
            .card-desc { font-size: 12px; color: #334155; white-space: pre-wrap; margin-bottom: 8px; }
            .tags { font-size: 10px; color: #64748b; display: flex; gap: 8px; flex-wrap: wrap; }
            .badge { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
            .urgent { background: #fee2e2; color: #991b1b; }
            .important { background: #fef3c7; color: #92400e; }
            @media print {
              body { padding: 0; }
              .grid { display: block; }
              .card { margin-bottom: 12px; }
            }
          </style>
        </head>
        <body>
          <h1>${title} • ${familyName}</h1>
          <p class="meta">Exported on ${new Date().toLocaleDateString()} • Total: ${notes.length} items</p>
          <div class="grid">
            ${notes.map(n => `
              <div class="card">
                <div class="card-title">${n.isPinned ? '📌 ' : ''}${n.title}</div>
                <div class="card-desc">${n.description || n.content || 'No description'}</div>
                <div class="tags">
                  <span class="badge ${n.type === 'urgent' ? 'urgent' : n.type === 'important' ? 'important' : ''}">${(n.type || 'general').toUpperCase()}</span>
                  <span class="badge">${n.categoryName || n.categoryId}</span>
                  ${n.dueDate ? `<span class="badge">Due: ${n.dueDate}</span>` : ''}
                  ${n.assignedToMemberName ? `<span class="badge">Assignee: ${n.assignedToMemberName}</span>` : ''}
                  <span class="badge">Status: ${n.status}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}

export const noteService = new NoteService();
