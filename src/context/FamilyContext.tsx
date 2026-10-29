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
import { noteService } from '../services/noteService';
import { useAuth } from './AuthContext';

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
  addUrgentItem: (title: string, description: string, severity?: UrgentItem['severity']) => Promise<void> | void;
  resolveUrgentItem: (id: string) => Promise<void> | void;
  addPlan: (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => void;
  addNote: (title: string, content: string, category?: FamilyNote['category']) => Promise<void> | void;
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

  const parseCurrentPath = (): FamilyNavRoute => {
    try {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const target = path + hash;

      if (target.includes('/expenses') || target.includes('/money')) return 'expenses';
      if (target.includes('/bills')) return 'bills';
      if (target.includes('/medical')) return 'medical';
      if (target.includes('/planner') || target.includes('/plans')) return 'planner';
      if (target.includes('/photos')) return 'photos';
      if (target.includes('/documents')) return 'documents';
      if (target.includes('/notes')) return 'notes';
      if (target.includes('/urgent')) return 'urgent';
      if (target.includes('/ai')) return 'ai';
      if (target.includes('/personal')) return 'personal';
      if (target.includes('/settings')) return 'settings';
      if (target.includes('/family') || target.includes('/members')) return 'family';
      if (target.includes('/children')) return 'children';
    } catch {}
    return 'chat';
  };

  // PRIMARY USER EXPERIENCE REQUIREMENT: Default route is 'chat', with support for direct URLs e.g. /family/expenses
  const [currentRoute, setCurrentRouteState] = useState<FamilyNavRoute>(parseCurrentPath);

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
      setCurrentRouteState(parseCurrentPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Step 1 Household modules state (defaults to empty database)
  const [expenses, setExpenses] = useState<FamilyExpense[]>([]);
  const [bills, setBills] = useState<FamilyBill[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [plans, setPlans] = useState<FamilyPlan[]>([]);
  const [notes, setNotes] = useState<FamilyNote[]>([]);

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

    // Real-time subscription to notes and urgent items from Firestore
    const unsubNotes = noteService.subscribeNotes(currentFamily.id, (loadedNotes) => {
      setNotes(loadedNotes);
      const urgent = loadedNotes
        .filter(n => (n.type === 'urgent' || n.priority === 'urgent' || n.priority === 'critical') && n.status !== 'completed' && !n.isArchived)
        .map(n => ({
          id: n.id,
          familyId: n.familyId,
          title: n.title,
          description: n.description || n.content || '',
          severity: (n.priority === 'critical' ? 'critical' : n.priority === 'urgent' ? 'urgent' : 'alert') as UrgentItem['severity'],
          createdByUserId: n.createdBy,
          createdByName: n.createdByName || n.authorName || 'Family Member',
          createdAt: n.createdAt,
          resolved: n.status === 'completed',
        }));
      setUrgentItems(urgent);
    });

    return () => {
      unsubMembers();
      unsubActivities();
      unsubNotes();
    };
  }, [currentFamily?.id, user?.id]);

  const switchFamily = (familyId: string) => {
    const target = userFamilies.find(f => f.family.id === familyId);
    if (target && user) {
      setCurrentFamily(target.family);
      setFamilyMembership(target.membership);
      localStorage.setItem(`familyhub_active_family_${user.id}`, familyId);
      // Requirement: Family Chat is the first/default Family screen after switching families
      setCurrentRoute('chat');
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
    setCurrentRoute('chat');
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
    setCurrentRoute('chat');
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

  const addUrgentItem = async (title: string, description: string, severity: UrgentItem['severity'] = 'urgent') => {
    if (!currentFamily || !user) return;
    const optimisticItem: UrgentItem = {
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
    setUrgentItems(prev => [optimisticItem, ...prev]);

    try {
      await noteService.addNote(
        currentFamily.id,
        {
          type: 'urgent',
          title,
          description,
          categoryId: 'urgent',
          categoryName: 'Urgent Needs',
          priority: severity === 'critical' ? 'critical' : severity === 'urgent' ? 'urgent' : 'normal',
          status: 'pending',
          notifyFamily: true,
        },
        user
      );
    } catch (err) {
      console.error('Error persisting urgent item to Firestore:', err);
      setUrgentItems(prev => prev.filter(u => u.id !== optimisticItem.id));
      throw err;
    }
  };

  const resolveUrgentItem = async (id: string) => {
    if (!currentFamily || !user) return;
    setUrgentItems(prev => prev.filter(u => u.id !== id));
    try {
      await noteService.updateStatus(currentFamily.id, id, 'completed', user);
    } catch (err) {
      console.error('Error resolving urgent item in Firestore:', err);
    }
  };

  const addPlan = (plan: Omit<FamilyPlan, 'id' | 'familyId'>) => {
    if (!currentFamily) return;
    const p: FamilyPlan = { id: `plan-${Date.now()}`, familyId: currentFamily.id, ...plan };
    setPlans(prev => [...prev, p]);
  };

  const addNote = async (title: string, content: string, category: FamilyNote['category'] = 'general') => {
    if (!currentFamily || !user) return;
    const optimisticNote: FamilyNote = {
      id: `note-${Date.now()}`,
      familyId: currentFamily.id,
      title,
      content,
      description: content,
      category,
      isPinned: false,
      updatedAt: new Date().toISOString(),
      authorName: user.name,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [optimisticNote, ...prev]);

    try {
      await noteService.addNote(
        currentFamily.id,
        {
          type: 'general',
          title,
          description: content,
          categoryId: category || 'general',
          categoryName: category ? category.charAt(0).toUpperCase() + category.slice(1) : 'General',
          status: 'pending',
        },
        user
      );
    } catch (err) {
      console.error('Error persisting note to Firestore:', err);
      setNotes(prev => prev.filter(n => n.id !== optimisticNote.id));
      throw err;
    }
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
