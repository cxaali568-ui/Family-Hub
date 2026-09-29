import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Family,
  FamilyMember,
  FamilyInvite,
  Role,
  FamilyNavRoute,
  FamilyExpense,
  FamilyBill,
  MedicalRecord,
  UrgentItem,
  FamilyPlan,
  FamilyNote,
  ActivityLog,
} from '../types';
import { familyService } from '../services/familyService';
import { useAuth } from './AuthContext';
import { INITIAL_EXPENSES, INITIAL_BILLS, INITIAL_MEDICAL, INITIAL_PLANS, INITIAL_NOTES } from '../services/mockData';

export interface FamilyPermissions {
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canInvite: boolean;
  canManageSettings: boolean;
}

interface FamilyContextType {
  family: Family | null;
  currentFamily: Family | null;
  currentFamilyId: string | null;
  familyMembership: FamilyMember | null;
  familyRole: Role | null;
  familyPermissions: FamilyPermissions;
  userFamilies: Array<{ family: Family; membership: FamilyMember }>;
  members: FamilyMember[];
  loadingFamilies: boolean;
  hasNoFamily: boolean;
  currentRoute: FamilyNavRoute;
  setCurrentRoute: (route: FamilyNavRoute) => void;
  switchFamily: (familyId: string) => void;
  createFamily: (name: string, photo?: string) => Promise<Family>;
  inspectInviteCode: (code: string) => Promise<FamilyInvite>;
  joinFamilyWithCode: (code: string) => Promise<{ family: Family; membership: FamilyMember }>;
  generateInvite: (role?: 'admin' | 'member', email?: string) => Promise<FamilyInvite>;
  updateMemberRole: (targetUserId: string, newRole: Role) => Promise<void>;
  removeMember: (targetUserId: string, targetUserName: string) => Promise<void>;
  activityLogs: ActivityLog[];

  // Data helpers for modules preserved from Step 1
  expenses: FamilyExpense[];
  bills: FamilyBill[];
  medicalRecords: MedicalRecord[];
  urgentItems: UrgentItem[];
  plans: FamilyPlan[];
  notes: FamilyNote[];
  addExpense: (expense: Omit<FamilyExpense, 'id' | 'familyId'>) => void;
  toggleBillPaid: (billId: string) => void;
  addUrgentItem: (title: string, description: string, severity?: UrgentItem['severity']) => void;
  resolveUrgentItem: (id: string) => void;
  addPlan: (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => void;
  addNote: (title: string, content: string, category?: FamilyNote['category']) => void;
  refreshFamilyData: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [userFamilies, setUserFamilies] = useState<Array<{ family: Family; membership: FamilyMember }>>([]);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembership, setFamilyMembership] = useState<FamilyMember | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState<boolean>(true);

  // PRIMARY USER EXPERIENCE REQUIREMENT: Default route is 'chat', with support for direct URLs e.g. /family/expenses
  const [currentRoute, setCurrentRouteState] = useState<FamilyNavRoute>(() => {
    try {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/expenses') || hash.includes('expenses')) return 'expenses';
      if (path.includes('/family') || hash.includes('family') || path.includes('/members')) return 'family';
      if (path.includes('/medical') || hash.includes('medical')) return 'medical';
      if (path.includes('/plans') || hash.includes('plans')) return 'plans';
      if (path.includes('/notes') || hash.includes('notes')) return 'notes';
      if (path.includes('/personal') || hash.includes('personal')) return 'personal';
    } catch {}
    return 'chat';
  });

  const setCurrentRoute = (route: FamilyNavRoute) => {
    setCurrentRouteState(route);
    try {
      if (route === 'expenses') {
        window.history.pushState(null, '', '/family/expenses');
      } else if (route === 'family') {
        window.history.pushState(null, '', '/family/members');
      } else if (route === 'chat') {
        window.history.pushState(null, '', '/');
      } else {
        window.history.pushState(null, '', `/${route}`);
      }
    } catch {}
  };

  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        if (path.includes('/expenses') || hash.includes('expenses')) setCurrentRouteState('expenses');
        else if (path.includes('/family') || hash.includes('family') || path.includes('/members')) setCurrentRouteState('family');
        else if (path.includes('/medical') || hash.includes('medical')) setCurrentRouteState('medical');
        else if (path.includes('/plans') || hash.includes('plans')) setCurrentRouteState('plans');
        else if (path.includes('/notes') || hash.includes('notes')) setCurrentRouteState('notes');
        else if (path.includes('/personal') || hash.includes('personal')) setCurrentRouteState('personal');
        else if (path === '/' || hash.includes('chat')) setCurrentRouteState('chat');
      } catch {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Step 1 Household modules state
  const [expenses, setExpenses] = useState<FamilyExpense[]>(INITIAL_EXPENSES);
  const [bills, setBills] = useState<FamilyBill[]>(INITIAL_BILLS);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(INITIAL_MEDICAL);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [plans, setPlans] = useState<FamilyPlan[]>(INITIAL_PLANS);
  const [notes, setNotes] = useState<FamilyNote[]>(INITIAL_NOTES);

  // Load user families from Firestore on user sign in or change
  const refreshFamilyData = async () => {
    if (!user) {
      setUserFamilies([]);
      setCurrentFamily(null);
      setFamilyMembership(null);
      setMembers([]);
      setLoadingFamilies(false);
      return;
    }

    setLoadingFamilies(true);
    try {
      const families = await familyService.getUserFamilies(user.id);
      setUserFamilies(families);

      if (families.length > 0) {
        // Retain current family if still in list, else default to first
        const savedFamilyId = localStorage.getItem(`familyhub_active_family_${user.id}`);
        const found = families.find(f => f.family.id === savedFamilyId) || families[0];
        setCurrentFamily(found.family);
        setFamilyMembership(found.membership);
      } else {
        setCurrentFamily(null);
        setFamilyMembership(null);
      }
    } catch (err) {
      console.warn("Error refreshing families:", err);
    } finally {
      setLoadingFamilies(false);
    }
  };

  useEffect(() => {
    refreshFamilyData();
  }, [user?.id]);

  // Real-time subscription to active family members & activities
  useEffect(() => {
    if (!currentFamily?.id) {
      setMembers([]);
      setActivityLogs([]);
      return;
    }

    const unsubMembers = familyService.subscribeFamilyMembers(
      currentFamily.id,
      (liveMembers) => {
        setMembers(liveMembers);
        // Sync current membership role if updated
        if (user) {
          const myMem = liveMembers.find(m => m.userId === user.id);
          if (myMem) setFamilyMembership(myMem);
        }
      }
    );

    const unsubActivities = familyService.subscribeActivityLogs(
      currentFamily.id,
      (logs) => {
        setActivityLogs(logs);
      }
    );

    return () => {
      unsubMembers();
      unsubActivities();
    };
  }, [currentFamily?.id, user?.id]);

  const switchFamily = (familyId: string) => {
    const target = userFamilies.find(f => f.family.id === familyId);
    if (target && user) {
      setCurrentFamily(target.family);
      setFamilyMembership(target.membership);
      localStorage.setItem(`familyhub_active_family_${user.id}`, familyId);
    }
  };

  const createFamily = async (name: string, photo?: string): Promise<Family> => {
    if (!user) throw new Error('You must be logged in to create a family.');
    const result = await familyService.createFamily({
      name,
      photo,
      creator: user,
    });
    await refreshFamilyData();
    setCurrentFamily(result.family);
    setFamilyMembership(result.membership);
    return result.family;
  };

  const inspectInviteCode = async (code: string): Promise<FamilyInvite> => {
    return familyService.getInviteByCode(code);
  };

  const joinFamilyWithCode = async (code: string): Promise<{ family: Family; membership: FamilyMember }> => {
    if (!user) throw new Error('You must be logged in to join a family.');
    const invite = await inspectInviteCode(code);
    const result = await familyService.joinFamily({ invite, user });
    await refreshFamilyData();
    setCurrentFamily(result.family);
    setFamilyMembership(result.membership);
    return result;
  };

  const generateInvite = async (role: 'admin' | 'member' = 'member', email?: string): Promise<FamilyInvite> => {
    if (!currentFamily || !user) throw new Error('No active family selected.');
    return familyService.generateInvite({
      familyId: currentFamily.id,
      familyName: currentFamily.name,
      familyPhoto: currentFamily.photo,
      invitedBy: user,
      role,
      email,
    });
  };

  const updateMemberRole = async (targetUserId: string, newRole: Role): Promise<void> => {
    if (!currentFamily || !user) return;
    await familyService.updateMemberRole({
      familyId: currentFamily.id,
      targetUserId,
      newRole,
      actor: user,
    });
  };

  const removeMember = async (targetUserId: string, targetUserName: string): Promise<void> => {
    if (!currentFamily || !user) return;
    await familyService.removeMember({
      familyId: currentFamily.id,
      targetUserId,
      targetUserName,
      actor: user,
    });
  };

  // Calculate real permissions based on role
  const role = familyMembership?.role || null;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || isOwner;
  const familyPermissions: FamilyPermissions = {
    isOwner,
    isAdmin,
    canManageMembers: isAdmin,
    canInvite: isAdmin,
    canManageSettings: isOwner,
  };

  // Step 1 preserved action handlers
  const addExpense = (expense: Omit<FamilyExpense, 'id' | 'familyId'>) => {
    if (!currentFamily) return;
    const newExp: FamilyExpense = { id: `exp-${Date.now()}`, familyId: currentFamily.id, ...expense };
    setExpenses(prev => [newExp, ...prev]);
  };

  const toggleBillPaid = (billId: string) => {
    setBills(prev =>
      prev.map(b => (b.id === billId ? { ...b, isPaid: !b.isPaid, paidDate: !b.isPaid ? new Date().toISOString() : undefined } : b))
    );
  };

  const addUrgentItem = (title: string, description: string, severity: UrgentItem['severity'] = 'urgent') => {
    if (!currentFamily || !user) return;
    const item: UrgentItem = {
      id: `urg-${Date.now()}`,
      familyId: currentFamily.id,
      title,
      description,
      severity,
      createdByUserId: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    setUrgentItems(prev => [item, ...prev]);
  };

  const resolveUrgentItem = (id: string) => {
    setUrgentItems(prev => prev.filter(u => u.id !== id));
  };

  const addPlan = (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => {
    if (!currentFamily) return;
    const p: FamilyPlan = { id: `plan-${Date.now()}`, familyId: currentFamily.id, ...plan };
    setPlans(prev => [...prev, p]);
  };

  const addNote = (title: string, content: string, category: FamilyNote['category'] = 'general') => {
    if (!currentFamily || !user) return;
    const n: FamilyNote = {
      id: `note-${Date.now()}`,
      familyId: currentFamily.id,
      title,
      content,
      category,
      isPinned: false,
      updatedAt: new Date().toISOString(),
      authorName: user.name,
    };
    setNotes(prev => [n, ...prev]);
  };

  return (
    <FamilyContext.Provider
      value={{
        family: currentFamily,
        currentFamily,
        currentFamilyId: currentFamily?.id || null,
        familyMembership,
        familyRole: role,
        familyPermissions,
        userFamilies,
        members,
        loadingFamilies,
        hasNoFamily: !loadingFamilies && userFamilies.length === 0,
        currentRoute,
        setCurrentRoute,
        switchFamily,
        createFamily,
        inspectInviteCode,
        joinFamilyWithCode,
        generateInvite,
        updateMemberRole,
        removeMember,
        activityLogs,
        expenses,
        bills,
        medicalRecords,
        urgentItems,
        plans,
        notes,
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
