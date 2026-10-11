import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { User } from '../types';

export interface FamilyDocument {
  id: string;
  familyId: string;
  title: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  storagePath?: string;
  category: 'policy' | 'medical' | 'education' | 'finance' | 'identity' | 'general';
  uploadedBy: string;
  uploadedById: string;
  createdAt: string;
  updatedAt?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const documentService = {
  subscribeDocuments(
    familyId: string,
    callback: (docs: FamilyDocument[]) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'documents');
    const q = query(colRef, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const docs: FamilyDocument[] = [];
        snapshot.forEach((d) => {
          docs.push({ id: d.id, ...(d.data() as Omit<FamilyDocument, 'id'>) });
        });
        callback(docs);
      },
      (error) => {
        console.warn('[documentService] Snapshot error:', error);
        callback([]);
      }
    );
  },

  async uploadDocument(
    familyId: string,
    file: File,
    title: string,
    category: FamilyDocument['category'],
    currentUser: User
  ): Promise<FamilyDocument> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the 20MB limit.');
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, Word, Excel, Text, and Images are supported.');
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = `families/${familyId}/documents/${docId}_${file.name}`;
    let downloadUrl = '';

    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      downloadUrl = await getDownloadURL(snapshot.ref);
    } catch {
      // Offline / dataURL fallback
      downloadUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const newDoc: FamilyDocument = {
      id: docId,
      familyId,
      title: title || file.name,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      url: downloadUrl,
      storagePath,
      category: category || 'general',
      uploadedBy: currentUser.name,
      uploadedById: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    const docRef = doc(db, 'families', familyId, 'documents', docId);
    await setDoc(docRef, newDoc);

    return newDoc;
  },

  async deleteDocument(familyId: string, docId: string, storagePath?: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'documents', docId);
    await deleteDoc(docRef);

    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch {
        // Storage cleanup non-blocking
      }
    }
  },
};
