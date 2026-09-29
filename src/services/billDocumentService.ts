import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { BillDocument, User } from '../types';

class BillDocumentService {
  /**
   * Subscribes to documents attached to a bill.
   */
  subscribeDocuments(
    familyId: string,
    billId: string,
    callback: (docs: BillDocument[]) => void
  ): () => void {
    if (!familyId || !billId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'bills', billId, 'documents');

    return onSnapshot(colRef, (snapshot) => {
      const list: BillDocument[] = [];
      snapshot.forEach((d) => list.push(d.data() as BillDocument));
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      callback(list);
    });
  }

  /**
   * Uploads and registers a bill document or receipt.
   */
  async uploadDocument(params: {
    familyId: string;
    billId: string;
    file: File;
    title: string;
    docType: BillDocument['docType'];
    currentUser: User;
    onProgress?: (percent: number) => void;
  }): Promise<BillDocument> {
    const { familyId, billId, file, title, docType, currentUser, onProgress } = params;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10 MB limit.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/bills/${billId}/documents/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.warn('Storage error on bill document upload, using fallback:', error);
          if (file.size <= 2 * 1024 * 1024) {
            try {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => reject(error);
              reader.readAsDataURL(file);
              return;
            } catch {}
          }
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    const docColRef = collection(db, 'families', familyId, 'bills', billId, 'documents');
    const newDoc = doc(docColRef);
    const now = new Date().toISOString();

    const docRecord: BillDocument = {
      id: newDoc.id,
      billId,
      familyId,
      title: title.trim() || file.name,
      docType,
      fileName: file.name,
      fileSize: file.size,
      url: downloadUrl,
      storagePath,
      uploadedBy: currentUser.name,
      uploadedAt: now,
    };

    await setDoc(newDoc, docRecord);
    return docRecord;
  }

  /**
   * Deletes a document attachment.
   */
  async deleteDocument(
    familyId: string,
    billId: string,
    docId: string,
    storagePath?: string
  ): Promise<void> {
    if (storagePath && storagePath !== 'base64_embedded') {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (err) {
        console.warn('Could not delete document from storage:', err);
      }
    }

    const docRef = doc(db, 'families', familyId, 'bills', billId, 'documents', docId);
    await deleteDoc(docRef);
  }
}

export const billDocumentService = new BillDocumentService();
