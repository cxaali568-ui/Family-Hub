/**
 * Centralized Internationalization Dictionary
 * Supports English (en - LTR) and Urdu (ur - RTL)
 */

export type Language = 'en' | 'ur';

export interface Translations {
  appName: string;
  familySpace: string;
  personalSpace: string;
  myPersonal: string;
  privateSpaceBadge: string;
  privateNotice: string;
  nav: {
    chat: string;
    family: string;
    children?: string;
    expenses: string;
    bills?: string;
    money: string;
    medical: string;
    plans: string;
    planner?: string;
    photos: string;
    documents: string;
    notes: string;
    urgent: string;
    notifications: string;
    myPersonal: string;
    settings: string;
  };
  chat: {
    title: string;
    subtitle: string;
    online: string;
    typing: string;
    typingMultiple: string;
    inputPlaceholder: string;
    send: string;
    attach: string;
    emoji: string;
    reply: string;
    replyingTo: string;
    cancelReply: string;
    pinnedMessages: string;
    pin: string;
    unpin: string;
    searchMessages: string;
    searchPlaceholder: string;
    noMessagesTitle: string;
    noMessagesDesc: string;
    quickPrompts: {
      grocery: string;
      dinner: string;
      onMyWay: string;
      emergency: string;
    };
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    fullName: string;
    emailOrPhone: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    loginBtn: string;
    registerBtn: string;
    createAccount: string;
    haveAccount: string;
    createFamily: string;
    joinFamily: string;
    familyName: string;
    inviteCode: string;
    switchDemoUser: string;
    logout: string;
  };
  personal: {
    title: string;
    lockTitle: string;
    lockDesc: string;
    unlockBtn: string;
    enterPin: string;
    pinPlaceholder: string;
    wrongPin: string;
    lockNow: string;
    enableLock: string;
    disableLock: string;
    dashboard: string;
    expenses: string;
    schoolWork: string;
    aiChat: string;
    photos: string;
    documents: string;
    notebook: string;
    dailyNeeds: string;
    plans: string;
    aiTitle: string;
    aiSubtitle: string;
    aiInputPlaceholder: string;
    roleGeneral: string;
    roleTutor: string;
    roleBudget: string;
    roleOrganizer: string;
  };
  settings: {
    title: string;
    language: string;
    theme: string;
    light: string;
    dark: string;
    system: string;
    personalLock: string;
    familySettings: string;
    familyInviteCode: string;
    copyCode: string;
    copied: string;
    profile: string;
  };
  common: {
    add: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    search: string;
    filter: string;
    all: string;
    unread: string;
    markAllRead: string;
    noData: string;
    status: string;
    loading: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: "FamilyHub",
    familySpace: "Family Space",
    personalSpace: "Personal Space",
    myPersonal: "🔒 My Personal",
    privateSpaceBadge: "Strictly Private & Encrypted",
    privateNotice: "No family member can see or access this space. Your personal records are securely isolated.",
    nav: {
      chat: "Chat",
      family: "Members",
      children: "Children",
      expenses: "Expenses",
      bills: "Bills",
      money: "Money",
      medical: "Medical",
      plans: "Planner",
      planner: "Planner",
      photos: "Photos",
      documents: "Documents",
      notes: "Notes",
      urgent: "Urgent",
      notifications: "Notifications",
      myPersonal: "🔒 My Personal",
      settings: "Settings",
    },
    chat: {
      title: "Family Chat",
      subtitle: "Always connected with family",
      online: "online",
      typing: "is typing...",
      typingMultiple: "are typing...",
      inputPlaceholder: "Message your family...",
      send: "Send",
      attach: "Attach file or photo",
      emoji: "Emoji",
      reply: "Reply",
      replyingTo: "Replying to",
      cancelReply: "Cancel reply",
      pinnedMessages: "Pinned Messages",
      pin: "Pin message",
      unpin: "Unpin",
      searchMessages: "Search chat",
      searchPlaceholder: "Search conversations...",
      noMessagesTitle: "No messages yet",
      noMessagesDesc: "Start the family conversation today.",
      quickPrompts: {
        grocery: "🛒 Can someone grab milk on the way home?",
        dinner: "🍲 What are we having for dinner tonight?",
        onMyWay: "🚗 On my way back home!",
        emergency: "⚠️ Urgent: Please check notification!",
      },
    },
    auth: {
      loginTitle: "Welcome back to FamilyHub",
      loginSubtitle: "Sign in to connect with your family and private space",
      registerTitle: "Create your FamilyHub account",
      registerSubtitle: "Start your connected family experience",
      fullName: "Full Name",
      emailOrPhone: "Email or Phone number",
      password: "Password",
      confirmPassword: "Confirm Password",
      forgotPassword: "Forgot password?",
      loginBtn: "Sign In",
      registerBtn: "Create Account",
      createAccount: "Don't have an account? Sign up",
      haveAccount: "Already have an account? Sign in",
      createFamily: "Create a New Family",
      joinFamily: "Join Family with Code",
      familyName: "Family Name (e.g. Khan Household)",
      inviteCode: "Enter 6-digit Invite Code",
      switchDemoUser: "Switch Demo Account",
      logout: "Log Out",
    },
    personal: {
      title: "My Personal Space",
      lockTitle: "Private Space Locked",
      lockDesc: "Enter your 4-digit PIN to access your private notes, expenses, and AI assistant.",
      unlockBtn: "Unlock Space",
      enterPin: "Enter 4-Digit Security PIN",
      pinPlaceholder: "••••",
      wrongPin: "Incorrect PIN. Default demo PIN is 1234.",
      lockNow: "Lock Now",
      enableLock: "Enable PIN Protection",
      disableLock: "Disable PIN",
      dashboard: "Personal Overview",
      expenses: "Private Expenses",
      schoolWork: "School & Work",
      aiChat: "AI Assistant",
      photos: "Private Photos",
      documents: "Private Documents",
      notebook: "Secret Notebook",
      dailyNeeds: "Daily Needs",
      plans: "Personal Plans",
      aiTitle: "Personal AI Assistant",
      aiSubtitle: "Your confidential helper for studying, budgeting, and planning",
      aiInputPlaceholder: "Ask anything confidentially...",
      roleGeneral: "General Assistant",
      roleTutor: "Study & Homework Tutor",
      roleBudget: "Personal Budget Advisor",
      roleOrganizer: "Schedule & Daily Organizer",
    },
    settings: {
      title: "Settings & Preferences",
      language: "Language / زبان",
      theme: "Appearance Theme",
      light: "Light",
      dark: "Dark",
      system: "System Default",
      personalLock: "Personal Space Lock",
      familySettings: "Family Settings",
      familyInviteCode: "Family Invite Code",
      copyCode: "Copy Code",
      copied: "Copied!",
      profile: "Your Profile",
    },
    common: {
      add: "Add New",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      search: "Search...",
      filter: "Filter",
      all: "All",
      unread: "Unread",
      markAllRead: "Mark all as read",
      noData: "Nothing to show right now.",
      status: "Status",
      loading: "Loading...",
    },
  },
  ur: {
    appName: "فیملی ہب (FamilyHub)",
    familySpace: "خاندانی گوشہ",
    personalSpace: "ذاتی گوشہ",
    myPersonal: "🔒 میرا ذاتی گوشہ",
    privateSpaceBadge: "مکمل طور پر نجی اور محفوظ",
    privateNotice: "خاندان کا کوئی فرد اس گوشے تک رسائی حاصل نہیں کر سکتا۔ آپ کا تمام ڈیٹا الگ اور محفوظ ہے۔",
    nav: {
      chat: "گفتگو (چیٹ)",
      family: "خاندان",
      children: "بچے اور اسکول",
      expenses: "اخراجات",
      bills: "بلز",
      money: "مالیات و اخراجات",
      medical: "طبی معلومات",
      plans: "پلانر و کیلنڈر",
      planner: "پلانر و کیلنڈر",
      photos: "تصاویر",
      documents: "دستاویزات",
      notes: "نوٹس",
      urgent: "فوری ضروریات",
      notifications: "اطلاعات",
      myPersonal: "🔒 میرا ذاتی گوشہ",
      settings: "ترتیبات",
    },
    chat: {
      title: "خاندانی چیٹ",
      subtitle: "ہمیشہ اپنوں کے قریب اور باخبر",
      online: "آن لائن",
      typing: "لکھ رہے ہیں...",
      typingMultiple: "لکھ رہے ہیں...",
      inputPlaceholder: "خاندان کو پیغام بھیجیں...",
      send: "بھیجیں",
      attach: "تصویر یا فائل منسلک کریں",
      emoji: "ایموجی",
      reply: "جواب دیں",
      replyingTo: "جواب دیا جا رہا ہے",
      cancelReply: "منسوخ",
      pinnedMessages: "اہم پیغامات (پن شدہ)",
      pin: "پن کریں",
      unpin: "ان پن کریں",
      searchMessages: "پیغامات تلاش کریں",
      searchPlaceholder: "چیٹ میں تلاش کریں...",
      noMessagesTitle: "ابھی تک کوئی پیغام نہیں",
      noMessagesDesc: "آج ہی خاندانی گفتگو کا آغاز کریں۔",
      quickPrompts: {
        grocery: "🛒 کیا واپسی پر دودھ لایا جا سکتا ہے؟",
        dinner: "🍲 آج رات کے کھانے میں کیا بن رہا ہے؟",
        onMyWay: "🚗 میں گھر واپس آ رہا ہوں!",
        emergency: "⚠️ فوری: براہ کرم اطلاع ملاحظہ کریں!",
      },
    },
    auth: {
      loginTitle: "فیملی ہب میں خوش آمدید",
      loginSubtitle: "اپنے خاندان اور ذاتی گوشے تک رسائی کے لیے سائن ان کریں",
      registerTitle: "نیا فیملی ہب اکاؤنٹ بنائیں",
      registerSubtitle: "خاندان کے ساتھ پرسکون اور باہم مربوط شروعات",
      fullName: "پورا نام",
      emailOrPhone: "ای میل یا فون نمبر",
      password: "پاس ورڈ",
      confirmPassword: "پاس ورڈ کی تصدیق",
      forgotPassword: "پاس ورڈ بھول گئے؟",
      loginBtn: "سائن ان کریں",
      registerBtn: "نیا اکاؤنٹ بنائیں",
      createAccount: "اکاؤنٹ نہیں ہے؟ نیا اکاؤنٹ بنائیں",
      haveAccount: "پہلے سے اکاؤنٹ موجود ہے؟ سائن ان کریں",
      createFamily: "نیا خاندان بنائیں",
      joinFamily: "کوڈ کے ذریعے شامل ہوں",
      familyName: "خاندان کا نام (مثلاً: خان ہاؤس ہولڈ)",
      inviteCode: "دعوت نامہ کوڈ درج کریں",
      switchDemoUser: "ڈیمو اکاؤنٹ تبدیل کریں",
      logout: "لاگ آؤٹ",
    },
    personal: {
      title: "میرا ذاتی گوشہ",
      lockTitle: "ذاتی گوشہ مقفل ہے",
      lockDesc: "اپنے نجی نوٹس، اخراجات اور اے آئی تک رسائی کے لیے اپنا 4 ہندسوں والا پن درج کریں۔",
      unlockBtn: "کھولیں",
      enterPin: "4 ہندسوں کا سیکیورٹی پن درج کریں",
      pinPlaceholder: "••••",
      wrongPin: "غلط پن۔ ڈیفالٹ ڈیمو پن 1234 ہے۔",
      lockNow: "ابھی مقفل کریں",
      enableLock: "پن کا تحفظ فعال کریں",
      disableLock: "پن ختم کریں",
      dashboard: "ذاتی جائزہ",
      expenses: "نجی اخراجات",
      schoolWork: "تعلیم اور کام",
      aiChat: "اے آئی اسسٹنٹ",
      photos: "نجی تصاویر",
      documents: "نجی دستاویزات",
      notebook: "خفیہ ڈائری",
      dailyNeeds: "روزمرہ ضروریات",
      plans: "ذاتی منصوبے",
      aiTitle: "ذاتی اے آئی مددگار",
      aiSubtitle: "مطالعہ، بجٹ اور روزانہ کی منصوبہ بندی میں رازدارانہ معاون",
      aiInputPlaceholder: "کوئی بھی سوال رازدارانہ انداز میں پوچھیں...",
      roleGeneral: "عمومی معاون",
      roleTutor: "تعلیمی استاد",
      roleBudget: "بجٹ مشیر",
      roleOrganizer: "شیڈول منتظم",
    },
    settings: {
      title: "ترتیبات",
      language: "زبان منتخب کریں",
      theme: "ظاہری شکل (تھیم)",
      light: "روشنی (لائٹ)",
      dark: "تاریک (ڈارک)",
      system: "سسٹم ڈیفالٹ",
      personalLock: "ذاتی گوشے کا لاک",
      familySettings: "خاندانی ترتیبات",
      familyInviteCode: "خاندانی دعوتی کوڈ",
      copyCode: "کوڈ کاپی کریں",
      copied: "کاپی ہو گیا!",
      profile: "آپ کا پروفائل",
    },
    common: {
      add: "شامل کریں",
      cancel: "منسوخ",
      save: "محفوظ کریں",
      delete: "حذف کریں",
      edit: "تبدیل کریں",
      search: "تلاش کریں...",
      filter: "فلٹر",
      all: "تمام",
      unread: "غیر پڑھے ہوئے",
      markAllRead: "سب کو پڑھا ہوا نشان زد کریں",
      noData: "فی الحال کوئی مواد دستیاب نہیں ہے۔",
      status: "حالت",
      loading: "لوڈ ہو رہا ہے...",
    },
  },
};
