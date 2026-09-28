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
  MedicalProfile,
  Allergy,
  MedicalCondition,
  Medicine,
  Doctor,
  MedicalAppointment,
  MedicalDocument,
  User,
  AppNotification,
} from '../types';
import { familyService } from './familyService';

class MedicalService {
  /**
   * Real-time subscription to medical profiles in a family
   */
  subscribeMedicalProfiles(
    familyId: string,
    callback: (profiles: MedicalProfile[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'medicalProfiles');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: MedicalProfile[] = [];
        snapshot.forEach((d) => list.push(d.data() as MedicalProfile));
        list.sort((a, b) => a.personName.localeCompare(b.personName));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to medical profiles:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a new medical profile for a family member or child
   */
  async addMedicalProfile(
    familyId: string,
    data: Omit<MedicalProfile, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>,
    currentUser: User
  ): Promise<MedicalProfile> {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const profile: MedicalProfile = {
      id: newDoc.id,
      familyId,
      personId: data.personId,
      personName: data.personName.trim(),
      personType: data.personType,
      photo: data.photo || undefined,
      bloodGroup: data.bloodGroup || 'Unknown',
      height: data.height?.trim() || undefined,
      weight: data.weight?.trim() || undefined,
      importantAlert: data.importantAlert?.trim() || undefined,
      surgeries: data.surgeries?.trim() || undefined,
      medicalHistory: data.medicalHistory?.trim() || undefined,
      emergencyNotes: data.emergencyNotes?.trim() || undefined,
      emergencyContactName: data.emergencyContactName?.trim() || undefined,
      emergencyContactPhone: data.emergencyContactPhone?.trim() || undefined,
      emergencyContactRelation: data.emergencyContactRelation?.trim() || undefined,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
    };

    const clean: any = { ...profile };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await setDoc(newDoc, clean);

    // Audit log (minimal metadata, no sensitive notes)
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `created medical health profile for "${profile.personName}"`,
      entityType: 'medical_profile',
      entityId: profile.id,
    });

    this.broadcastNotification({
      familyId,
      actor: currentUser,
      title: 'Medical Profile Updated',
      message: `Medical health profile created for ${profile.personName}.`,
    });

    return profile;
  }

  /**
   * Updates an existing medical profile
   */
  async updateMedicalProfile(
    familyId: string,
    profileId: string,
    updates: Partial<MedicalProfile>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId);
    const now = new Date().toISOString();

    const clean: any = {
      ...updates,
      updatedAt: now,
    };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await updateDoc(docRef, clean);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated medical health profile for "${updates.personName || 'family member'}"`,
      entityType: 'medical_profile',
      entityId: profileId,
    });
  }

  /**
   * Deletes a medical profile
   */
  async deleteMedicalProfile(
    familyId: string,
    profileId: string,
    personName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId);
    await deleteDoc(docRef);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `removed medical profile for "${personName}"`,
      entityType: 'medical_profile',
      entityId: profileId,
    });
  }

  // --- ALLERGIES ---
  subscribeAllergies(
    familyId: string,
    profileId: string,
    callback: (allergies: Allergy[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'allergies');
    return onSnapshot(colRef, (snap) => {
      const list: Allergy[] = [];
      snap.forEach((d) => list.push(d.data() as Allergy));
      list.sort((a, b) => (b.isSevereAlert ? 1 : 0) - (a.isSevereAlert ? 1 : 0));
      callback(list);
    });
  }

  async addAllergy(
    familyId: string,
    profileId: string,
    allergy: Omit<Allergy, 'id' | 'familyId' | 'profileId' | 'createdAt'>,
    currentUser: User
  ): Promise<Allergy> {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'allergies');
    const newDoc = doc(colRef);
    const data: Allergy = {
      id: newDoc.id,
      familyId,
      profileId,
      name: allergy.name.trim(),
      type: allergy.type,
      severity: allergy.severity,
      reaction: allergy.reaction?.trim() || undefined,
      isSevereAlert: allergy.isSevereAlert || allergy.severity === 'Severe',
      notes: allergy.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);

    // If severe, also set important alert on parent profile
    if (data.isSevereAlert) {
      await updateDoc(doc(db, 'families', familyId, 'medicalProfiles', profileId), {
        importantAlert: `⚠️ Severe ${data.name} Allergy (${data.type})`,
      });
    }

    return data;
  }

  async deleteAllergy(familyId: string, profileId: string, allergyId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'allergies', allergyId);
    await deleteDoc(docRef);
  }

  // --- CONDITIONS ---
  subscribeConditions(
    familyId: string,
    profileId: string,
    callback: (conditions: MedicalCondition[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'conditions');
    return onSnapshot(colRef, (snap) => {
      const list: MedicalCondition[] = [];
      snap.forEach((d) => list.push(d.data() as MedicalCondition));
      callback(list);
    });
  }

  async addCondition(
    familyId: string,
    profileId: string,
    cond: Omit<MedicalCondition, 'id' | 'familyId' | 'profileId' | 'createdAt'>
  ): Promise<MedicalCondition> {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'conditions');
    const newDoc = doc(colRef);
    const data: MedicalCondition = {
      id: newDoc.id,
      familyId,
      profileId,
      name: cond.name.trim(),
      dateDiagnosed: cond.dateDiagnosed || undefined,
      status: cond.status,
      doctor: cond.doctor?.trim() || undefined,
      notes: cond.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async updateConditionStatus(
    familyId: string,
    profileId: string,
    conditionId: string,
    status: MedicalCondition['status']
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'conditions', conditionId);
    await updateDoc(docRef, { status });
  }

  async deleteCondition(familyId: string, profileId: string, conditionId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'conditions', conditionId);
    await deleteDoc(docRef);
  }

  // --- MEDICINES ---
  subscribeMedicines(
    familyId: string,
    profileId: string,
    callback: (medicines: Medicine[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'medicines');
    return onSnapshot(colRef, (snap) => {
      const list: Medicine[] = [];
      snap.forEach((d) => list.push(d.data() as Medicine));
      callback(list);
    });
  }

  async addMedicine(
    familyId: string,
    profileId: string,
    med: Omit<Medicine, 'id' | 'familyId' | 'profileId' | 'createdAt'>
  ): Promise<Medicine> {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'medicines');
    const newDoc = doc(colRef);
    const data: Medicine = {
      id: newDoc.id,
      familyId,
      profileId,
      name: med.name.trim(),
      strength: med.strength?.trim() || undefined,
      form: med.form || 'Tablet',
      dose: med.dose.trim(),
      frequency: med.frequency.trim(),
      reminderTime: med.reminderTime?.trim() || undefined,
      startDate: med.startDate,
      endDate: med.endDate || undefined,
      prescribedBy: med.prescribedBy?.trim() || undefined,
      status: med.status,
      notes: med.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async updateMedicineStatus(
    familyId: string,
    profileId: string,
    medicineId: string,
    status: Medicine['status']
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'medicines', medicineId);
    await updateDoc(docRef, { status });
  }

  async deleteMedicine(familyId: string, profileId: string, medicineId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'medicines', medicineId);
    await deleteDoc(docRef);
  }

  // --- DOCTORS ---
  subscribeDoctors(
    familyId: string,
    profileId: string,
    callback: (doctors: Doctor[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'doctors');
    return onSnapshot(colRef, (snap) => {
      const list: Doctor[] = [];
      snap.forEach((d) => list.push(d.data() as Doctor));
      callback(list);
    });
  }

  async addDoctor(
    familyId: string,
    profileId: string,
    docData: Omit<Doctor, 'id' | 'familyId' | 'profileId' | 'createdAt'>
  ): Promise<Doctor> {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'doctors');
    const newDoc = doc(colRef);
    const data: Doctor = {
      id: newDoc.id,
      familyId,
      profileId,
      name: docData.name.trim(),
      specialty: docData.specialty.trim(),
      hospitalClinic: docData.hospitalClinic.trim(),
      phone: docData.phone.trim(),
      email: docData.email?.trim() || undefined,
      address: docData.address?.trim() || undefined,
      notes: docData.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async deleteDoctor(familyId: string, profileId: string, doctorId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'doctors', doctorId);
    await deleteDoc(docRef);
  }

  // --- APPOINTMENTS ---
  subscribeAppointments(
    familyId: string,
    callback: (appointments: MedicalAppointment[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalAppointments');
    return onSnapshot(colRef, (snap) => {
      const list: MedicalAppointment[] = [];
      snap.forEach((d) => list.push(d.data() as MedicalAppointment));
      list.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      callback(list);
    });
  }

  async addAppointment(
    familyId: string,
    appt: Omit<MedicalAppointment, 'id' | 'familyId' | 'createdAt'>
  ): Promise<MedicalAppointment> {
    const colRef = collection(db, 'families', familyId, 'medicalAppointments');
    const newDoc = doc(colRef);
    const data: MedicalAppointment = {
      id: newDoc.id,
      familyId,
      profileId: appt.profileId,
      personName: appt.personName,
      doctorName: appt.doctorName.trim(),
      hospitalClinic: appt.hospitalClinic.trim(),
      date: appt.date,
      time: appt.time,
      appointmentType: appt.appointmentType || 'Consultation',
      reasonNotes: appt.reasonNotes?.trim() || undefined,
      status: appt.status || 'Upcoming',
      reminderTime: appt.reminderTime || '2 hours before',
      createdAt: new Date().toISOString(),
    };
    const clean: any = { ...data };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);
    return data;
  }

  async updateAppointmentStatus(
    familyId: string,
    appointmentId: string,
    status: MedicalAppointment['status']
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalAppointments', appointmentId);
    await updateDoc(docRef, { status });
  }

  async deleteAppointment(familyId: string, appointmentId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalAppointments', appointmentId);
    await deleteDoc(docRef);
  }

  // --- MEDICAL DOCUMENTS ---
  subscribeMedicalDocuments(
    familyId: string,
    profileId: string,
    callback: (docs: MedicalDocument[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'documents');
    return onSnapshot(colRef, (snap) => {
      const list: MedicalDocument[] = [];
      snap.forEach((d) => list.push(d.data() as MedicalDocument));
      list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      callback(list);
    });
  }

  async uploadMedicalDocument(params: {
    familyId: string;
    profileId: string;
    file: File;
    title: string;
    category: MedicalDocument['category'];
    currentUser: User;
    notes?: string;
    onProgress?: (percent: number) => void;
  }): Promise<MedicalDocument> {
    const { familyId, profileId, file, title, category, currentUser, notes, onProgress } = params;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/medical/${profileId}/documents/${Date.now()}_${safeName}`;
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
          console.warn('Medical document storage upload error, fallback:', error);
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

    const docCol = collection(db, 'families', familyId, 'medicalProfiles', profileId, 'documents');
    const newDoc = doc(docCol);
    const docData: MedicalDocument = {
      id: newDoc.id,
      profileId,
      familyId,
      title: title.trim() || file.name,
      category,
      fileName: file.name,
      fileSize: file.size,
      url: downloadUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser.name,
      notes: notes?.trim() || undefined,
    };

    const clean: any = { ...docData };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(newDoc, clean);

    return docData;
  }

  async deleteMedicalDocument(familyId: string, profileId: string, docId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'medicalProfiles', profileId, 'documents', docId);
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
            type: 'medical_update',
            title: params.title,
            message: params.message,
            relatedEntityType: 'medical_profile',
            createdAt: now,
            readAt: null,
          };
          promises.push(setDoc(notifRef, notif));
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.warn('Could not broadcast medical notification:', err);
    }
  }
}

export const medicalService = new MedicalService();
