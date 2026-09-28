import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Family,
  User,
  FamilyExpense,
  FamilyBill,
  MedicalRecord,
  UrgentItem,
  FamilyPlan,
  FamilyNote,
  ActivityLog,
  FamilyNavRoute,
} from '../types';
import { familyService } from '../services/familyService';
import { useAuth } from './AuthContext';

interface FamilyContextType {
  family: Family;
  members: User[];
  currentRoute: FamilyNavRoute;
  setCurrentRoute: (route: FamilyNavRoute) => void;
  expenses: FamilyExpense[];
  bills: FamilyBill[];
  medicalRecords: MedicalRecord[];
  urgentItems: UrgentItem[];
  plans: FamilyPlan[];
  notes: FamilyNote[];
  activityLogs: ActivityLog[];
  addExpense: (expense: Omit<FamilyExpense, 'id' | 'familyId'>) => void;
  toggleBillPaid: (billId: string) => void;
  addUrgentItem: (title: string, description: string, severity?: UrgentItem['severity']) => void;
  resolveUrgentItem: (id: string) => void;
  addPlan: (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => void;
  addNote: (title: string, content: string, category?: FamilyNote['category']) => void;
  refreshFamilyData: () => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family>(() => familyService.getFamily());
  const [members, setMembers] = useState<User[]>(() => familyService.getMembers());
  // PRIMARY USER EXPERIENCE REQUIREMENT: Default route must be 'chat'!
  const [currentRoute, setCurrentRoute] = useState<FamilyNavRoute>('chat');

  const [expenses, setExpenses] = useState<FamilyExpense[]>(() => familyService.getExpenses());
  const [bills, setBills] = useState<FamilyBill[]>(() => familyService.getBills());
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(() => familyService.getMedicalRecords());
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>(() => familyService.getUrgentItems());
  const [plans, setPlans] = useState<FamilyPlan[]>(() => familyService.getPlans());
  const [notes, setNotes] = useState<FamilyNote[]>(() => familyService.getNotes());
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => familyService.getActivityLogs());

  const refreshFamilyData = () => {
    setFamily(familyService.getFamily());
    setMembers(familyService.getMembers());
    setExpenses(familyService.getExpenses());
    setBills(familyService.getBills());
    setMedicalRecords(familyService.getMedicalRecords());
    setUrgentItems(familyService.getUrgentItems());
    setPlans(familyService.getPlans());
    setNotes(familyService.getNotes());
    setActivityLogs(familyService.getActivityLogs());
  };

  const addExpense = (expense: Omit<FamilyExpense, 'id' | 'familyId'>) => {
    familyService.addExpense(expense);
    refreshFamilyData();
  };

  const toggleBillPaid = (billId: string) => {
    if (!user) return;
    familyService.toggleBillPaid(billId, user.id);
    refreshFamilyData();
  };

  const addUrgentItem = (title: string, description: string, severity: UrgentItem['severity'] = 'urgent') => {
    if (!user) return;
    familyService.addUrgentItem(title, description, user, severity);
    refreshFamilyData();
  };

  const resolveUrgentItem = (id: string) => {
    familyService.resolveUrgentItem(id);
    refreshFamilyData();
  };

  const addPlan = (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => {
    familyService.addPlan(plan);
    refreshFamilyData();
  };

  const addNote = (title: string, content: string, category: FamilyNote['category'] = 'general') => {
    if (!user) return;
    familyService.addNote(title, content, user.name, category);
    refreshFamilyData();
  };

  return (
    <FamilyContext.Provider
      value={{
        family,
        members,
        currentRoute,
        setCurrentRoute,
        expenses,
        bills,
        medicalRecords,
        urgentItems,
        plans,
        notes,
        activityLogs,
        addExpense,
        toggleBillPaid,
        addUrgentItem,
        resolveUrgentItem,
        addPlan,
        addNote,
        refreshFamilyData,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
};
