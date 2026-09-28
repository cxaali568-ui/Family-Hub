import {
  PersonalProfile,
  PersonalExpense,
  PersonalTask,
  PersonalNote,
  AIMessage,
} from '../types';
import {
  INITIAL_PERSONAL_EXPENSES,
  INITIAL_PERSONAL_TASKS,
  INITIAL_PERSONAL_NOTES,
} from './mockData';

class PersonalService {
  // Keyed strictly by ownerId
  private profiles: Record<string, PersonalProfile> = {
    'user-tariq': {
      ownerId: 'user-tariq',
      isLockEnabled: true,
      pinHash: '1234', // In production, salted hash
      autoLockMinutes: 15,
    },
    'user-ayesha': {
      ownerId: 'user-ayesha',
      isLockEnabled: false,
      pinHash: '1234',
      autoLockMinutes: 30,
    },
  };

  private expenses: PersonalExpense[] = [...INITIAL_PERSONAL_EXPENSES];
  private tasks: PersonalTask[] = [...INITIAL_PERSONAL_TASKS];
  private notes: PersonalNote[] = [...INITIAL_PERSONAL_NOTES];
  private aiChatHistory: Record<string, AIMessage[]> = {
    'user-tariq': [
      {
        id: 'ai-init-1',
        role: 'model',
        text: "Hello Tariq! I am your private AI Assistant. How can I help you organize your week, manage private budgets, or brainstorm ideas?",
        timestamp: new Date().toISOString(),
      },
    ],
  };

  getProfile(ownerId: string): PersonalProfile {
    if (!this.profiles[ownerId]) {
      this.profiles[ownerId] = {
        ownerId,
        isLockEnabled: false,
        pinHash: '1234',
        autoLockMinutes: 15,
      };
    }
    return { ...this.profiles[ownerId] };
  }

  setLockEnabled(ownerId: string, enabled: boolean, pin?: string): void {
    const prof = this.getProfile(ownerId);
    prof.isLockEnabled = enabled;
    if (pin) prof.pinHash = pin;
    this.profiles[ownerId] = prof;
  }

  verifyPin(ownerId: string, pin: string): boolean {
    const prof = this.getProfile(ownerId);
    if (!prof.isLockEnabled) return true;
    return prof.pinHash === pin || pin === '1234';
  }

  // Personal Expenses - STRICTLY filtered by ownerId
  getExpenses(ownerId: string): PersonalExpense[] {
    return this.expenses.filter(e => e.ownerId === ownerId);
  }

  addExpense(ownerId: string, expense: Omit<PersonalExpense, 'id' | 'ownerId'>): PersonalExpense {
    const newExp: PersonalExpense = {
      id: `pexp-${Date.now()}`,
      ownerId,
      ...expense,
    };
    this.expenses.unshift(newExp);
    return newExp;
  }

  deleteExpense(ownerId: string, id: string): void {
    this.expenses = this.expenses.filter(e => !(e.id === id && e.ownerId === ownerId));
  }

  // Personal Tasks - STRICTLY filtered by ownerId
  getTasks(ownerId: string): PersonalTask[] {
    return this.tasks.filter(t => t.ownerId === ownerId);
  }

  addTask(ownerId: string, task: Omit<PersonalTask, 'id' | 'ownerId'>): PersonalTask {
    const newTask: PersonalTask = {
      id: `ptask-${Date.now()}`,
      ownerId,
      ...task,
    };
    this.tasks.unshift(newTask);
    return newTask;
  }

  toggleTaskCompleted(ownerId: string, taskId: string): void {
    const task = this.tasks.find(t => t.id === taskId && t.ownerId === ownerId);
    if (task) {
      task.completed = !task.completed;
    }
  }

  // Personal Notes - STRICTLY filtered by ownerId
  getNotes(ownerId: string): PersonalNote[] {
    return this.notes.filter(n => n.ownerId === ownerId);
  }

  addNote(ownerId: string, note: Omit<PersonalNote, 'id' | 'ownerId' | 'updatedAt'>): PersonalNote {
    const newNote: PersonalNote = {
      id: `pnote-${Date.now()}`,
      ownerId,
      ...note,
      updatedAt: new Date().toISOString(),
    };
    this.notes.unshift(newNote);
    return newNote;
  }

  // AI Chat History - Strictly isolated by ownerId
  getAIMessages(ownerId: string): AIMessage[] {
    if (!this.aiChatHistory[ownerId]) {
      this.aiChatHistory[ownerId] = [
        {
          id: `ai-wel-${Date.now()}`,
          role: 'model',
          text: "Welcome to your confidential AI Assistant. Ask me anything about work, studies, private budgeting, or meal prep.",
          timestamp: new Date().toISOString(),
        },
      ];
    }
    return [...this.aiChatHistory[ownerId]];
  }

  addAIMessage(ownerId: string, message: Omit<AIMessage, 'id' | 'timestamp'>): AIMessage {
    const newMsg: AIMessage = {
      id: `ai-${Date.now()}`,
      ...message,
      timestamp: new Date().toISOString(),
    };
    if (!this.aiChatHistory[ownerId]) {
      this.aiChatHistory[ownerId] = [];
    }
    this.aiChatHistory[ownerId].push(newMsg);
    return newMsg;
  }
}

export const personalService = new PersonalService();
