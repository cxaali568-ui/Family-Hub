import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SupportTicket, SupportMessage, GeneratedBugReport, SupportCategory, SupportPriority, SupportStatus } from '../types/support';

export interface SupportTicketInput {
  userId: string;
  userEmail: string;
  userName: string;
  category: SupportCategory;
  subject: string;
  message: string;
  familyId?: string;
  familyRole?: string;
  priority?: SupportPriority;
  expectedBehavior?: string;
  actualBehavior?: string;
  stepsToReproduce?: string;
  attemptedSteps?: string;
  aiSummary?: string;
  errorMessage?: string;
  attachments?: Array<{ name: string; url: string; size?: number }>;
}

export interface SupportTicketResult {
  id: string;
  referenceId: string;
  createdAt: number;
  ticket?: SupportTicket;
}

const STORAGE_KEY = 'familyhub_support_submissions';

interface RecentSubmission {
  timestamp: number;
  subjectHash: string;
}

export const checkSupportSubmissionEligibility = (
  userId: string,
  subject: string,
  message: string
): { eligible: boolean; reason?: string } => {
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

    // Limit check: 5 tickets per hour for responsive debugging
    if (recentInHour.length >= 5) {
      return {
        eligible: false,
        reason: 'Submission limit reached: You can submit up to 5 tickets per hour. Please wait before submitting another request.',
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

/**
 * Submit or create a new support ticket.
 * Saves to Firestore AND notifies Express backend for email & WhatsApp distribution to Admin.
 */
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
  const prefix = (input.category || 'BUG').toUpperCase().slice(0, 3);
  const referenceId = `FH-${prefix}-${randomSuffix}`;

  const initialMessage: SupportMessage = {
    id: `msg-${timestamp}`,
    senderId: input.userId,
    senderName: input.userName || 'Family Member',
    senderEmail: input.userEmail,
    senderRole: 'user',
    text: input.message,
    attachments: input.attachments,
    createdAt: timestamp,
  };

  const fullTicket: SupportTicket = {
    id: `ticket-${timestamp}-${randomSuffix}`,
    referenceId,
    userId: input.userId,
    userName: input.userName || 'Family Member',
    userEmail: input.userEmail || '',
    familyId: input.familyId || 'global',
    category: input.category || 'bug',
    subject: input.subject,
    description: input.message,
    status: 'new',
    priority: input.priority || (input.category === 'bug' ? 'high' : 'medium'),
    expectedBehavior: input.expectedBehavior,
    actualBehavior: input.actualBehavior,
    stepsToReproduce: input.stepsToReproduce,
    attemptedSteps: input.attemptedSteps,
    aiSummary: input.aiSummary,
    errorMessage: input.errorMessage,
    attachments: input.attachments || [],
    deviceInfo: {
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en',
    },
    messages: [initialMessage],
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // 1. Save to Firestore (isolated to authenticated user under client rules)
  try {
    const docRef = await addDoc(collection(db, 'supportTickets'), {
      ...input,
      referenceId,
      status: fullTicket.status,
      priority: fullTicket.priority,
      createdAt: serverTimestamp(),
      createdClientTime: timestamp,
      fullTicketJson: JSON.stringify(fullTicket),
      userAgent: fullTicket.deviceInfo?.userAgent || '',
      platform: 'web',
    });
    fullTicket.id = docRef.id;
  } catch (err) {
    console.warn('Firestore direct write notice (proceeding with server endpoint):', err);
  }

  // 2. Notify server-side handler for email dispatch to cxaali568@gmail.com and WhatsApp
  try {
    const serverRes = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullTicket),
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.ticket) {
        fullTicket.id = data.ticket.id || fullTicket.id;
      }
    }
  } catch (serverErr) {
    console.warn('Failed to register with backend support registry:', serverErr);
  }

  recordSubmission(input.userId, input.subject, input.message);

  return {
    id: fullTicket.id,
    referenceId,
    createdAt: timestamp,
    ticket: fullTicket,
  };
};

/**
 * Fetch tickets for current user or for Family Admin
 */
export const fetchSupportTickets = async (params: {
  familyId?: string;
  userId?: string;
  userEmail?: string;
  isSuperAdmin?: boolean;
}): Promise<SupportTicket[]> => {
  const tickets: SupportTicket[] = [];

  // Try server API first
  try {
    const url = new URL('/api/support/tickets', window.location.origin);
    if (params.familyId) url.searchParams.set('familyId', params.familyId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.userEmail) url.searchParams.set('userEmail', params.userEmail);
    if (params.isSuperAdmin) url.searchParams.set('isSuperAdmin', 'true');

    const response = await fetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.tickets)) {
        tickets.push(...data.tickets);
      }
    }
  } catch (err) {
    console.warn('Failed to load tickets from server API:', err);
  }

  // Also query Firestore for user's own tickets (works for non-admin and admin alike)
  if (params.userId) {
    try {
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', params.userId)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.fullTicketJson) {
          try {
            const parsed: SupportTicket = JSON.parse(d.fullTicketJson);
            parsed.id = docSnap.id;
            // Merge if not already in tickets
            if (!tickets.some(t => t.id === parsed.id || t.referenceId === parsed.referenceId)) {
              tickets.push(parsed);
            }
          } catch {}
        } else if (!tickets.some(t => t.id === docSnap.id || t.referenceId === d.referenceId)) {
          tickets.push({
            id: docSnap.id,
            referenceId: d.referenceId || `FH-${docSnap.id.slice(0, 6)}`,
            userId: d.userId,
            userName: d.userName || 'Member',
            userEmail: d.userEmail || '',
            familyId: d.familyId || 'global',
            category: d.category || 'bug',
            subject: d.subject || 'Support Ticket',
            description: d.message || '',
            status: d.status || 'open',
            priority: d.priority || 'medium',
            messages: [
              {
                id: `msg-${d.createdClientTime || Date.now()}`,
                senderId: d.userId,
                senderName: d.userName || 'Member',
                senderRole: 'user',
                text: d.message || '',
                createdAt: d.createdClientTime || Date.now(),
              },
            ],
            createdAt: d.createdClientTime || Date.now(),
            updatedAt: d.createdClientTime || Date.now(),
          });
        }
      });
    } catch (err) {
      console.warn('Firestore tickets query note:', err);
    }
  }

  // Sort newest first
  tickets.sort((a, b) => b.updatedAt - a.updatedAt);
  return tickets;
};

/**
 * Add a reply to a support ticket
 */
export const postTicketReply = async (params: {
  ticketId: string;
  message: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole: 'user' | 'admin';
}): Promise<{ success: boolean; message?: SupportMessage }> => {
  try {
    const res = await fetch(`/api/support/tickets/${params.ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to post reply');
    return await res.json();
  } catch (err: any) {
    console.error('Error posting ticket reply:', err);
    throw err;
  }
};

/**
 * Update ticket status or priority (Admin action or user reopen)
 */
export const updateTicketStatus = async (
  ticketId: string,
  updates: { status?: SupportStatus; priority?: SupportPriority }
): Promise<boolean> => {
  try {
    const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update ticket status:', err);
    return false;
  }
};

/**
 * Call server AI troubleshooting agent
 */
export const requestAITroubleshoot = async (params: {
  messages: Array<{ role: string; content: string }>;
  userProblem?: string;
  userContext?: any;
}): Promise<{ reply: string; needsFeedback: boolean }> => {
  try {
    const res = await fetch('/api/support/ai-troubleshoot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Diagnostic server unavailable');
    return await res.json();
  } catch (err: any) {
    return {
      reply: 'Our AI diagnostic agent is currently warming up. Please check the step-by-step FAQ articles below or submit a ticket directly to our Admin team.',
      needsFeedback: false,
    };
  }
};

/**
 * Generate structured bug report from AI troubleshooting conversation
 */
export const generateAIBugReport = async (params: {
  conversation: Array<{ role: string; content: string }>;
  userContext?: any;
}): Promise<GeneratedBugReport> => {
  try {
    const res = await fetch('/api/support/ai-generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Report generation failed');
    const data = await res.json();
    return data.report;
  } catch (err) {
    return {
      title: 'FamilyHub Technical Issue',
      category: 'bug',
      priority: 'high',
      description: 'Issue reported following AI troubleshooting session.',
      expectedBehavior: 'Feature should operate normally.',
      actualBehavior: 'Issue encountered during app usage.',
      stepsToReproduce: '1. Open FamilyHub\n2. Navigate to feature\n3. Observe problem',
      attemptedSteps: 'Reviewed self-service guidance.',
      aiSummary: 'User requested administrative ticket submission.',
    };
  }
};

/**
 * Get server integration status (Email & WhatsApp configuration)
 */
export const getSupportIntegrationStatus = async (): Promise<{
  adminEmail: string;
  email: { configured: boolean; provider: string; recipient: string };
  whatsapp: { configured: boolean; recipient: string };
}> => {
  try {
    const res = await fetch('/api/support/status');
    if (res.ok) return await res.json();
  } catch {}
  return {
    adminEmail: 'cxaali568@gmail.com',
    email: { configured: false, provider: 'None', recipient: 'cxaali568@gmail.com' },
    whatsapp: { configured: false, recipient: 'Unconfigured' },
  };
};
