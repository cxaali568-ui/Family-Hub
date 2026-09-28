/**
 * FamilyHub Core Domain Types & Data Models
 * Designed for production compatibility with Firebase Firestore or PostgreSQL
 */

export type Role = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  roleInFamily: Role;
  status: 'online' | 'away' | 'offline';
  bio?: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    allowMemberInvites: boolean;
    currency: string;
    emergencyNumber?: string;
  };
}

export interface FamilyMembership {
  id: string;
  familyId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: 'image' | 'document' | 'audio' | 'receipt';
  fileSize: number; // in bytes
  url: string;
  previewUrl?: string;
}

export interface Reaction {
  emoji: string;
  userIds: string[];
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  deletedAt?: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  isPinned?: boolean;
  readBy?: string[]; // userIds who have read this
}

export interface ChatRoom {
  id: string;
  familyId: string;
  name: string;
  topic?: string;
  isGeneral: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'new_message'
  | 'expense_added'
  | 'bill_due'
  | 'medical_update'
  | 'new_photo'
  | 'new_note'
  | 'urgent_item'
  | 'family_event'
  | 'system';

export interface AppNotification {
  id: string;
  recipientUserId: string;
  familyId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: string;
  readAt?: string | null;
}

export interface ActivityLog {
  id: string;
  actorUserId: string;
  actorName: string;
  familyId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Medical Profiles & Care
export interface MedicalRecord {
  id: string;
  familyId: string;
  memberId: string;
  memberName: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  medications: { name: string; dosage: string; frequency: string }[];
  primaryDoctor?: { name: string; phone: string; clinic: string };
  lastCheckupDate?: string;
  notes?: string;
}

// Money & Bills
export interface FamilyExpense {
  id: string;
  familyId: string;
  title: string;
  amount: number;
  paidByUserId: string;
  paidByName: string;
  category: 'Groceries' | 'Utilities' | 'Education' | 'Healthcare' | 'Home' | 'Dining' | 'Other';
  date: string;
  notes?: string;
}

export interface FamilyBill {
  id: string;
  familyId: string;
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid: boolean;
  paidDate?: string;
  paidByUserId?: string;
  recurringMonthly: boolean;
}

// Urgent Items & Emergencies
export interface UrgentItem {
  id: string;
  familyId: string;
  title: string;
  description: string;
  severity: 'urgent' | 'critical' | 'alert';
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

// Plans & Calendar
export interface FamilyPlan {
  id: string;
  familyId: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  category: 'gathering' | 'school' | 'doctor' | 'celebration' | 'chore';
  attendees: string[];
}

// Notes
export interface FamilyNote {
  id: string;
  familyId: string;
  title: string;
  content: string;
  category: 'grocery_list' | 'recipe' | 'house_rules' | 'general';
  isPinned: boolean;
  updatedAt: string;
  authorName: string;
}

// -------------------------------------------------------------
// PERSONAL SPACE - STRICTLY PRIVATE PER USER
// -------------------------------------------------------------
export interface PersonalProfile {
  ownerId: string;
  isLockEnabled: boolean;
  pinHash?: string; // Simulated secure hash
  autoLockMinutes: number;
}

export interface PersonalExpense {
  id: string;
  ownerId: string; // Boundary: strictly current user
  title: string;
  amount: number;
  category: 'Personal' | 'Work' | 'Tech' | 'Subscription' | 'Dining' | 'Other';
  date: string;
}

export interface PersonalTask {
  id: string;
  ownerId: string;
  title: string;
  type: 'school' | 'work' | 'personal' | 'daily_need';
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PersonalNote {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  category: 'journal' | 'private_idea' | 'study_notes' | 'passwords';
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

// Navigation structure
export type FamilyNavRoute =
  | 'chat'
  | 'family'
  | 'money'
  | 'medical'
  | 'plans'
  | 'photos'
  | 'documents'
  | 'notes'
  | 'urgent'
  | 'notifications'
  | 'personal'
  | 'settings';

export type PersonalNavRoute =
  | 'dashboard'
  | 'expenses'
  | 'school_work'
  | 'ai_chat'
  | 'photos'
  | 'documents'
  | 'notebook'
  | 'daily_needs'
  | 'plans';
