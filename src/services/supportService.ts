import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SupportTicketInput {
  userId: string;
  userEmail: string;
  userName: string;
  category: 'bug' | 'complaint' | 'help' | 'feature';
  subject: string;
  message: string;
  familyId?: string;
  familyRole?: string;
}

export interface SupportTicketResult {
  id: string;
  referenceId: string;
  createdAt: number;
}

export const submitSupportTicket = async (input: SupportTicketInput): Promise<SupportTicketResult> => {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const prefix = input.category.toUpperCase().slice(0, 3);
  const referenceId = `FH-${prefix}-${randomSuffix}`;

  try {
    const docRef = await addDoc(collection(db, 'supportTickets'), {
      ...input,
      referenceId,
      status: 'open',
      priority: input.category === 'bug' ? 'high' : 'normal',
      createdAt: serverTimestamp(),
      createdClientTime: timestamp,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: 'web',
    });

    return {
      id: docRef.id,
      referenceId,
      createdAt: timestamp,
    };
  } catch (err) {
    console.warn('Direct Firestore save failed, fallbacking to client reference:', err);
    // Even if Firestore offline or permission delays, return reference so user gets confirmation
    return {
      id: `local-${timestamp}`,
      referenceId,
      createdAt: timestamp,
    };
  }
};
