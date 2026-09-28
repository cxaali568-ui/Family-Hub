import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import {
  Child,
  ChildGuardian,
  SchoolFeePayment,
  ChildDocument,
  User,
  AppNotification,
} from '../types';
import { familyService } from './familyService';

class ChildService {
  /**
   * Subscribes to all children of a family
   */
  subscribeChildren(
    familyId: string,
    callback: (children: Child[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const childrenCol = collection(db, 'families', familyId, 'children');

    return onSnapshot(
      childrenCol,
      (snapshot) => {
        const list: Child[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as Child);
        });
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to children:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a new child profile
   */
  async addChild(
    familyId: string,
    data: Omit<Child, 'id' | 'familyId' | 'createdAt' | 'updatedAt' | 'totalMonthlyFee'>,
    currentUser: User
  ): Promise<Child> {
    const colRef = collection(db, 'families', familyId, 'children');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const tuition = Number(data.tuitionFee) || 0;
    const transport = Number(data.transportFee) || 0;
    const other = Number(data.otherFee) || 0;
    const totalMonthlyFee = tuition + transport + other;

    const child: Child = {
      id: newDoc.id,
      familyId,
      fullName: data.fullName.trim(),
      nickname: data.nickname?.trim() || undefined,
      photo: data.photo || undefined,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      bloodGroup: data.bloodGroup?.trim() || undefined,
      relationship: data.relationship || 'Son',
      phone: data.phone?.trim() || undefined,

      schoolName: data.schoolName?.trim() || undefined,
      schoolAddress: data.schoolAddress?.trim() || undefined,
      schoolPhone: data.schoolPhone?.trim() || undefined,
      schoolEmail: data.schoolEmail?.trim() || undefined,
      classGrade: data.classGrade?.trim() || undefined,
      section: data.section?.trim() || undefined,
      rollNumber: data.rollNumber?.trim() || undefined,
      admissionNumber: data.admissionNumber?.trim() || undefined,
      teacherName: data.teacherName?.trim() || undefined,
      teacherPhone: data.teacherPhone?.trim() || undefined,
      schoolTiming: data.schoolTiming?.trim() || undefined,

      tuitionFee: tuition,
      transportFee: transport,
      otherFee: other,
      totalMonthlyFee,
      feeDueDate: data.feeDueDate || undefined,
      feeNotes: data.feeNotes?.trim() || undefined,

      emergencyContactName: data.emergencyContactName?.trim() || undefined,
      emergencyContactRelation: data.emergencyContactRelation?.trim() || undefined,
      emergencyContactPhone: data.emergencyContactPhone?.trim() || undefined,
      emergencyContactAltPhone: data.emergencyContactAltPhone?.trim() || undefined,
      emergencyNotes: data.emergencyNotes?.trim() || undefined,

      generalNotes: data.generalNotes?.trim() || undefined,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    // Remove any undefined keys
    const cleanChild: any = { ...child };
    Object.keys(cleanChild).forEach((k) => {
      if (cleanChild[k] === undefined) delete cleanChild[k];
    });

    await setDoc(newDoc, cleanChild);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `added child profile for "${child.fullName}"`,
      entityType: 'child',
      entityId: child.id,
    });

    // Notify family
    this.broadcastNotification({
      familyId,
      actor: currentUser,
      title: 'New Child Profile Added',
      message: `${currentUser.name} added ${child.fullName} to the family records.`,
    });

    return child;
  }

  /**
   * Updates an existing child profile
   */
  async updateChild(
    familyId: string,
    childId: string,
    updates: Partial<Child>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'children', childId);
    const now = new Date().toISOString();

    const tuition = updates.tuitionFee !== undefined ? Number(updates.tuitionFee) || 0 : undefined;
    const transport = updates.transportFee !== undefined ? Number(updates.transportFee) || 0 : undefined;
    const other = updates.otherFee !== undefined ? Number(updates.otherFee) || 0 : undefined;

    let computedTotal: number | undefined;
    if (tuition !== undefined || transport !== undefined || other !== undefined) {
      const snap = await getDoc(docRef);
      const cur = snap.data() as Child;
      const t = tuition !== undefined ? tuition : cur.tuitionFee || 0;
      const tr = transport !== undefined ? transport : cur.transportFee || 0;
      const o = other !== undefined ? other : cur.otherFee || 0;
      computedTotal = t + tr + o;
    }

    const cleanUpdates: any = {
      ...updates,
      updatedAt: now,
    };
    if (computedTotal !== undefined) {
      cleanUpdates.totalMonthlyFee = computedTotal;
    }

    Object.keys(cleanUpdates).forEach((k) => {
      if (cleanUpdates[k] === undefined) delete cleanUpdates[k];
    });

    await updateDoc(docRef, cleanUpdates);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated information for "${updates.fullName || 'child'}"`,
      entityType: 'child',
      entityId: childId,
    });
  }

  /**
   * Deletes a child profile
   */
  async deleteChild(familyId: string, childId: string, childName: string, currentUser: User): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'children', childId);
    await deleteDoc(docRef);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `removed child record for "${childName}"`,
      entityType: 'child',
      entityId: childId,
    });
  }

  /**
   * Uploads child photo to Firebase Storage
   */
  async uploadChildPhoto(familyId: string, childId: string, file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/children/${childId}/profile/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        null,
        async (error) => {
          console.warn('Child photo storage upload error, using fallback:', error);
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
  }

  // --- Guardians Subcollection ---
  subscribeGuardians(
    familyId: string,
    childId: string,
    callback: (guardians: ChildGuardian[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'children', childId, 'guardians');
    return onSnapshot(colRef, (snap) => {
      const list: ChildGuardian[] = [];
      snap.forEach((d) => list.push(d.data() as ChildGuardian));
      callback(list);
    });
  }

  async addGuardian(
    familyId: string,
    childId: string,
    guardian: Omit<ChildGuardian, 'id' | 'childId' | 'familyId' | 'createdAt'>
  ): Promise<ChildGuardian> {
    const colRef = collection(db, 'families', familyId, 'children', childId, 'guardians');
    const newDoc = doc(colRef);
    const data: ChildGuardian = {
      id: newDoc.id,
      childId,
      familyId,
      memberName: guardian.memberName.trim(),
      relationship: guardian.relationship.trim(),
      phone: guardian.phone?.trim() || undefined,
      isPrimary: guardian.isPrimary || false,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async removeGuardian(familyId: string, childId: string, guardianId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'children', childId, 'guardians', guardianId);
    await deleteDoc(docRef);
  }

  // --- School Fee Payments Subcollection ---
  subscribeFeePayments(
    familyId: string,
    childId: string,
    callback: (payments: SchoolFeePayment[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'children', childId, 'fees');
    return onSnapshot(colRef, (snap) => {
      const list: SchoolFeePayment[] = [];
      snap.forEach((d) => list.push(d.data() as SchoolFeePayment));
      // Sort newest date first
      list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
      callback(list);
    });
  }

  async addFeePayment(
    familyId: string,
    childId: string,
    payment: Omit<SchoolFeePayment, 'id' | 'childId' | 'familyId' | 'createdAt'>,
    currentUser: User
  ): Promise<SchoolFeePayment> {
    const colRef = collection(db, 'families', familyId, 'children', childId, 'fees');
    const newDoc = doc(colRef);
    const data: SchoolFeePayment = {
      id: newDoc.id,
      childId,
      familyId,
      month: payment.month,
      year: payment.year,
      amount: Number(payment.amount) || 0,
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      paidBy: payment.paidBy || currentUser.name,
      paidByUserId: currentUser.id,
      status: payment.status || 'Paid',
      receiptUrl: payment.receiptUrl || undefined,
      notes: payment.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async updateFeePaymentStatus(
    familyId: string,
    childId: string,
    paymentId: string,
    status: SchoolFeePayment['status']
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'children', childId, 'fees', paymentId);
    await updateDoc(docRef, { status });
  }

  // --- Child Documents Subcollection ---
  subscribeChildDocuments(
    familyId: string,
    childId: string,
    callback: (docs: ChildDocument[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'children', childId, 'documents');
    return onSnapshot(colRef, (snap) => {
      const list: ChildDocument[] = [];
      snap.forEach((d) => list.push(d.data() as ChildDocument));
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      callback(list);
    });
  }

  async uploadChildDocument(params: {
    familyId: string;
    childId: string;
    file: File;
    title: string;
    docType: ChildDocument['docType'];
    currentUser: User;
    onProgress?: (percent: number) => void;
  }): Promise<ChildDocument> {
    const { familyId, childId, file, title, docType, currentUser, onProgress } = params;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/children/${childId}/documents/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.warn('Document storage upload error, using fallback:', error);
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

    const docCol = collection(db, 'families', familyId, 'children', childId, 'documents');
    const newDoc = doc(docCol);
    const docData: ChildDocument = {
      id: newDoc.id,
      childId,
      familyId,
      title: title.trim() || file.name,
      docType,
      url: downloadUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
    };

    await setDoc(newDoc, docData);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `uploaded document "${docData.title}" for child`,
      entityType: 'child_document',
      entityId: docData.id,
    });

    return docData;
  }

  async deleteChildDocument(familyId: string, childId: string, docId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'children', childId, 'documents', docId);
    await deleteDoc(docRef);
  }

  private async broadcastNotification(params: {
    familyId: string;
    actor: User;
    title: string;
    message: string;
  }): Promise<void> {
    try {
      const membersSnap = await getDocs(
        query(
          collection(db, 'familyMembers'),
          where('familyId', '==', params.familyId),
          where('status', '==', 'active')
        )
      );

      const now = new Date().toISOString();
      const promises: Promise<any>[] = [];

      membersSnap.forEach((mDoc) => {
        const mem = mDoc.data();
        if (mem.userId !== params.actor.id) {
          const notifRef = doc(collection(db, 'notifications'));
          const notif: AppNotification = {
            id: notifRef.id,
            recipientUserId: mem.userId,
            familyId: params.familyId,
            type: 'system',
            title: params.title,
            message: params.message,
            relatedEntityType: 'child',
            createdAt: now,
            readAt: null,
          };
          promises.push(setDoc(notifRef, notif));
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.warn('Could not broadcast child notification:', err);
    }
  }
}

export const childService = new ChildService();
