import {
  Family,
  FamilyExpense,
  FamilyBill,
  MedicalRecord,
  UrgentItem,
  FamilyPlan,
  FamilyNote,
  User,
  ActivityLog,
} from '../types';
import {
  INITIAL_FAMILY,
  INITIAL_USERS,
  INITIAL_EXPENSES,
  INITIAL_BILLS,
  INITIAL_MEDICAL,
  INITIAL_URGENT,
  INITIAL_PLANS,
  INITIAL_NOTES,
  INITIAL_ACTIVITY_LOGS,
} from './mockData';

class FamilyService {
  private family: Family = { ...INITIAL_FAMILY };
  private members: User[] = [...INITIAL_USERS];
  private expenses: FamilyExpense[] = [...INITIAL_EXPENSES];
  private bills: FamilyBill[] = [...INITIAL_BILLS];
  private medicalRecords: MedicalRecord[] = [...INITIAL_MEDICAL];
  private urgentItems: UrgentItem[] = [...INITIAL_URGENT];
  private plans: FamilyPlan[] = [...INITIAL_PLANS];
  private notes: FamilyNote[] = [...INITIAL_NOTES];
  private activityLogs: ActivityLog[] = [...INITIAL_ACTIVITY_LOGS];

  getFamily(): Family {
    return { ...this.family };
  }

  updateFamilyName(name: string): void {
    this.family.name = name;
    this.family.updatedAt = new Date().toISOString();
  }

  getMembers(): User[] {
    return [...this.members];
  }

  addMember(name: string, email: string, role: 'admin' | 'member'): User {
    const newMember: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
      roleInFamily: role,
      status: 'offline',
      createdAt: new Date().toISOString(),
    };
    this.members.push(newMember);
    this.logActivity(newMember.id, newMember.name, `joined ${this.family.name}`, 'member');
    return newMember;
  }

  // Expenses & Bills
  getExpenses(): FamilyExpense[] {
    return [...this.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  addExpense(params: Omit<FamilyExpense, 'id' | 'familyId'>): FamilyExpense {
    const newExpense: FamilyExpense = {
      id: `exp-${Date.now()}`,
      familyId: this.family.id,
      ...params,
    };
    this.expenses.unshift(newExpense);
    this.logActivity(params.paidByUserId, params.paidByName, `added expense "${params.title}" ($${params.amount.toFixed(2)})`, 'expense', newExpense.id);
    return newExpense;
  }

  getBills(): FamilyBill[] {
    return [...this.bills];
  }

  toggleBillPaid(billId: string, userId: string): void {
    const bill = this.bills.find(b => b.id === billId);
    if (bill) {
      bill.isPaid = !bill.isPaid;
      if (bill.isPaid) {
        bill.paidDate = new Date().toISOString().split('T')[0];
        bill.paidByUserId = userId;
      } else {
        bill.paidDate = undefined;
        bill.paidByUserId = undefined;
      }
    }
  }

  // Medical
  getMedicalRecords(): MedicalRecord[] {
    return [...this.medicalRecords];
  }

  updateMedicalRecord(record: MedicalRecord): void {
    const index = this.medicalRecords.findIndex(m => m.id === record.id);
    if (index !== -1) {
      this.medicalRecords[index] = record;
    } else {
      this.medicalRecords.push(record);
    }
  }

  // Urgent Items
  getUrgentItems(): UrgentItem[] {
    return [...this.urgentItems].filter(u => !u.resolved);
  }

  addUrgentItem(title: string, description: string, user: User, severity: 'urgent' | 'critical' | 'alert' = 'urgent'): UrgentItem {
    const item: UrgentItem = {
      id: `urg-${Date.now()}`,
      familyId: this.family.id,
      title,
      description,
      severity,
      createdByUserId: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    this.urgentItems.unshift(item);
    this.logActivity(user.id, user.name, `reported urgent item: ${title}`, 'urgent', item.id);
    return item;
  }

  resolveUrgentItem(id: string): void {
    const item = this.urgentItems.find(u => u.id === id);
    if (item) {
      item.resolved = true;
      item.resolvedAt = new Date().toISOString();
    }
  }

  // Plans
  getPlans(): FamilyPlan[] {
    return [...this.plans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  addPlan(plan: Omit<FamilyPlan, 'id' | 'familyId'>): FamilyPlan {
    const newPlan: FamilyPlan = {
      id: `plan-${Date.now()}`,
      familyId: this.family.id,
      ...plan,
    };
    this.plans.push(newPlan);
    return newPlan;
  }

  // Notes
  getNotes(): FamilyNote[] {
    return [...this.notes];
  }

  addNote(title: string, content: string, authorName: string, category: FamilyNote['category'] = 'general'): FamilyNote {
    const note: FamilyNote = {
      id: `note-${Date.now()}`,
      familyId: this.family.id,
      title,
      content,
      category,
      isPinned: false,
      updatedAt: new Date().toISOString(),
      authorName,
    };
    this.notes.unshift(note);
    return note;
  }

  // Activity Logs
  getActivityLogs(): ActivityLog[] {
    return [...this.activityLogs];
  }

  private logActivity(actorUserId: string, actorName: string, action: string, entityType: string, entityId?: string) {
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      actorUserId,
      actorName,
      familyId: this.family.id,
      action,
      entityType,
      entityId,
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.unshift(log);
  }
}

export const familyService = new FamilyService();
