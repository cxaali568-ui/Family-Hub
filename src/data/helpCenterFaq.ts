export interface HelpArticle {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  summary: string;
  content: string;
  steps?: string[];
  troubleshooting?: string[];
  keywords: string[];
}

export interface HelpCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'account',
    name: 'Account, Login & Family Code',
    iconName: 'Key',
    description: 'Login issues, password recovery, invite codes, and switching families',
  },
  {
    id: 'profiles',
    name: 'Member Profiles & Data Protection',
    iconName: 'UserCheck',
    description: 'Profile editing, preserving family data, relationships, and child profiles',
  },
  {
    id: 'uploads',
    name: 'Photos & Document Uploads',
    iconName: 'UploadCloud',
    description: 'Compressing images, avatar uploads, bill attachments, and file formats',
  },
  {
    id: 'chat',
    name: 'Family Chat & Voice Messages',
    iconName: 'MessageSquare',
    description: 'Real-time chat, audio recordings, notification badges, and clearing history',
  },
  {
    id: 'notifications',
    name: 'Push Alerts & Audio Notifications',
    iconName: 'Bell',
    description: 'Lockscreen push alerts, audio chimes, browser permissions, and test alerts',
  },
  {
    id: 'planner',
    name: 'Family Planner & Calendar',
    iconName: 'Calendar',
    description: 'Creating events, assigning chores, setting reminders, and calendar sync',
  },
  {
    id: 'urgent',
    name: 'Urgent Section & SOS Alerts',
    iconName: 'AlertTriangle',
    description: 'Broadcasting emergency needs, marking items resolved, and severity levels',
  },
  {
    id: 'ai_board',
    name: 'AI Board & Assistant',
    iconName: 'Sparkles',
    description: 'Gemini tutoring, meal planning, budget advice, and personal AI chats',
  },
  {
    id: 'language',
    name: 'Languages & RTL Layouts',
    iconName: 'Languages',
    description: '20+ international languages, Urdu/Arabic RTL support, and font rendering',
  },
  {
    id: 'security',
    name: 'Privacy, Security & Roles',
    iconName: 'ShieldCheck',
    description: 'Owner/Admin roles, member permissions, Personal Space PIN, and data safety',
  },
  {
    id: 'pwa',
    name: 'App Installation & Sharing',
    iconName: 'Share2',
    description: 'Installing FamilyHub on Android/iOS (PWA), offline use, and sharing link',
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // 1. Account, Login & Family Code
  {
    id: 'login-troubleshooting',
    categoryId: 'account',
    categoryName: 'Account, Login & Family Code',
    title: 'Troubleshooting Login & Password Issues',
    summary: 'What to do if sign-in fails or your session expires.',
    content: 'FamilyHub uses Firebase Authentication. If you cannot sign in, verify your email and password format. Ensure caps lock is off. If you forgot your password, use the "Forgot Password" link on the login screen to receive a secure password reset link to your email inbox.',
    steps: [
      'Check your internet connection and verify that third-party cookies are not blocked in your browser.',
      'Double check spelling of your email address.',
      'Click "Forgot Password" on the sign in page to receive a password reset link.',
      'Check your spam or junk folder for the Firebase reset link.',
      'If you joined via an invitation, ensure you are using the same email address that received the invitation.',
    ],
    troubleshooting: [
      'Error "auth/user-not-found": No account exists with this email. Click "Sign Up" or request a new family invite from your Family Admin.',
      'Error "auth/wrong-password": The password entered does not match. Reset your password.',
      'Error "auth/network-request-failed": Check your firewall or WiFi connection and refresh the browser.',
    ],
    keywords: ['login', 'signin', 'password', 'forgot password', 'auth', 'email', 'account', 'reset'],
  },
  {
    id: 'family-code-invite',
    categoryId: 'account',
    categoryName: 'Account, Login & Family Code',
    title: 'How Family Codes and Invitations Work',
    summary: 'Understanding 6-digit family invite codes and joining an existing family.',
    content: 'Every family in FamilyHub has a unique 6-character Invite Code (e.g. "KH-8492"). The Family Owner or Admin can generate and copy this code from Settings -> Family Management. New members enter this code during onboarding or via the Family Switcher to join instantly.',
    steps: [
      'Ask your Family Owner or Admin to open Settings -> Family Management.',
      'Copy the displayed Family Invite Code.',
      'In your FamilyHub app, open the top family selector and click "Join Another Family".',
      'Paste the 6-character code and click "Join Family".',
      'You will be instantly added to the family members roster with your role.',
    ],
    troubleshooting: [
      'Code shows "Invalid or Expired": Ask the Admin to generate a fresh invite code in Settings.',
      'Already a member: If you already belong to this family, switch to it from the top dropdown instead of joining again.',
    ],
    keywords: ['family code', 'invite code', 'join family', 'invitation', 'switch family', 'code'],
  },

  // 2. Member Profiles & Data Protection
  {
    id: 'profile-editing-guide',
    categoryId: 'profiles',
    categoryName: 'Member Profiles & Data Protection',
    title: 'Editing Member Profiles & Preventing Data Loss',
    summary: 'How to safely update full name, relationship, phone, and medical notes without losing info.',
    content: 'FamilyHub features real-time Firestore synchronization for member profiles. When you open a member profile and tap Edit, the current information is pre-filled from the local cache and real-time snapshot. Saving updates the exact record without affecting other fields.',
    steps: [
      'Navigate to Family Members from the sidebar or bottom menu.',
      'Select the family member card you wish to inspect or edit.',
      'Click the "Edit Profile" button.',
      'Update the fields (Name, Relationship, Phone, Date of Birth, Blood Group, Notes).',
      'Click "Save Profile". The changes persist to Firestore and reflect immediately for all members.',
    ],
    troubleshooting: [
      'Data temporarily disappeared: This bug has been fixed in the latest update. If you experience any delay, pull to refresh or reload the page.',
      'Permission Denied: Only Family Admins/Owners and the member themselves can update member profile details.',
    ],
    keywords: ['profile', 'edit profile', 'disappearing data', 'member', 'relationship', 'phone', 'child profile'],
  },

  // 3. Photos & Document Uploads
  {
    id: 'uploading-photos-and-docs',
    categoryId: 'uploads',
    categoryName: 'Photos & Document Uploads',
    title: 'Resolving Image and Document Upload Failures',
    summary: 'Guidelines for uploading profile pictures, gallery photos, and PDF documents.',
    content: 'FamilyHub supports JPEG, PNG, WEBP, and PDF files. Images are automatically compressed on your device before uploading to ensure quick loading and preserve storage.',
    steps: [
      'Ensure the file is under 10MB.',
      'Supported formats: JPG, PNG, WEBP for photos; PDF, JPG for documents and receipts.',
      'If an upload hangs, check your cellular or WiFi upload speed.',
      'For profile avatars, use square images for the best visual appearance.',
    ],
    troubleshooting: [
      'Upload failed with network error: Try uploading a compressed version or connect to WiFi.',
      'Avatar does not change immediately: Clear browser cache or hard reload (Ctrl+Shift+R / Cmd+Shift+R).',
    ],
    keywords: ['upload', 'photo', 'avatar', 'document', 'pdf', 'image', 'receipt', 'attachment'],
  },

  // 4. Family Chat & Voice Messages
  {
    id: 'family-chat-features',
    categoryId: 'chat',
    categoryName: 'Family Chat & Voice Messages',
    title: 'Using Family Chat, Voice Memos & Managing Notifications',
    summary: 'Send instant messages, record voice notes, and clear unread indicators.',
    content: 'Family Chat is the central communication hub. It features live messaging, reactions, audio notes, and unread counters. You can clear unread chat indicators at any time by clicking "Clear Notifications" at the top of the chat view.',
    steps: [
      'Open Family Chat from the navigation menu.',
      'Type a message or press and hold the Microphone icon to record a voice message.',
      'To mark notifications as read or clear badges, tap the "Clear Notifications" button in the chat header.',
      'Confirm the action in the prompt. Badges will reset to zero instantly.',
    ],
    troubleshooting: [
      'Microphone permission blocked: Open your browser site settings and allow microphone access for FamilyHub.',
      'Messages not appearing in real-time: Check that offline mode is not active.',
    ],
    keywords: ['chat', 'voice', 'audio message', 'clear notifications', 'unread', 'badge', 'messages'],
  },

  // 5. Push Alerts & Audio Notifications
  {
    id: 'push-notifications-setup',
    categoryId: 'notifications',
    categoryName: 'Push Alerts & Audio Notifications',
    title: 'Configuring Mobile & Browser Push Alerts (Optional ON/OFF)',
    summary: 'Receive instant notifications on your phone or desktop lockscreen.',
    content: 'Push alerts notify you when family members post urgent needs, new chat messages, or planner updates. You can toggle push notifications ON or OFF at any time in Settings.',
    steps: [
      'Open Settings from the navigation bar.',
      'Scroll down to "Mobile & Browser Push Alerts".',
      'Toggle the switch to ON. Your browser will ask for notification permission.',
      'Click "Allow".',
      'Click "Send Test Alert" to verify sound and banner appearance on your lockscreen.',
    ],
    troubleshooting: [
      'Permission status shows "Denied": In your browser address bar, tap the lock/settings icon next to the URL, find Notifications, and change from "Block" to "Allow".',
      'No sound on mobile: Check that your phone is not in Do Not Disturb or Silent mode.',
    ],
    keywords: ['push notifications', 'lockscreen', 'alerts', 'sound', 'chime', 'permission', 'test alert'],
  },

  // 6. Family Planner & Calendar
  {
    id: 'family-planner-guide',
    categoryId: 'planner',
    categoryName: 'Family Planner & Calendar',
    title: 'Managing Events, Chores & Family Schedules',
    summary: 'How to create shared calendar events, assign tasks, and set due dates.',
    content: 'The Family Planner organizes shared family activities, school holidays, doctor visits, and birthdays into month, week, and day views.',
    steps: [
      'Click "Family Planner" in the sidebar.',
      'Click "+ Add Event" in the top right.',
      'Enter the event title, start date/time, category, and assigned family members.',
      'Save the event. It will appear on all family members\' calendars with automatic reminders.',
    ],
    troubleshooting: [
      'Event not showing on other devices: Verify both devices are connected to the same family from the top family switcher.',
    ],
    keywords: ['planner', 'calendar', 'events', 'schedule', 'chores', 'reminders'],
  },

  // 7. Urgent Section & SOS Alerts
  {
    id: 'urgent-sos-guide',
    categoryId: 'urgent',
    categoryName: 'Urgent Section & SOS Alerts',
    title: 'Broadcasting Urgent Needs and Emergency Alerts',
    summary: 'When and how to use the Urgent section for high-priority family broadcasts.',
    content: 'The Urgent section is reserved for time-sensitive household needs: emergency medical supplies, urgent grocery runs, child pickup requests, and critical home alerts.',
    steps: [
      'Go to the "Urgent" section from the sidebar.',
      'Click "Broadcast Urgent Need".',
      'Select severity: Alert (Yellow), Urgent (Orange), or Critical (Red).',
      'Enter title and details, then tap Broadcast.',
      'All family members with push notifications enabled will receive immediate high-priority alerts.',
      'When the need is addressed, click "Mark Resolved".',
    ],
    troubleshooting: [
      'Need already resolved: Any family member can mark an urgent item as resolved to dismiss the high-priority banner.',
    ],
    keywords: ['urgent', 'emergency', 'sos', 'critical', 'broadcast', 'alert', 'resolved'],
  },

  // 8. AI Board & Personal Assistant
  {
    id: 'ai-assistant-features',
    categoryId: 'ai_board',
    categoryName: 'AI Board & Assistant',
    title: 'Using the AI Assistant for Tutoring, Budgeting & Planning',
    summary: 'Harness Google Gemini 2.5 Flash for family tasks, meal planning, and study guides.',
    content: 'FamilyHub integrates Google Gemini AI to assist your family. Choose specialized roles like Academic Tutor, Budget Planner, or Family Coordinator for tailored advice.',
    steps: [
      'Open "AI Board" from the navigation menu.',
      'Select your preferred assistant mode (General, Homework Tutor, Budget & Savings, Meal Planner).',
      'Type your question or attach a document or photo for analysis.',
      'Responses stream in real-time with Markdown and formatted tables.',
    ],
    troubleshooting: [
      'AI temporarily unavailable (503): High demand spikes are brief; wait 15 seconds and resubmit your prompt.',
      'History not saving: Ensure "Save History" is toggled on in AI settings.',
    ],
    keywords: ['ai', 'gemini', 'tutor', 'homework', 'budget', 'assistant', 'meal planner'],
  },

  // 9. Languages & RTL Layouts
  {
    id: 'multilingual-rtl-guide',
    categoryId: 'language',
    categoryName: 'Languages & RTL Layouts',
    title: 'Changing Languages and RTL (Urdu, Arabic, Persian)',
    summary: 'How to switch between 20+ supported languages with full right-to-left layout adaptation.',
    content: 'FamilyHub supports 20 languages including English, Urdu (اردو), Arabic (العربية), Persian (فارسی), Spanish, French, German, Chinese, and Hindi. Right-to-left (RTL) direction and Naskh typography are applied automatically.',
    steps: [
      'Go to Settings.',
      'Under "International Language", type in the search bar or pick from the popular languages.',
      'Select your desired language (e.g. Urdu, Arabic, Spanish).',
      'The entire interface, buttons, menus, and text alignments will adapt instantly.',
      'Your language preference is saved to your local profile and restored on every session.',
    ],
    troubleshooting: [
      'Text alignment inverted: For RTL languages (Urdu, Arabic, Persian), navigation and menus automatically orient right-to-left by design.',
    ],
    keywords: ['language', 'urdu', 'arabic', 'rtl', 'multilingual', 'farsi', 'spanish', 'french', 'translation'],
  },

  // 10. Privacy, Security & Roles
  {
    id: 'security-and-roles',
    categoryId: 'security',
    categoryName: 'Privacy, Security & Roles',
    title: 'Roles, Permissions & Personal Space Security',
    summary: 'Understanding Owner, Admin, and Member permissions, plus Personal Space PIN lock.',
    content: 'FamilyHub enforces multi-tier security: Owner (creates family, manages billing/identity), Admin (manages members, inspects tickets, invites), Member (creates notes, chats, events). Personal Space has an independent PIN lock.',
    steps: [
      'To protect your private personal notes and budget, open Settings -> Personal Space Security.',
      'Click "Enable PIN Lock" and set a 4-digit PIN.',
      'Personal Space will require the PIN whenever reopened.',
      'Family Admins can view the Admin Support Dashboard to resolve family tickets.',
    ],
    troubleshooting: [
      'Forgot Personal Space PIN: The default recovery PIN is 1234 or you can disable lock from your authenticated Settings page.',
    ],
    keywords: ['privacy', 'security', 'owner', 'admin', 'pin', 'lock', 'permissions', 'roles'],
  },

  // 11. App Installation & Sharing
  {
    id: 'pwa-app-sharing',
    categoryId: 'pwa',
    categoryName: 'App Installation & Sharing',
    title: 'Installing the App on iPhone/Android & Sharing the Link',
    summary: 'How to add FamilyHub to your mobile home screen and share the direct link with family.',
    content: 'FamilyHub is a Progressive Web App (PWA). You can install it directly without an app store, saving phone storage while giving full native performance.',
    steps: [
      'On Android (Chrome): Tap the three-dot menu and select "Install app" or "Add to Home Screen".',
      'On iPhone (Safari): Tap the Share button at the bottom of Safari, scroll down, and tap "Add to Home Screen".',
      'To invite family, click "Share App Link" from the menu or Settings, and tap "Share via WhatsApp" or "Copy Link".',
    ],
    troubleshooting: [
      'No install prompt appears: The app is already installed, or your browser is in private/incognito mode.',
    ],
    keywords: ['install', 'pwa', 'android', 'iphone', 'home screen', 'share link', 'web app'],
  },
];
