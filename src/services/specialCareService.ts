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
import { db } from '../lib/firebase';
import {
  SpecialCareProfile,
  CareNeed,
  CareRoutine,
  CareTask,
  User,
  AppNotification,
} from '../types';
import { familyService } from './familyService';

class SpecialCareService {
  /**
   * Subscribes to special care profiles in a family
   */
  subscribeSpecialCareProfiles(
    familyId: string,
    callback: (profiles: SpecialCareProfile[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'specialCare');

    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: SpecialCareProfile[] = [];
        snapshot.forEach((d) => list.push(d.data() as SpecialCareProfile));
        list.sort((a, b) => a.personName.localeCompare(b.personName));
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to special care profiles:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Adds a special care profile
   */
  async addSpecialCareProfile(
    familyId: string,
    data: Omit<SpecialCareProfile, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>,
    currentUser: User
  ): Promise<SpecialCareProfile> {
    const colRef = collection(db, 'families', familyId, 'specialCare');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const profile: SpecialCareProfile = {
      id: newDoc.id,
      familyId,
      personId: data.personId,
      personName: data.personName.trim(),
      personType: data.personType,
      photo: data.photo || undefined,
      careLevel: data.careLevel || 'Regular Assistance',
      primaryCaregiverName: data.primaryCaregiverName.trim(),
      primaryCaregiverId: data.primaryCaregiverId || undefined,
      primaryCaregiverPhone: data.primaryCaregiverPhone?.trim() || undefined,
      secondaryCaregiverName: data.secondaryCaregiverName?.trim() || undefined,
      secondaryCaregiverPhone: data.secondaryCaregiverPhone?.trim() || undefined,
      mobilityNeeds: data.mobilityNeeds?.trim() || undefined,
      dietaryRequirements: data.dietaryRequirements?.trim() || undefined,
      communicationPreferences: data.communicationPreferences?.trim() || undefined,
      careAlert: data.careAlert?.trim() || undefined,
      emergencyInstructions: data.emergencyInstructions?.trim() || undefined,
      generalNotes: data.generalNotes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const clean: any = { ...profile };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);

    await setDoc(newDoc, clean);

    // Initial default care needs
    const defaultNeeds = [
      'Help with medication',
      'Assistance with meals',
      'Mobility assistance',
      'Personal care',
      'Appointment accompaniment',
    ];
    for (const needTitle of defaultNeeds) {
      const needRef = doc(collection(db, 'families', familyId, 'specialCare', newDoc.id, 'needs'));
      await setDoc(needRef, {
        id: needRef.id,
        careProfileId: newDoc.id,
        familyId,
        title: needTitle,
        enabled: true,
      });
    }

    // Default daily routine
    const defaultRoutines = [
      { title: 'Morning Medication & Breakfast', time: '08:30 AM' },
      { title: 'Lunch & Hydration Check', time: '01:00 PM' },
      { title: 'Evening Walk / Mobility Exercise', time: '05:30 PM' },
      { title: 'Night Routine & Medication', time: '08:30 PM' },
    ];
    for (const r of defaultRoutines) {
      const rRef = doc(collection(db, 'families', familyId, 'specialCare', newDoc.id, 'routines'));
      await setDoc(rRef, {
        id: rRef.id,
        careProfileId: newDoc.id,
        familyId,
        title: r.title,
        time: r.time,
        repeatPattern: 'Daily',
        enabled: true,
      });
    }

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `created special care assistance profile for "${profile.personName}"`,
      entityType: 'special_care',
      entityId: profile.id,
    });

    return profile;
  }

  /**
   * Updates special care profile
   */
  async updateSpecialCareProfile(
    familyId: string,
    profileId: string,
    updates: Partial<SpecialCareProfile>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'specialCare', profileId);
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
      action: `updated special care instructions for "${updates.personName || 'member'}"`,
      entityType: 'special_care',
      entityId: profileId,
    });
  }

  /**
   * Deletes special care profile
   */
  async deleteSpecialCareProfile(
    familyId: string,
    profileId: string,
    personName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'specialCare', profileId);
    await deleteDoc(docRef);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `removed special care profile for "${personName}"`,
      entityType: 'special_care',
      entityId: profileId,
    });
  }

  // --- CARE NEEDS ---
  subscribeCareNeeds(
    familyId: string,
    profileId: string,
    callback: (needs: CareNeed[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'needs');
    return onSnapshot(colRef, (snap) => {
      const list: CareNeed[] = [];
      snap.forEach((d) => list.push(d.data() as CareNeed));
      callback(list);
    });
  }

  async toggleCareNeed(familyId: string, profileId: string, needId: string, enabled: boolean): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'specialCare', profileId, 'needs', needId);
    await updateDoc(docRef, { enabled });
  }

  async addCareNeed(familyId: string, profileId: string, title: string): Promise<void> {
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'needs');
    const newDoc = doc(colRef);
    await setDoc(newDoc, {
      id: newDoc.id,
      careProfileId: profileId,
      familyId,
      title: title.trim(),
      enabled: true,
    });
  }

  // --- CARE ROUTINES ---
  subscribeCareRoutines(
    familyId: string,
    profileId: string,
    callback: (routines: CareRoutine[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'routines');
    return onSnapshot(colRef, (snap) => {
      const list: CareRoutine[] = [];
      snap.forEach((d) => list.push(d.data() as CareRoutine));
      list.sort((a, b) => a.time.localeCompare(b.time));
      callback(list);
    });
  }

  async addCareRoutine(
    familyId: string,
    profileId: string,
    data: { title: string; time: string; repeatPattern?: string; notes?: string }
  ): Promise<void> {
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'routines');
    const newDoc = doc(colRef);
    await setDoc(newDoc, {
      id: newDoc.id,
      careProfileId: profileId,
      familyId,
      title: data.title.trim(),
      time: data.time.trim(),
      repeatPattern: data.repeatPattern || 'Daily',
      notes: data.notes?.trim() || undefined,
      enabled: true,
    });
  }

  async deleteCareRoutine(familyId: string, profileId: string, routineId: string): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'specialCare', profileId, 'routines', routineId);
    await deleteDoc(docRef);
  }

  // --- DAILY TASKS ---
  subscribeTodayTasks(
    familyId: string,
    profileId: string,
    todayDate: string,
    callback: (tasks: CareTask[]) => void
  ): () => void {
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'tasks');
    const q = query(colRef, where('date', '==', todayDate));
    return onSnapshot(q, (snap) => {
      const list: CareTask[] = [];
      snap.forEach((d) => list.push(d.data() as CareTask));
      callback(list);
    });
  }

  async recordTaskStatus(params: {
    familyId: string;
    profileId: string;
    taskId?: string;
    routineId?: string;
    title: string;
    time: string;
    date: string;
    status: CareTask['status'];
    user: User;
  }): Promise<void> {
    const { familyId, profileId, taskId, routineId, title, time, date, status, user } = params;
    const colRef = collection(db, 'families', familyId, 'specialCare', profileId, 'tasks');
    const targetDoc = taskId ? doc(colRef, taskId) : doc(colRef, `${date}_${routineId || Date.now()}`);

    const task: CareTask = {
      id: targetDoc.id,
      careProfileId: profileId,
      familyId,
      routineId: routineId || undefined,
      title,
      time,
      status,
      date,
      completedBy: user.name,
      completedAt: new Date().toISOString(),
    };

    const clean: any = { ...task };
    Object.keys(clean).forEach((k) => clean[k] === undefined && delete clean[k]);
    await setDoc(targetDoc, clean);

    if (status === 'Completed') {
      await familyService.logActivity({
        familyId,
        actorUserId: user.id,
        actorName: user.name,
        action: `completed care routine task "${title}"`,
        entityType: 'care_task',
        entityId: targetDoc.id,
      });
    }
  }
}

export const specialCareService = new SpecialCareService();
