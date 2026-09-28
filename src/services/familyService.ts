import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Family,
  FamilyMember,
  FamilyInvite,
  User,
  Role,
  ActivityLog,
  ChatRoom,
  ChatMember,
} from '../types';

/**
 * Generates an unguessable invitation code formatted like: FAM-8K4P-29XQ
 */
export function generateSecureInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous 0, O, 1, I
  let part1 = '';
  let part2 = '';
  const cryptoObj = window.crypto || (window as any).msCrypto;
  const buffer = new Uint8Array(8);
  cryptoObj.getRandomValues(buffer);

  for (let i = 0; i < 4; i++) {
    part1 += chars[buffer[i] % chars.length];
    part2 += chars[buffer[i + 4] % chars.length];
  }
  return `FAM-${part1}-${part2}`;
}

class FamilyService {
  /**
   * Creates a new family, sets creator as owner, creates default chat room and chat membership
   */
  async createFamily(params: {
    name: string;
    photo?: string;
    creator: User;
  }): Promise<{ family: Family; membership: FamilyMember }> {
    const familyCol = collection(db, 'families');
    const familyDocRef = doc(familyCol);
    const familyId = familyDocRef.id;

    const now = new Date().toISOString();
    const inviteCode = generateSecureInviteCode();

    const familyData: Family = {
      id: familyId,
      name: params.name.trim(),
      photo: params.photo || undefined,
      avatar: params.photo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(familyId)}`,
      createdBy: params.creator.id,
      createdAt: now,
      updatedAt: now,
      status: 'active',
      inviteCode,
      settings: {
        allowMemberInvites: true,
        currency: 'USD',
        emergencyNumber: '911',
      },
    };

    // 1. Create family document
    await setDoc(familyDocRef, familyData);

    // 2. Create owner membership in familyMembers/{familyId}_{userId}
    const membershipId = `${familyId}_${params.creator.id}`;
    const membershipData: FamilyMember = {
      id: membershipId,
      familyId,
      userId: params.creator.id,
      role: 'owner',
      status: 'active',
      joinedAt: now,
      updatedAt: now,
      userName: params.creator.name,
      userEmail: params.creator.email,
      userPhoto: params.creator.avatar,
    };
    await setDoc(doc(db, 'familyMembers', membershipId), membershipData);

    // 3. Create default general chat room: chatRooms/{familyId}_general
    const chatRoomId = `${familyId}_general`;
    const chatRoomData: ChatRoom = {
      id: chatRoomId,
      familyId,
      type: 'family',
      name: `${params.name.trim()} Chat`,
      createdAt: now,
      createdBy: params.creator.id,
      isGeneral: true,
    };
    await setDoc(doc(db, 'chatRooms', chatRoomId), chatRoomData);

    // 4. Create chat member relationship
    const chatMemberId = `${chatRoomId}_${params.creator.id}`;
    const chatMemberData: ChatMember = {
      id: chatMemberId,
      chatRoomId,
      familyId,
      userId: params.creator.id,
      joinedAt: now,
      status: 'active',
    };
    await setDoc(doc(db, 'chatMembers', chatMemberId), chatMemberData);

    // 5. Initial active invite code record
    const inviteDocRef = doc(collection(db, 'familyInvites'));
    const inviteData: FamilyInvite = {
      id: inviteDocRef.id,
      familyId,
      familyName: params.name.trim(),
      familyPhoto: params.photo || undefined,
      invitedBy: params.creator.id,
      invitedByName: params.creator.name,
      inviteCode,
      role: 'member',
      status: 'pending',
      expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days
      createdAt: now,
    };
    await setDoc(inviteDocRef, inviteData);

    // 6. Log initial activity
    await this.logActivity({
      familyId,
      actorUserId: params.creator.id,
      actorName: params.creator.name,
      action: `created the "${params.name.trim()}" family space`,
      entityType: 'family',
      entityId: familyId,
    });

    return { family: familyData, membership: membershipData };
  }

  /**
   * Loads all families that a user belongs to with active membership
   */
  async getUserFamilies(userId: string): Promise<Array<{ family: Family; membership: FamilyMember }>> {
    try {
      const q = query(
        collection(db, 'familyMembers'),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

      const snap = await getDocs(q);
      const results: Array<{ family: Family; membership: FamilyMember }> = [];

      for (const mDoc of snap.docs) {
        const mem = mDoc.data() as FamilyMember;
        const familySnap = await getDoc(doc(db, 'families', mem.familyId));
        if (familySnap.exists()) {
          const fam = familySnap.data() as Family;
          if (fam.status === 'active') {
            results.push({ family: fam, membership: mem });
          }
        }
      }

      return results;
    } catch (err) {
      console.warn("Could not load user families:", err);
      return [];
    }
  }

  /**
   * Real-time subscription to a family's active members
   */
  subscribeFamilyMembers(
    familyId: string,
    callback: (members: FamilyMember[]) => void
  ): () => void {
    const q = query(
      collection(db, 'familyMembers'),
      where('familyId', '==', familyId),
      where('status', '==', 'active')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const members: FamilyMember[] = [];
        snapshot.forEach((doc) => {
          members.push(doc.data() as FamilyMember);
        });
        callback(members);
      },
      (error) => {
        console.warn("Error listening to family members:", error);
      }
    );
  }

  /**
   * Generates a new invitation with an unguessable code
   */
  async generateInvite(params: {
    familyId: string;
    familyName: string;
    familyPhoto?: string;
    invitedBy: User;
    role: 'admin' | 'member';
    email?: string;
  }): Promise<FamilyInvite> {
    const inviteCol = collection(db, 'familyInvites');
    const inviteDocRef = doc(inviteCol);
    const inviteCode = generateSecureInviteCode();
    const now = new Date().toISOString();

    const inviteData: FamilyInvite = {
      id: inviteDocRef.id,
      familyId: params.familyId,
      familyName: params.familyName,
      familyPhoto: params.familyPhoto,
      invitedBy: params.invitedBy.id,
      invitedByName: params.invitedBy.name,
      inviteCode,
      email: params.email?.trim() || undefined,
      role: params.role,
      status: 'pending',
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days expiration
      createdAt: now,
    };

    await setDoc(inviteDocRef, inviteData);

    await this.logActivity({
      familyId: params.familyId,
      actorUserId: params.invitedBy.id,
      actorName: params.invitedBy.name,
      action: `generated a family invitation code (${inviteCode})`,
      entityType: 'invite',
      entityId: inviteDocRef.id,
    });

    return inviteData;
  }

  /**
   * Inspects and validates an invitation code without joining
   */
  async getInviteByCode(code: string): Promise<FamilyInvite> {
    const normalized = code.trim().toUpperCase();
    const q = query(
      collection(db, 'familyInvites'),
      where('inviteCode', '==', normalized),
      where('status', '==', 'pending'),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Invalid or expired family invitation code. Please check with your family admin.');
    }

    const invite = snap.docs[0].data() as FamilyInvite;

    // Verify expiration
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await updateDoc(doc(db, 'familyInvites', invite.id), { status: 'expired' });
      throw new Error('This family invitation code has expired.');
    }

    return invite;
  }

  /**
   * Joins an existing family using a validated invitation
   */
  async joinFamily(params: {
    invite: FamilyInvite;
    user: User;
  }): Promise<{ family: Family; membership: FamilyMember }> {
    const { invite, user } = params;
    const now = new Date().toISOString();

    // Check if family exists and is active
    const familySnap = await getDoc(doc(db, 'families', invite.familyId));
    if (!familySnap.exists()) {
      throw new Error('The target family does not exist.');
    }
    const familyData = familySnap.data() as Family;
    if (familyData.status !== 'active') {
      throw new Error('This family space is no longer active.');
    }

    // 1. Create or re-activate family membership: familyMembers/{familyId}_{userId}
    const membershipId = `${invite.familyId}_${user.id}`;
    const membershipData: FamilyMember = {
      id: membershipId,
      familyId: invite.familyId,
      userId: user.id,
      role: invite.role,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
      userName: user.name,
      userEmail: user.email,
      userPhoto: user.avatar,
    };
    await setDoc(doc(db, 'familyMembers', membershipId), membershipData);

    // 2. Add user to family chat room
    const chatRoomId = `${invite.familyId}_general`;
    const chatMemberId = `${chatRoomId}_${user.id}`;
    await setDoc(doc(db, 'chatMembers', chatMemberId), {
      id: chatMemberId,
      chatRoomId,
      familyId: invite.familyId,
      userId: user.id,
      joinedAt: now,
      status: 'active',
    });

    // 3. Mark invite as accepted
    await updateDoc(doc(db, 'familyInvites', invite.id), {
      status: 'accepted',
      updatedAt: now,
    });

    // 4. Log activity
    await this.logActivity({
      familyId: invite.familyId,
      actorUserId: user.id,
      actorName: user.name,
      action: `joined the family via invite code`,
      entityType: 'member',
      entityId: membershipId,
    });

    // 5. Send notification to inviter
    try {
      const notifDocRef = doc(collection(db, 'notifications'));
      await setDoc(notifDocRef, {
        id: notifDocRef.id,
        recipientUserId: invite.invitedBy,
        familyId: invite.familyId,
        type: 'member_joined',
        title: 'New Member Joined!',
        message: `${user.name} accepted your invitation and joined ${invite.familyName}.`,
        relatedEntityType: 'family',
        relatedEntityId: invite.familyId,
        createdAt: now,
        readAt: null,
      });
    } catch (err) {
      console.warn("Could not send join notification:", err);
    }

    return { family: familyData, membership: membershipData };
  }

  /**
   * Updates a member's role (owner/admin action)
   */
  async updateMemberRole(params: {
    familyId: string;
    targetUserId: string;
    newRole: Role;
    actor: User;
  }): Promise<void> {
    const membershipId = `${params.familyId}_${params.targetUserId}`;
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'familyMembers', membershipId), {
      role: params.newRole,
      updatedAt: now,
    });

    await this.logActivity({
      familyId: params.familyId,
      actorUserId: params.actor.id,
      actorName: params.actor.name,
      action: `updated member's role to ${params.newRole.toUpperCase()}`,
      entityType: 'member',
      entityId: membershipId,
    });
  }

  /**
   * Removes or deactivates a member from a family
   */
  async removeMember(params: {
    familyId: string;
    targetUserId: string;
    targetUserName: string;
    actor: User;
  }): Promise<void> {
    const membershipId = `${params.familyId}_${params.targetUserId}`;
    const now = new Date().toISOString();

    await updateDoc(doc(db, 'familyMembers', membershipId), {
      status: 'removed',
      updatedAt: now,
    });

    await this.logActivity({
      familyId: params.familyId,
      actorUserId: params.actor.id,
      actorName: params.actor.name,
      action: `removed ${params.targetUserName} from the family`,
      entityType: 'member',
      entityId: membershipId,
    });

    // Notify removed member
    try {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        recipientUserId: params.targetUserId,
        familyId: params.familyId,
        type: 'member_removed',
        title: 'Family Membership Update',
        message: `Your membership in this family space was removed by ${params.actor.name}.`,
        createdAt: now,
        readAt: null,
      });
    } catch {
      // Ignore notification failure
    }
  }

  /**
   * Logs a family audit event in Firestore
   */
  async logActivity(params: {
    familyId: string;
    actorUserId: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId?: string;
  }): Promise<void> {
    try {
      const actRef = doc(collection(db, 'activityLogs'));
      const log: ActivityLog = {
        id: actRef.id,
        familyId: params.familyId,
        actorUserId: params.actorUserId,
        actorName: params.actorName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(actRef, log);
    } catch (err) {
      console.warn("Could not log activity:", err);
    }
  }

  /**
   * Subscribes to real-time activity logs for a family
   */
  subscribeActivityLogs(
    familyId: string,
    callback: (logs: ActivityLog[]) => void
  ): () => void {
    const q = query(
      collection(db, 'activityLogs'),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: ActivityLog[] = [];
        snap.forEach(d => list.push(d.data() as ActivityLog));
        callback(list);
      },
      (err) => {
        console.warn("Error listening to activity logs:", err);
      }
    );
  }
}

export const familyService = new FamilyService();
