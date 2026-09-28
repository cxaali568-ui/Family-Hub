import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PersonalProfile,
  PersonalExpense,
  PersonalTask,
  PersonalNote,
  AIMessage,
  PersonalNavRoute,
} from '../types';
import { personalService } from '../services/personalService';
import { useAuth } from './AuthContext';

interface PersonalContextType {
  profile: PersonalProfile | null;
  isLocked: boolean;
  isUnlockedInSession: boolean;
  currentPersonalRoute: PersonalNavRoute;
  setCurrentPersonalRoute: (route: PersonalNavRoute) => void;
  unlockWithPin: (pin: string) => boolean;
  lockNow: () => void;
  enableLock: (pin: string) => void;
  disableLock: () => void;
  expenses: PersonalExpense[];
  tasks: PersonalTask[];
  notes: PersonalNote[];
  aiMessages: AIMessage[];
  addExpense: (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addTask: (task: Omit<PersonalTask, 'id' | 'ownerId'>) => Promise<void>;
  toggleTask: (id: string, currentCompleted: boolean) => Promise<void>;
  addNote: (note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>) => Promise<void>;
  addAIMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
}

const PersonalContext = createContext<PersonalContextType | undefined>(undefined);

export const PersonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const ownerId = user?.id || '';

  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [isUnlockedInSession, setIsUnlockedInSession] = useState<boolean>(false);
  const [currentPersonalRoute, setCurrentPersonalRoute] = useState<PersonalNavRoute>('dashboard');

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);

  // When user switches or logs in, reset session unlock and refresh strictly for that ownerId
  useEffect(() => {
    if (!ownerId) {
      setProfile(null);
      setIsUnlockedInSession(false);
      setExpenses([]);
      setTasks([]);
      setNotes([]);
      setAiMessages([]);
      return;
    }

    const p = personalService.getProfile(ownerId);
    setProfile(p);
    // If lock is not enabled for this user, they are automatically unlocked
    setIsUnlockedInSession(!p.isLockEnabled);

    // Real-time Firestore subscriptions strictly filtered by ownerId
    const unsubExpenses = personalService.subscribeExpenses(ownerId, setExpenses);
    const unsubTasks = personalService.subscribeTasks(ownerId, setTasks);
    const unsubNotes = personalService.subscribeNotes(ownerId, setNotes);

    return () => {
      unsubExpenses();
      unsubTasks();
      unsubNotes();
    };
  }, [ownerId]);

  const isLocked = Boolean(profile?.isLockEnabled && !isUnlockedInSession);

  const unlockWithPin = (pin: string): boolean => {
    if (!ownerId) return false;
    const ok = personalService.verifyPin(ownerId, pin);
    if (ok) {
      setIsUnlockedInSession(true);
      return true;
    }
    return false;
  };

  const lockNow = () => {
    setIsUnlockedInSession(false);
  };

  const enableLock = (pin: string) => {
    if (!ownerId) return;
    personalService.setLockEnabled(ownerId, true, pin);
    setProfile(personalService.getProfile(ownerId));
  };

  const disableLock = () => {
    if (!ownerId) return;
    personalService.setLockEnabled(ownerId, false);
    setIsUnlockedInSession(true);
    setProfile(personalService.getProfile(ownerId));
  };

  const addExpense = async (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => {
    if (!ownerId) return;
    await personalService.addExpense(ownerId, expense);
  };

  const deleteExpense = async (id: string) => {
    if (!ownerId) return;
    await personalService.deleteExpense(ownerId, id);
  };

  const addTask = async (task: Omit<PersonalTask, 'id' | 'ownerId'>) => {
    if (!ownerId) return;
    await personalService.addTask(ownerId, task);
  };

  const toggleTask = async (id: string, currentCompleted: boolean) => {
    if (!ownerId) return;
    await personalService.toggleTask(ownerId, id, !currentCompleted);
  };

  const addNote = async (note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>) => {
    if (!ownerId) return;
    await personalService.addNote(ownerId, note);
  };

  const addAIMessage = (msg: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMsg: AIMessage = {
      id: `ai-${Date.now()}`,
      ...msg,
      timestamp: new Date().toISOString(),
    };
    setAiMessages(prev => [...prev, newMsg]);
  };

  return (
    <PersonalContext.Provider
      value={{
        profile,
        isLocked,
        isUnlockedInSession,
        currentPersonalRoute,
        setCurrentPersonalRoute,
        unlockWithPin,
        lockNow,
        enableLock,
        disableLock,
        expenses,
        tasks,
        notes,
        aiMessages,
        addExpense,
        deleteExpense,
        addTask,
        toggleTask,
        addNote,
        addAIMessage,
      }}
    >
      {children}
    </PersonalContext.Provider>
  );
};

export const usePersonal = () => {
  const ctx = useContext(PersonalContext);
  if (!ctx) throw new Error('usePersonal must be used within PersonalProvider');
  return ctx;
};
