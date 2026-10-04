import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FamilyAIConversation, AIMessage, User } from '../types';
import { familyService } from './familyService';

export const familyAIService = {
  subscribeFamilyAIConversations(
    familyId: string,
    callback: (conversations: FamilyAIConversation[]) => void
  ) {
    if (!familyId) {
      callback([]);
      return () => {};
    }

    const colRef = collection(db, 'families', familyId, 'aiConversations');
    const q = query(colRef, orderBy('updatedAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const conversations: FamilyAIConversation[] = [];
        snapshot.forEach((docSnap) => {
          conversations.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<FamilyAIConversation, 'id'>),
          });
        });
        callback(conversations);
      },
      (error) => {
        console.warn('[familyAIService] Snapshot error:', error);
        callback([]);
      }
    );
  },

  async createFamilyAIConversation(
    familyId: string,
    title: string,
    initialMessages: AIMessage[],
    currentUser: User
  ): Promise<FamilyAIConversation> {
    const colRef = collection(db, 'families', familyId, 'aiConversations');
    const newDoc = doc(colRef);
    const now = new Date().toISOString();

    const conversationData: FamilyAIConversation = {
      id: newDoc.id,
      familyId,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      title: title || 'New Family Chat',
      messages: initialMessages || [],
      provider: 'auto',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(newDoc, conversationData);

    await familyService.logActivity({
      familyId,
      actorUserId: currentUser.id,
      actorName: currentUser.name,
      action: 'started an AI assistant conversation',
      entityType: 'general',
    });

    return conversationData;
  },

  async updateFamilyAIConversation(
    familyId: string,
    conversationId: string,
    updates: Partial<FamilyAIConversation>
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'aiConversations', conversationId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteFamilyAIConversation(
    familyId: string,
    conversationId: string,
    currentUser?: User
  ): Promise<void> {
    const docRef = doc(db, 'families', familyId, 'aiConversations', conversationId);
    await deleteDoc(docRef);

    if (currentUser) {
      await familyService.logActivity({
        familyId,
        actorUserId: currentUser.id,
        actorName: currentUser.name,
        action: 'deleted an AI assistant conversation',
        entityType: 'general',
      });
    }
  },
};
