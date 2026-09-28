/**
 * FamilyHub Core Domain Types & Data Models
 * Real Firebase Firestore & Authentication Architecture
 */

export type Role = 'owner' | 'admin' | 'member';
export type MembershipStatus = 'active' | 'pending' | 'removed';

export interface User {
  id: string; // Firebase Auth UID
  name: string; // Display name
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  profileImage?: string;
  roleInFamily?: Role;
  status: 'online' | 'away' | 'offline';
  bio?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface Family {
  id: string;
  name: string;
  photo?: string;
  avatar?: string;
  inviteCode?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
  settings?: {
    allowMemberInvites?: boolean;
    currency?: string;
    emergencyNumber?: string;
  };
}

export interface FamilyMember {
  id: string; // Format: `${familyId}_${userId}`
  familyId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
  joinedAt: string;
  updatedAt?: string;
  userName?: string;
  userEmail?: string;
  userPhoto?: string;
}

export type FamilyMembership = FamilyMember;

export interface FamilyInvite {
  id: string;
  familyId: string;
  familyName: string;
  familyPhoto?: string;
  invitedBy: string;
  invitedByName?: string;
  inviteCode: string; // e.g. FAM-8K4P-29XQ
  email?: string;
  phone?: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
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
  type: 'family' | 'channel' | 'direct';
  topic?: string;
  isGeneral?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ChatMember {
  id: string;
  chatRoomId: string;
  familyId?: string;
  userId: string;
  joinedAt: string;
  status: 'active' | 'left';
}

export type NotificationType =
  | 'family_invitation'
  | 'invitation_accepted'
  | 'member_joined'
  | 'member_removed'
  | 'new_message'
  | 'expense_added'
  | 'bill_due'
  | 'medical_update'
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
  pinHash?: string;
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
