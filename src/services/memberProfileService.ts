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
import { FamilyMemberProfile, User, FamilyMember, AppNotification } from '../types';
import { familyService } from './familyService';

class MemberProfileService {
  /**
   * Subscribes to real-time member profiles for a family
   */
  subscribeMemberProfiles(
    familyId: string,
    callback: (profiles: FamilyMemberProfile[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const profilesCol = collection(db, 'families', familyId, 'memberProfiles');
    const q = query(profilesCol, where('status', '==', 'active'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: FamilyMemberProfile[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as FamilyMemberProfile);
        });
        // Sort by relationship / createdAt
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn('Error subscribing to member profiles:', err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Auto-populates or synchronizes initial member profile for the family owner/members
   * if no member profiles exist yet
   */
  async ensureOwnerProfile(familyId: string, user: User, role: string = 'owner'): Promise<void> {
    if (!familyId || !user?.id) return;
    try {
      const profileId = `profile_${user.id}`;
      const docRef = doc(db, 'families', familyId, 'memberProfiles', profileId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        const now = new Date().toISOString();
        const profile: FamilyMemberProfile = {
          id: profileId,
          familyId,
          userId: user.id,
          fullName: user.name || user.fullName || 'Family Member',
          nickname: user.name?.split(' ')[0] || '',
          profileImage: user.avatar || user.profileImage || undefined,
          gender: 'other',
          relationship: role === 'owner' ? 'Father' : 'Member',
          phone: user.phone || undefined,
          email: user.email || undefined,
          isChild: false,
          createdBy: user.id,
          createdAt: now,
          updatedAt: now,
          status: 'active',
        };
        await setDoc(docRef, profile);
      }
    } catch (err) {
      console.warn('Could not ensure owner member profile:', err);
    }
  }

  /**
   * Adds a new family member profile (can be registered user or profile-only)
   */
  async addMemberProfile(
    familyId: string,
    data: Omit<FamilyMemberProfile, 'id' | 'familyId' | 'createdAt' | 'updatedAt' | 'status'>,
    currentUser: User
  ): Promise<FamilyMemberProfile> {
    const colRef = collection(db, 'families', familyId, 'memberProfiles');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const profile: FamilyMemberProfile = {
      id: newDoc.id,
      familyId,
      userId: data.userId || null,
      fullName: data.fullName.trim(),
      nickname: data.nickname?.trim() || undefined,
      profileImage: data.profileImage || undefined,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth || undefined,
      relationship: data.relationship.trim(),
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
      address: data.address?.trim() || undefined,
      isChild: data.isChild || false,
      notes: data.notes?.trim() || undefined,
      createdBy: currentUser.id,
      createdAt: now,
      updatedAt: now,
      status: 'active',
    };

    await setDoc(newDoc, profile);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `added family member profile for "${profile.fullName}" (${profile.relationship})`,
      entityType: 'member_profile',
      entityId: profile.id,
    });

    // Notify other family members
    this.broadcastNotification({
      familyId,
      actor: currentUser,
      title: 'New Family Member Added',
      message: `${currentUser.name} added ${profile.fullName} (${profile.relationship}) to the family space.`,
    });

    return profile;
  }

  /**
   * Updates an existing member profile
   */
  async updateMemberProfile(
    familyId: string,
    profileId: string,
    updates: Partial<FamilyMemberProfile>,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'memberProfiles', profileId);
    const now = new Date().toISOString();

    const cleanUpdates: any = {
      ...updates,
      updatedAt: now,
    };
    // Ensure no undefined values passed to Firestore
    Object.keys(cleanUpdates).forEach((key) => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
      }
    });

    await updateDoc(docRef, cleanUpdates);

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `updated family profile for "${updates.fullName || 'member'}"`,
      entityType: 'member_profile',
      entityId: profileId,
    });
  }

  /**
   * Removes / archives a family member profile
   * Preserves historical references and does NOT delete any user account
   */
  async removeMemberProfile(
    familyId: string,
    profileId: string,
    memberName: string,
    currentUser: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'memberProfiles', profileId);
    const now = new Date().toISOString();

    // Mark as archived rather than hard deleting to preserve audit history
    await updateDoc(docRef, {
      status: 'archived',
      updatedAt: now,
    });

    // Audit log
    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: `removed "${memberName}" from the family profile records`,
      entityType: 'member_profile',
      entityId: profileId,
    });
  }

  /**
   * Uploads profile image to Firebase Storage with progress and data URL fallback
   */
  async uploadProfilePhoto(
    familyId: string,
    memberId: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/members/${memberId}/profile/${Date.now()}_${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.warn('Storage upload error, using fallback:', error);
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
            relatedEntityType: 'member_profile',
            createdAt: now,
            readAt: null,
          };
          promises.push(setDoc(notifRef, notif));
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.warn('Could not broadcast profile notification:', err);
    }
  }
}

export const memberProfileService = new MemberProfileService();
