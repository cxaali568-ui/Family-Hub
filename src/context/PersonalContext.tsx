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
  addExpense: (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => void;
  deleteExpense: (id: string) => void;
  addTask: (task: Omit<PersonalTask, 'id' | 'ownerId'>) => void;
  toggleTask: (id: string) => void;
  addNote: (note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>) => void;
  addAIMessage: (msg: Omit<AIMessage, 'id' | 'timestamp'>) => void;
  refreshPersonalData: () => void;
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
    refreshPersonalData();
  }, [ownerId]);

  const refreshPersonalData = () => {
    if (!ownerId) return;
    setExpenses(personalService.getExpenses(ownerId));
    setTasks(personalService.getTasks(ownerId));
    setNotes(personalService.getNotes(ownerId));
    setAiMessages(personalService.getAIMessages(ownerId));
    setProfile(personalService.getProfile(ownerId));
  };

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
    refreshPersonalData();
  };

  const disableLock = () => {
    if (!ownerId) return;
    personalService.setLockEnabled(ownerId, false);
    setIsUnlockedInSession(true);
    refreshPersonalData();
  };

  const addExpense = (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => {
    if (!ownerId) return;
    personalService.addExpense(ownerId, expense);
    refreshPersonalData();
  };

  const deleteExpense = (id: string) => {
    if (!ownerId) return;
    personalService.deleteExpense(ownerId, id);
    refreshPersonalData();
  };

  const addTask = (task: Omit<PersonalTask, 'id' | 'ownerId'>) => {
    if (!ownerId) return;
    personalService.addTask(ownerId, task);
    refreshPersonalData();
  };

  const toggleTask = (id: string) => {
    if (!ownerId) return;
    personalService.toggleTaskCompleted(ownerId, id);
    refreshPersonalData();
  };

  const addNote = (note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>) => {
    if (!ownerId) return;
    personalService.addNote(ownerId, note);
    refreshPersonalData();
  };

  const addAIMessage = (msg: Omit<AIMessage, 'id' | 'timestamp'>) => {
    if (!ownerId) return;
    personalService.addAIMessage(ownerId, msg);
    refreshPersonalData();
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
        refreshPersonalData,
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
