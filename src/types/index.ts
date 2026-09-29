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

/**
 * Family Member Profile
 * Represents an individual family member (adult, child, elderly, relative)
 * Supports both registered users (userId present) and profile-only members (userId null)
 */
export interface FamilyMemberProfile {
  id: string;
  familyId: string;
  userId?: string | null; // Optional: connects to registered user account if one exists
  fullName: string;
  nickname?: string;
  profileImage?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string; // YYYY-MM-DD
  relationship: string; // 'Father', 'Mother', 'Son', 'Daughter', 'Husband', 'Wife', 'Brother', 'Sister', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Cousin', etc.
  phone?: string;
  email?: string;
  address?: string;
  isChild?: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived';
}

/**
 * Child Profile & School Management
 */
export interface Child {
  id: string;
  familyId: string;
  memberProfileId?: string; // Optional link to FamilyMemberProfile
  fullName: string;
  nickname?: string;
  photo?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string; // YYYY-MM-DD
  bloodGroup?: string;
  relationship: string;
  phone?: string;

  // School Information
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  classGrade?: string; // e.g. "Class 5", "Grade 8"
  section?: string; // e.g. "A", "Blue"
  rollNumber?: string;
  admissionNumber?: string;
  teacherName?: string;
  teacherPhone?: string;
  schoolTiming?: string; // e.g. "8:00 AM - 1:30 PM"

  // School Fees
  tuitionFee: number;
  transportFee: number;
  otherFee: number;
  totalMonthlyFee: number; // automatically calculated sum
  feeDueDate?: number | string; // e.g. 5th of every month
  feeNotes?: string;

  // Emergency & Contact
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  emergencyContactAltPhone?: string;
  emergencyNotes?: string;

  generalNotes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChildGuardian {
  id: string;
  childId: string;
  familyId: string;
  memberId?: string; // Link to FamilyMemberProfile or User
  memberName: string;
  relationship: string; // 'Father', 'Mother', 'Guardian', etc.
  phone?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface SchoolFeePayment {
  id: string;
  childId: string;
  familyId: string;
  month: string; // e.g. "September"
  year: number; // e.g. 2026
  amount: number;
  paymentDate: string;
  paidBy: string;
  paidByUserId?: string;
  status: 'Paid' | 'Pending' | 'Partial';
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface ChildDocument {
  id: string;
  childId: string;
  familyId: string;
  title: string;
  docType: 'admission' | 'result_card' | 'fee_receipt' | 'school_letter' | 'certificate' | 'other';
  url: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}

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
  | 'urgent_need'
  | 'note_assigned'
  | 'note_reminder'
  | 'note_completed'
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

/**
 * Step 5: Complete Medical Management Domain
 */
export interface MedicalProfile {
  id: string;
  familyId: string;
  personId: string; // memberProfileId or childId
  personName: string;
  personType: 'adult' | 'child' | 'elderly';
  photo?: string;
  bloodGroup: string;
  height?: string; // e.g. "175 cm" or "5 ft 9 in"
  weight?: string; // e.g. "70 kg"
  importantAlert?: string; // ⚠️ High visibility alert e.g. "Severe Penicillin Allergy"
  surgeries?: string;
  medicalHistory?: string;
  emergencyNotes?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Allergy {
  id: string;
  profileId: string;
  familyId: string;
  name: string;
  type: 'Medication' | 'Food' | 'Environmental' | 'Other';
  severity: 'Mild' | 'Moderate' | 'Severe';
  reaction?: string;
  isSevereAlert: boolean;
  notes?: string;
  createdAt: string;
}

export interface MedicalCondition {
  id: string;
  profileId: string;
  familyId: string;
  name: string;
  dateDiagnosed?: string;
  status: 'Active' | 'Controlled' | 'Resolved' | 'Historical';
  doctor?: string;
  notes?: string;
  createdAt: string;
}

export interface Medicine {
  id: string;
  profileId: string;
  familyId: string;
  name: string;
  strength?: string; // e.g. "500 mg"
  form?: string; // e.g. "Tablet", "Syrup", "Injection", "Drops"
  dose: string; // e.g. "1 tablet"
  frequency: string; // e.g. "Twice daily after meals"
  reminderTime?: string; // e.g. "08:00 AM, 08:00 PM"
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  status: 'Active' | 'Completed' | 'Stopped';
  notes?: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  profileId: string;
  familyId: string;
  name: string;
  specialty: string;
  hospitalClinic: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

export interface MedicalAppointment {
  id: string;
  profileId: string;
  familyId: string;
  personName: string;
  doctorName: string;
  hospitalClinic: string;
  date: string;
  time: string;
  appointmentType: string;
  reasonNotes?: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  reminderTime?: string;
  createdAt: string;
}

export interface MedicalDocument {
  id: string;
  profileId: string;
  familyId: string;
  title: string;
  category: 'Prescription' | 'Lab Report' | 'X-Ray' | 'Certificate' | 'Hospital Document' | 'Vaccination' | 'Other';
  fileName: string;
  fileSize: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  notes?: string;
}

/**
 * Step 5: Special Care Person System
 */
export interface SpecialCareProfile {
  id: string;
  familyId: string;
  personId: string;
  personName: string;
  personType: 'member' | 'child';
  photo?: string;
  careLevel: 'General Support' | 'Regular Assistance' | 'High Assistance';
  primaryCaregiverName: string;
  primaryCaregiverId?: string;
  primaryCaregiverPhone?: string;
  secondaryCaregiverName?: string;
  secondaryCaregiverPhone?: string;
  mobilityNeeds?: string;
  dietaryRequirements?: string;
  communicationPreferences?: string;
  careAlert?: string; // e.g. "Needs assistance when walking", "Do not leave alone"
  emergencyInstructions?: string;
  generalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareNeed {
  id: string;
  careProfileId: string;
  familyId: string;
  title: string;
  enabled: boolean;
  notes?: string;
}

export interface CareRoutine {
  id: string;
  careProfileId: string;
  familyId: string;
  title: string;
  time: string;
  repeatPattern?: string; // e.g. "Daily", "Morning", "Evening"
  notes?: string;
  enabled: boolean;
}

export interface CareTask {
  id: string;
  careProfileId: string;
  familyId: string;
  routineId?: string;
  title: string;
  time: string;
  status: 'Pending' | 'Completed' | 'Skipped';
  date: string; // YYYY-MM-DD
  completedBy?: string;
  completedAt?: string;
  notes?: string;
}

// Money & Bills (Step 6 Complete Family Expense System)
export type PaymentMethodType = 'Cash' | 'Bank' | 'Card' | 'Online' | 'Mobile Wallet' | 'Other';

export interface Expense {
  id: string;
  familyId: string;
  amount: number;
  amountMinor: number;
  currency: string;
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  expenseDate: string; // YYYY-MM-DD
  expenseTime?: string; // HH:MM
  monthKey: string; // YYYY-MM
  year: number;
  month: number;
  description: string;
  paidByMemberId?: string;
  paidByName: string;
  forMemberId?: string;
  forPersonName?: string;
  paymentMethod: PaymentMethodType;
  receiptPath?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  notes?: string;
  clientRequestId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface ExpenseCategory {
  id: string;
  familyId: string;
  name: string;
  icon: string;
  color?: string;
  active: boolean;
  isCustom?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FamilyBudget {
  id: string;
  familyId: string;
  year: number;
  month: number;
  monthKey: string;
  amount: number;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  monthKey: string;
  totalSpent: number;
  transactionCount: number;
  dailyAverage: number;
  averageTransaction: number;
  budgetAmount: number;
  remainingBudget: number;
  budgetUsagePercentage: number;
  budgetStatus: 'normal' | 'warning' | 'reached' | 'exceeded';
  largestExpense: Expense | null;
  categoryTotals: Array<{
    categoryId: string;
    categoryName: string;
    icon?: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  payerTotals: Array<{
    payerName: string;
    memberId?: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  personTotals: Array<{
    personName: string;
    memberId?: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  dailyTotals: Array<{
    date: string;
    dayLabel: string;
    amount: number;
    count: number;
  }>;
  paymentMethodTotals: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

export interface ExpenseFilter {
  dateRangePreset?: 'today' | 'this_week' | 'this_month' | 'last_month' | 'custom';
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paidByName?: string;
  forPersonName?: string;
  paymentMethod?: string;
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface MonthlyExpenseReport {
  familyName: string;
  currency: string;
  year: number;
  month: number;
  monthLabel: string;
  summary: ExpenseSummary;
  expenses: Expense[];
}

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

// Money & Bills (Step 7 Complete Bills Management System)
export type BillStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled';
export type BillFrequency = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'yearly' | 'custom';
export type BillAmountType = 'fixed' | 'variable';

export interface BillType {
  id: string;
  familyId: string;
  name: string; // Electricity, Gas, Water, Internet, Mobile / Phone, Rent, School, Insurance, Subscription, Other
  icon: string;
  color?: string;
  active: boolean;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillTemplate {
  id: string;
  familyId: string;
  billTypeId: string;
  billTypeName: string;
  billTypeIcon?: string;
  providerName: string;
  amountType: BillAmountType;
  defaultAmount: number;
  frequency: BillFrequency;
  customIntervalDays?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD (anchor date)
  accountNumberMasked?: string;
  accountNumberFull?: string;
  referenceNumber?: string;
  notes?: string;
  active: boolean; // false when paused
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  familyId: string;
  templateId?: string; // link to BillTemplate if recurring
  billTypeId: string;
  billTypeName: string;
  billTypeIcon?: string;
  providerName: string;
  amount: number;
  amountMinor: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  dueDate: string; // YYYY-MM-DD
  billingMonthKey: string; // YYYY-MM (e.g. '2026-10')
  status: BillStatus;
  accountNumberMasked?: string;
  accountNumberFull?: string;
  referenceNumber?: string;
  notes?: string;
  isRecurringInstance: boolean;
  frequency?: string;
  latestPaymentDate?: string;
  latestPaidBy?: string;
  receiptUrl?: string;
  documentUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
}

export interface BillPayment {
  id: string;
  billId: string;
  familyId: string;
  amount: number;
  amountMinor: number;
  paymentDate: string; // YYYY-MM-DD
  paidByMemberId?: string;
  paidByName: string;
  paymentMethod: PaymentMethodType;
  referenceNumber?: string;
  receiptPath?: string;
  receiptUrl?: string;
  receiptFileName?: string;
  linkedExpenseId?: string; // Section 46 optional link
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface BillDocument {
  id: string;
  billId: string;
  familyId: string;
  title: string;
  docType: 'bill' | 'receipt' | 'other';
  fileName: string;
  fileSize: number;
  url: string;
  storagePath: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface BillSummary {
  monthKey: string;
  monthLabel: string;
  totalExpected: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalCancelled: number;
  billCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  billsByType: Array<{
    billTypeId: string;
    billTypeName: string;
    icon?: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  todayBills: Bill[];
  upcomingBills: Bill[];
  overdueBills: Bill[];
}

export interface BillFilter {
  status?: 'all' | 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  billTypeId?: string;
  frequency?: 'all' | 'recurring' | 'onetime';
  searchQuery?: string;
  sortBy?: 'due_date' | 'amount' | 'recently_added' | 'status';
}

export interface MonthlyBillReport {
  familyName: string;
  currency: string;
  year: number;
  month: number;
  monthLabel: string;
  summary: BillSummary;
  bills: Bill[];
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

// -------------------------------------------------------------
// STEP 8: FAMILY NOTES + IMPORTANT NOTES + URGENT NEEDS + FAMILY INFORMATION CENTER
// -------------------------------------------------------------

export type NoteType = 'general' | 'important' | 'urgent' | 'information';
export type NotePriority = 'low' | 'normal' | 'high' | 'urgent';
export type NoteStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ReminderOption =
  | 'none'
  | 'at_due_time'
  | '1_day_before'
  | '2_days_before'
  | '3_days_before'
  | '1_week_before';

export interface NoteReminder {
  enabled: boolean;
  option: ReminderOption;
  targetDate?: string; // ISO date string computed from due date & offset
  notified?: boolean;
}

export interface NoteAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  storagePath: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface FamilyNote {
  id: string;
  familyId: string;
  type?: NoteType; // 'general' | 'important' | 'urgent' | 'information'
  title: string;
  description?: string;
  content?: string; // backwards compatibility alias for description
  categoryId?: string;
  categoryName?: string;
  category?: string; // backwards compatibility alias
  priority?: NotePriority; // 'low' | 'normal' | 'high' | 'urgent'
  status?: NoteStatus; // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminder?: NoteReminder;
  assignedToMemberId?: string;
  assignedToMemberName?: string;
  linkedPersonId?: string;
  linkedPersonName?: string;
  linkedPersonType?: 'member' | 'child';
  isPinned: boolean;
  pinnedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  attachments?: NoteAttachment[];
  notifyFamily?: boolean;
  notifyAssignedMember?: boolean;
  createdBy?: string;
  createdByName?: string;
  authorName?: string; // backwards compatibility alias for createdByName
  createdAt?: string;
  updatedAt: string;
  updatedBy?: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface NoteCategory {
  id: string;
  familyId: string;
  name: string;
  icon?: string;
  color?: string;
  active: boolean;
  isDefault?: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type FamilyInfoCategory =
  | 'House Information'
  | 'Important Contacts'
  | 'Emergency Information'
  | 'Utility Information'
  | 'Vehicle Information'
  | 'Travel Information'
  | 'Document References'
  | 'Other';

export interface FamilyInformation {
  id: string;
  familyId: string;
  title: string;
  value: string;
  description?: string;
  category: FamilyInfoCategory;
  contactName?: string;
  contactPhone?: string;
  contactRelationship?: string;
  linkedPersonId?: string;
  linkedPersonName?: string;
  linkedPersonType?: 'member' | 'child';
  visibility: 'family' | 'admins_only';
  attachments: NoteAttachment[];
  isPinned?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface NoteFilter {
  type?: 'all' | NoteType;
  category?: string;
  priority?: 'all' | NotePriority;
  status?: 'all' | NoteStatus;
  assignedToMemberId?: string;
  linkedPersonId?: string;
  dueDateRange?: 'all' | 'today' | 'upcoming_7' | 'upcoming_14' | 'upcoming_30' | 'overdue' | 'no_date';
  isPinned?: boolean;
  isArchived?: boolean;
  searchQuery?: string;
  sortBy?: 'recently_updated' | 'newest' | 'oldest' | 'due_date' | 'priority';
}

export interface NotesSummary {
  totalNotes: number;
  importantCount: number;
  urgentCount: number;
  pendingNeedsCount: number;
  dueTodayCount: number;
  overdueCount: number;
  completedCount: number;
  archivedCount: number;
  informationCount: number;
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
  | 'expenses'
  | 'bills'
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
