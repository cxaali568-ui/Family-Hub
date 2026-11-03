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

const STORAGE_KEY = 'familyhub_support_submissions';

interface RecentSubmission {
  timestamp: number;
  subjectHash: string;
}

export const checkSupportSubmissionEligibility = (userId: string, subject: string, message: string): { eligible: boolean; reason?: string } => {
  if (!userId) {
    return { eligible: false, reason: 'You must be signed in to submit a support request.' };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    const history: RecentSubmission[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;

    // Filter to last hour
    const recentInHour = history.filter(item => item.timestamp > oneHourAgo);

    // Limit check: 3 tickets per hour
    if (recentInHour.length >= 3) {
      return {
        eligible: false,
        reason: 'Submission limit reached: You can submit up to 3 tickets per hour. Please wait before submitting another request.',
      };
    }

    // Duplicate check
    const currentHash = `${subject.trim().toLowerCase()}:::${message.trim().toLowerCase()}`;
    const duplicate = recentInHour.find(item => item.subjectHash === currentHash && item.timestamp > fifteenMinsAgo);
    if (duplicate) {
      return {
        eligible: false,
        reason: 'Duplicate request detected: A ticket with identical subject and message was submitted recently. Please allow time for response.',
      };
    }

    return { eligible: true };
  } catch {
    return { eligible: true };
  }
};

const recordSubmission = (userId: string, subject: string, message: string) => {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    const history: RecentSubmission[] = raw ? JSON.parse(raw) : [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const cleaned = history.filter(item => item.timestamp > oneHourAgo);
    const hash = `${subject.trim().toLowerCase()}:::${message.trim().toLowerCase()}`;
    cleaned.push({ timestamp: Date.now(), subjectHash: hash });
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(cleaned));
  } catch (err) {
    console.warn('Failed to record submission in local storage:', err);
  }
};

export const submitSupportTicket = async (input: SupportTicketInput): Promise<SupportTicketResult> => {
  if (!input.userId) {
    throw new Error('Authentication required to submit support requests.');
  }

  const eligibility = checkSupportSubmissionEligibility(input.userId, input.subject, input.message);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason || 'Submission not eligible at this time.');
  }

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

    recordSubmission(input.userId, input.subject, input.message);

    return {
      id: docRef.id,
      referenceId,
      createdAt: timestamp,
    };
  } catch (err) {
    console.warn('Direct Firestore save failed, fallbacking to client reference:', err);
    recordSubmission(input.userId, input.subject, input.message);
    return {
      id: `local-${timestamp}`,
      referenceId,
      createdAt: timestamp,
    };
  }
};
