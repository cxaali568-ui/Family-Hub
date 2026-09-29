import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { FamilyInformation, FamilyInfoCategory, NoteAttachment, User } from '../types';
import { familyService } from './familyService';

class FamilyInformationService {
  /**
   * Subscribes to family information center records
   */
  subscribeInformation(
    familyId: string,
    callback: (infoList: FamilyInformation[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'information');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: FamilyInformation[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as FamilyInformation;
          if (!item.deletedAt) {
            list.push(item);
          }
        });

        // Sort: pinned first, then newest
        list.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        callback(list);
      },
      (error) => {
        console.warn('Error listening to family information:', error);
        callback([]);
      }
    );
  }

  /**
   * Adds a new family information record
   */
  async addInformation(
    familyId: string,
    data: {
      title: string;
      value: string;
      description?: string;
      category: FamilyInfoCategory;
      contactName?: string;
      contactPhone?: string;
      contactRelationship?: string;
      linkedPersonId?: string;
      linkedPersonName?: string;
      visibility?: 'family' | 'admins_only';
      isPinned?: boolean;
    },
    currentUser: User
  ): Promise<FamilyInformation> {
    if (!familyId) throw new Error('Missing familyId');
    if (!data.title.trim()) throw new Error('Information title is required');

    const colRef = collection(db, 'families', familyId, 'information');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const info: FamilyInformation = {
      id: newDoc.id,
      familyId,
      title: data.title.trim(),
      value: data.value?.trim() || '',
      description: data.description?.trim() || '',
      category: data.category || 'House Information',
      contactName: data.contactName?.trim() || undefined,
      contactPhone: data.contactPhone?.trim() || undefined,
      contactRelationship: data.contactRelationship?.trim() || undefined,
      linkedPersonId: data.linkedPersonId || undefined,
      linkedPersonName: data.linkedPersonName || undefined,
      visibility: data.visibility || 'family',
      attachments: [],
      isPinned: !!data.isPinned,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, info);

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Added family information: ${info.title} (${info.category})`,
      entityType: 'family_information',
      entityId: info.id,
    });

    return info;
  }

  /**
   * Updates an existing family information record
   */
  async updateInformation(
    familyId: string,
    infoId: string,
    updates: Partial<FamilyInformation>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'information', infoId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      ...updates,
      updatedAt: now,
    });

    await familyService.logActivity({
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      familyId,
      action: `Updated family information`,
      entityType: 'family_information',
      entityId: infoId,
    });
  }

  /**
   * Soft-deletes a family information record
   */
  async deleteInformation(
    familyId: string,
    infoId: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'information', infoId);
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
      action: `Deleted family information record`,
      entityType: 'family_information',
      entityId: infoId,
    });
  }

  /**
   * Uploads an attachment to a family information record
   */
  async uploadAttachment(
    familyId: string,
    infoId: string,
    file: File,
    currentUser: User
  ): Promise<NoteAttachment> {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/information/${infoId}/attachments/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    let downloadUrl: string;
    try {
      const snap = await uploadBytesResumable(storageRef, file);
      downloadUrl = await getDownloadURL(snap.ref);
    } catch {
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

    const docRef = doc(db, 'families', familyId, 'information', infoId);
    const infoSnap = await docRef;
    // Update attachments array
    await updateDoc(docRef, {
      attachments: [...((infoSnap as any).attachments || []), attachment],
      updatedAt: new Date().toISOString(),
    });

    return attachment;
  }

  /**
   * Exports family information to CSV format
   */
  exportToCSV(infoList: FamilyInformation[], familyName: string = 'Family'): void {
    const headers = [
      'Title',
      'Category',
      'Value',
      'Description',
      'Contact Name',
      'Contact Phone',
      'Contact Relationship',
      'Linked Person',
      'Visibility',
      'Created Date',
    ];

    const rows = infoList.map((item) => [
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.value || '').replace(/"/g, '""')}"`,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.contactName || '').replace(/"/g, '""')}"`,
      `"${(item.contactPhone || '').replace(/"/g, '""')}"`,
      `"${(item.contactRelationship || '').replace(/"/g, '""')}"`,
      `"${(item.linkedPersonName || '').replace(/"/g, '""')}"`,
      `"${(item.visibility || '').replace(/"/g, '""')}"`,
      `"${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${familyName.replace(/\s+/g, '_')}_Information_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const familyInformationService = new FamilyInformationService();
