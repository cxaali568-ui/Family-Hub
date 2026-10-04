import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  PersonalProfile,
  PersonalExpense,
  PersonalSchoolWorkItem,
  PersonalNote,
  PersonalDailyNeed,
  PersonalPlan,
  PersonalReminder,
  PersonalFile,
  PersonalPhoto,
  PersonalAlbum,
  PersonalAIConversation,
  PersonalNavRoute,
  AIMessage,
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

  // Data Collections
  expenses: PersonalExpense[];
  schoolWork: PersonalSchoolWorkItem[];
  notes: PersonalNote[];
  dailyNeeds: PersonalDailyNeed[];
  plans: PersonalPlan[];
  reminders: PersonalReminder[];
  files: PersonalFile[];
  photos: PersonalPhoto[];
  albums: PersonalAlbum[];
  aiConversations: PersonalAIConversation[];

  // Actions
  addExpense: (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => Promise<PersonalExpense>;
  deleteExpense: (id: string) => Promise<void>;
  addSchoolWorkItem: (item: Omit<PersonalSchoolWorkItem, 'id' | 'ownerId' | 'createdAt'>) => Promise<PersonalSchoolWorkItem>;
  updateSchoolWorkItem: (id: string, updates: Partial<PersonalSchoolWorkItem>) => Promise<void>;
  deleteSchoolWorkItem: (id: string) => Promise<void>;
  addNote: (note: Omit<PersonalNote, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<PersonalNote>;
  updateNote: (id: string, updates: Partial<PersonalNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addDailyNeed: (need: Omit<PersonalDailyNeed, 'id' | 'ownerId' | 'assignedTo' | 'createdAt'>) => Promise<PersonalDailyNeed>;
  updateDailyNeed: (id: string, updates: Partial<PersonalDailyNeed>) => Promise<void>;
  deleteDailyNeed: (id: string) => Promise<void>;
  addPlan: (plan: Omit<PersonalPlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<PersonalPlan>;
  updatePlan: (id: string, updates: Partial<PersonalPlan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  addReminder: (reminder: Omit<PersonalReminder, 'id' | 'ownerId' | 'createdAt'>) => Promise<PersonalReminder>;
  updateReminder: (id: string, updates: Partial<PersonalReminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  uploadFile: (file: File, category?: PersonalFile['category']) => Promise<PersonalFile>;
  deleteFile: (id: string, storagePath?: string) => Promise<void>;
  uploadPhoto: (file: File, albumId?: string, caption?: string) => Promise<PersonalPhoto>;
  deletePhoto: (id: string, storagePath?: string) => Promise<void>;
  createAlbum: (title: string, description?: string) => Promise<PersonalAlbum>;
  deleteAlbum: (albumId: string) => Promise<void>;
  createAIConversation: (title: string, messages: AIMessage[]) => Promise<PersonalAIConversation>;
  updateAIConversation: (id: string, updates: Partial<PersonalAIConversation>) => Promise<void>;
  deleteAIConversation: (id: string) => Promise<void>;
}

const PersonalContext = createContext<PersonalContextType | undefined>(undefined);

export const PersonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const ownerId = user?.id || '';

  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [isUnlockedInSession, setIsUnlockedInSession] = useState<boolean>(false);
  const [currentPersonalRoute, setCurrentPersonalRoute] = useState<PersonalNavRoute>('dashboard');

  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [schoolWork, setSchoolWork] = useState<PersonalSchoolWorkItem[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [dailyNeeds, setDailyNeeds] = useState<PersonalDailyNeed[]>([]);
  const [plans, setPlans] = useState<PersonalPlan[]>([]);
  const [reminders, setReminders] = useState<PersonalReminder[]>([]);
  const [files, setFiles] = useState<PersonalFile[]>([]);
  const [photos, setPhotos] = useState<PersonalPhoto[]>([]);
  const [albums, setAlbums] = useState<PersonalAlbum[]>([]);
  const [aiConversations, setAiConversations] = useState<PersonalAIConversation[]>([]);

  // Reset and subscribe strictly for current ownerId
  useEffect(() => {
    if (!ownerId) {
      setProfile(null);
      setIsUnlockedInSession(false);
      setExpenses([]);
      setSchoolWork([]);
      setNotes([]);
      setDailyNeeds([]);
      setPlans([]);
      setReminders([]);
      setFiles([]);
      setPhotos([]);
      setAlbums([]);
      setAiConversations([]);
      return;
    }

    const p = personalService.getProfile(ownerId);
    setProfile(p);
    setIsUnlockedInSession(!p.isLockEnabled);

    // Subscriptions strictly scoped to ownerId
    const unsubExpenses = personalService.subscribeExpenses(ownerId, setExpenses);
    const unsubSchoolWork = personalService.subscribeSchoolWork(ownerId, setSchoolWork);
    const unsubNotes = personalService.subscribeNotes(ownerId, setNotes);
    const unsubDailyNeeds = personalService.subscribeDailyNeeds(ownerId, setDailyNeeds);
    const unsubPlans = personalService.subscribePlans(ownerId, setPlans);
    const unsubReminders = personalService.subscribeReminders(ownerId, setReminders);
    const unsubFiles = personalService.subscribeFiles(ownerId, setFiles);
    const unsubPhotos = personalService.subscribePhotos(ownerId, setPhotos);
    const unsubAlbums = personalService.subscribeAlbums(ownerId, setAlbums);
    const unsubAI = personalService.subscribeAIConversations(ownerId, setAiConversations);

    return () => {
      unsubExpenses();
      unsubSchoolWork();
      unsubNotes();
      unsubDailyNeeds();
      unsubPlans();
      unsubReminders();
      unsubFiles();
      unsubPhotos();
      unsubAlbums();
      unsubAI();
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
    setProfile(personalService.getProfile(ownerId));
    setIsUnlockedInSession(true);
  };

  const addExpense = async (expense: Omit<PersonalExpense, 'id' | 'ownerId'>) => {
    return personalService.addExpense(ownerId, expense);
  };

  const deleteExpense = async (id: string) => {
    return personalService.deleteExpense(ownerId, id);
  };

  const addSchoolWorkItem = async (item: Omit<PersonalSchoolWorkItem, 'id' | 'ownerId' | 'createdAt'>) => {
    return personalService.addSchoolWorkItem(ownerId, item);
  };

  const updateSchoolWorkItem = async (id: string, updates: Partial<PersonalSchoolWorkItem>) => {
    return personalService.updateSchoolWorkItem(ownerId, id, updates);
  };

  const deleteSchoolWorkItem = async (id: string) => {
    return personalService.deleteSchoolWorkItem(ownerId, id);
  };

  const addNote = async (note: Omit<PersonalNote, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    return personalService.addNote(ownerId, note);
  };

  const updateNote = async (id: string, updates: Partial<PersonalNote>) => {
    return personalService.updateNote(ownerId, id, updates);
  };

  const deleteNote = async (id: string) => {
    return personalService.deleteNote(ownerId, id);
  };

  const addDailyNeed = async (need: Omit<PersonalDailyNeed, 'id' | 'ownerId' | 'assignedTo' | 'createdAt'>) => {
    return personalService.addDailyNeed(ownerId, need);
  };

  const updateDailyNeed = async (id: string, updates: Partial<PersonalDailyNeed>) => {
    return personalService.updateDailyNeed(ownerId, id, updates);
  };

  const deleteDailyNeed = async (id: string) => {
    return personalService.deleteDailyNeed(ownerId, id);
  };

  const addPlan = async (plan: Omit<PersonalPlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    return personalService.addPlan(ownerId, plan);
  };

  const updatePlan = async (id: string, updates: Partial<PersonalPlan>) => {
    return personalService.updatePlan(ownerId, id, updates);
  };

  const deletePlan = async (id: string) => {
    return personalService.deletePlan(ownerId, id);
  };

  const addReminder = async (reminder: Omit<PersonalReminder, 'id' | 'ownerId' | 'createdAt'>) => {
    return personalService.addReminder(ownerId, reminder);
  };

  const updateReminder = async (id: string, updates: Partial<PersonalReminder>) => {
    return personalService.updateReminder(ownerId, id, updates);
  };

  const deleteReminder = async (id: string) => {
    return personalService.deleteReminder(ownerId, id);
  };

  const uploadFile = async (file: File, category?: PersonalFile['category']) => {
    return personalService.uploadFile(ownerId, file, category);
  };

  const deleteFile = async (id: string, storagePath?: string) => {
    return personalService.deleteFile(ownerId, id, storagePath);
  };

  const uploadPhoto = async (file: File, albumId?: string, caption?: string) => {
    return personalService.uploadPhoto(ownerId, file, albumId, caption);
  };

  const deletePhoto = async (id: string, storagePath?: string) => {
    return personalService.deletePhoto(ownerId, id, storagePath);
  };

  const createAlbum = async (title: string, description?: string) => {
    return personalService.createAlbum(ownerId, title, description);
  };

  const deleteAlbum = async (albumId: string) => {
    return personalService.deleteAlbum(ownerId, albumId);
  };

  const createAIConversation = async (title: string, messages: AIMessage[]) => {
    return personalService.createAIConversation(ownerId, title, messages);
  };

  const updateAIConversation = async (id: string, updates: Partial<PersonalAIConversation>) => {
    return personalService.updateAIConversation(ownerId, id, updates);
  };

  const deleteAIConversation = async (id: string) => {
    return personalService.deleteAIConversation(ownerId, id);
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
        schoolWork,
        notes,
        dailyNeeds,
        plans,
        reminders,
        files,
        photos,
        albums,
        aiConversations,
        addExpense,
        deleteExpense,
        addSchoolWorkItem,
        updateSchoolWorkItem,
        deleteSchoolWorkItem,
        addNote,
        updateNote,
        deleteNote,
        addDailyNeed,
        updateDailyNeed,
        deleteDailyNeed,
        addPlan,
        updatePlan,
        deletePlan,
        addReminder,
        updateReminder,
        deleteReminder,
        uploadFile,
        deleteFile,
        uploadPhoto,
        deletePhoto,
        createAlbum,
        deleteAlbum,
        createAIConversation,
        updateAIConversation,
        deleteAIConversation,
      }}
    >
      {children}
    </PersonalContext.Provider>
  );
};

export const usePersonal = () => {
  const context = useContext(PersonalContext);
  if (!context) throw new Error('usePersonal must be used within PersonalProvider');
  return context;
};
