export type SupportCategory =
  | 'bug'
  | 'complaint'
  | 'help'
  | 'feature'
  | 'account'
  | 'chat'
  | 'profiles'
  | 'sync'
  | 'security';

export type SupportStatus =
  | 'new'
  | 'open'
  | 'in_progress'
  | 'waiting_user'
  | 'resolved'
  | 'closed';

export type SupportPriority = 'low' | 'medium' | 'high' | 'critical';

export interface SupportAttachment {
  name: string;
  url: string; // base64 or storage url
  type?: string;
  size?: number;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole: 'user' | 'admin' | 'system';
  text: string;
  attachments?: SupportAttachment[];
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  referenceId: string; // e.g. FH-BUG-4821
  userId: string;
  userName: string;
  userEmail: string;
  familyId: string;
  category: SupportCategory;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: SupportPriority;
  
  // Structured bug report fields
  expectedBehavior?: string;
  actualBehavior?: string;
  stepsToReproduce?: string;
  attemptedSteps?: string;
  aiSummary?: string;
  errorMessage?: string;
  
  // Attachments & device info
  attachments?: SupportAttachment[];
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
    screenResolution?: string;
    language?: string;
  };

  // Multi-turn conversation messages
  messages: SupportMessage[];

  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  closedAt?: number;
}

export interface AITroubleshootingMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: string[];
  solvedPrompt?: boolean; // prompts the user: "Did this solve your problem?"
  generatedReport?: Partial<SupportTicket>;
  timestamp: number;
}

export interface GeneratedBugReport {
  title: string;
  category: SupportCategory;
  priority: SupportPriority;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  stepsToReproduce: string;
  attemptedSteps: string;
  aiSummary: string;
  errorMessage?: string;
}
