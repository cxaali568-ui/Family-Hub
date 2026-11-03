/**
 * Centralized Internationalization Dictionary for FamilyHub
 * Supports 20 Languages with native script, RTL layout, and international formatting.
 */

import { LanguageCode } from './languages';
import { en } from './locales/en';
import { ur } from './locales/ur';
import { ar } from './locales/ar';
import { fa } from './locales/fa';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { tr } from './locales/tr';
import { zhCN } from './locales/zhCN';
import { zhTW } from './locales/zhTW';
import { ja } from './locales/ja';
import { ko } from './locales/ko';
import { hi } from './locales/hi';
import { bn } from './locales/bn';
import { ru } from './locales/ru';
import { nl } from './locales/nl';
import { id } from './locales/id';
import { ms } from './locales/ms';

export type Language = LanguageCode;

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
    appIdentity?: string;
    appIdentityDesc?: string;
    helpAndSupport?: string;
    helpAndSupportDesc?: string;
    contactSupport?: string;
    privacyPolicy?: string;
    privacyDesc?: string;
    installPwa?: string;
    logoutConfirmTitle?: string;
    logoutConfirmDesc?: string;
  };
  onboarding?: {
    welcomeTitle: string;
    welcomeDesc: string;
    createFamily: string;
    createFamilyDesc: string;
    joinFamily: string;
    joinFamilyDesc: string;
    forgotCodePrompt: string;
    forgotCodeTitle: string;
    rejoinFamily: string;
    enterCode: string;
    checkCode: string;
    back: string;
  };
  ai?: {
    title: string;
    subtitle: string;
    newChat: string;
    stop: string;
    send: string;
    inputPlaceholder: string;
    attachContext: string;
    settings: string;
    noChats: string;
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

/**
 * Deep fallback ensures any missing key inherits cleanly from English
 */
function mergeWithFallback(target: any, fallback: any): any {
  if (!target || typeof target !== 'object') return fallback;
  const result: any = Array.isArray(fallback) ? [...fallback] : { ...fallback };
  for (const key of Object.keys(target)) {
    const val = target[key];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'object' && !Array.isArray(val) && typeof fallback[key] === 'object') {
        result[key] = mergeWithFallback(val, fallback[key]);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

const rawTranslations: Record<LanguageCode, any> = {
  en,
  ur,
  ar,
  fa,
  fr,
  es,
  de,
  it,
  pt,
  tr,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ja,
  ko,
  hi,
  bn,
  ru,
  nl,
  id,
  ms,
};

export const translations: Record<LanguageCode, Translations> = {
  en,
  ur: mergeWithFallback(ur, en),
  ar: mergeWithFallback(ar, en),
  fa: mergeWithFallback(fa, en),
  fr: mergeWithFallback(fr, en),
  es: mergeWithFallback(es, en),
  de: mergeWithFallback(de, en),
  it: mergeWithFallback(it, en),
  pt: mergeWithFallback(pt, en),
  tr: mergeWithFallback(tr, en),
  'zh-CN': mergeWithFallback(zhCN, en),
  'zh-TW': mergeWithFallback(zhTW, en),
  ja: mergeWithFallback(ja, en),
  ko: mergeWithFallback(ko, en),
  hi: mergeWithFallback(hi, en),
  bn: mergeWithFallback(bn, en),
  ru: mergeWithFallback(ru, en),
  nl: mergeWithFallback(nl, en),
  id: mergeWithFallback(id, en),
  ms: mergeWithFallback(ms, en),
};
