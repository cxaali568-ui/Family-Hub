import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { chatService } from '../../services/chatService';
import { personalChatService } from '../../services/personalChatService';
import {
  Message,
  Attachment,
  PersonalChat,
  ChatItemPreference,
  User,
} from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { PinnedBanner } from './PinnedBanner';
import { MediaViewerModal } from './MediaViewerModal';
import { PersonalConversationView } from './PersonalConversationView';
import { NewChatModal } from './NewChatModal';
import { NewGroupModal } from './NewGroupModal';
import { CameraShareModal } from './CameraShareModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { formatMessageDateDivider } from '../../utils/dateUtils';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Search,
  Users,
  MessageSquare,
  MessageSquarePlus,
  Star,
  Pin,
  X,
  ChevronDown,
  UserPlus,
  AlertCircle,
  Bell,
  Trash2,
  Clock,
  CheckCheck,
  Menu,
  MoreVertical,
  ArrowLeft,
  Plus,
  Archive,
  ArchiveRestore,
  VolumeX,
  Volume2,
  Heart,
  MailCheck,
  LogOut,
  Eraser,
  Smartphone,
  Phone,
  Mail,
  Loader2,
  Camera,
  Film,
  ExternalLink,
  Wand2,
} from 'lucide-react';

type FilterTab = 'all' | 'unread' | 'favourites' | 'groups';

interface UnifiedChatRow {
  id: string;
  kind: 'family' | 'personal';
  chat?: PersonalChat;
  title: string;
  avatar?: string;
  isGroup: boolean;
  isExternal?: boolean;
  lastMessageText: string;
  lastMessageIsMine: boolean;
  lastMessageRead?: boolean;
  lastMessageTime: string;
  unreadCount: number;
  prefs: ChatItemPreference;
  searchableSubtitle?: string;
  otherId?: string;
}

interface RowMenuState {
  row: UnifiedChatRow;
  top: number;
  left: number;
}

function formatWhatsAppListTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMsgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfMsgDay) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const FamilyChatView: React.FC = () => {
  const { user } = useAuth();
  const {
    family,
    members,
    familyPermissions,
    setCurrentRoute,
    hasNoFamily,
    loadingFamilies,
    setMobileMenuOpen,
  } = useFamily();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  // Family Group Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [activeMemberIds, setActiveMemberIds] = useState<string[]>([]);
  const [importantMessageIds, setImportantMessageIds] = useState<string[]>([]);
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>([]);
  const [clearedAtForMe, setClearedAtForMe] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showClearChatConfirmModal, setShowClearChatConfirmModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // WhatsApp-style Unified Left Sidebar State
  const [personalChats, setPersonalChats] = useState<PersonalChat[]>([]);
  const [loadingPersonalChats, setLoadingPersonalChats] = useState(true);
  const [selectedThread, setSelectedThread] = useState<
    { type: 'family' } | { type: 'personal'; chat: PersonalChat }
  >({ type: 'family' });
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showArchivedView, setShowArchivedView] = useState(false);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const sidebarMenuRef = useRef<HTMLDivElement>(null);

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Directory search from main WhatsApp search input (phone / email / name)
  const [directoryMatches, setDirectoryMatches] = useState<User[]>([]);
  const [searchingDirectory, setSearchingDirectory] = useState(false);

  // Per-row Context Menu state & Modals
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const rowMenuPopupRef = useRef<HTMLDivElement>(null);
  const [clearPersonalTargetChat, setClearPersonalTargetChat] = useState<PersonalChat | null>(null);
  const [clearingPersonalChat, setClearingPersonalChat] = useState(false);
  const [removePersonalTargetChat, setRemovePersonalTargetChat] = useState<PersonalChat | null>(null);
  const [removingPersonalChat, setRemovingPersonalChat] = useState(false);

  const chatRoomId = family?.id ? `${family.id}_general` : '';
  const [familyChatPrefs, setFamilyChatPrefs] = useState<ChatItemPreference>({});

  // Load saved Family Group chat preferences
  useEffect(() => {
    if (chatRoomId && user?.id) {
      setFamilyChatPrefs(personalChatService.getFamilyChatPrefs(chatRoomId, user.id));
    } else {
      setFamilyChatPrefs({});
    }
  }, [chatRoomId, user?.id]);

  // Subscribe to all user personal 1:1 & private group chats (including cross-family direct contacts)
  useEffect(() => {
    if (!family?.id || !user?.id) {
      setPersonalChats([]);
      setLoadingPersonalChats(false);
      return;
    }

    setLoadingPersonalChats(true);
    const unsub = personalChatService.subscribeUserPersonalChats(
      family.id,
      user.id,
      (liveChats) => {
        setPersonalChats(liveChats);
        setLoadingPersonalChats(false);
      },
      () => setLoadingPersonalChats(false)
    );
    return () => unsub();
  }, [family?.id, user?.id]);

  // Debounced directory search from main "Search or start a new chat" input (phone/email)
  useEffect(() => {
    const trimmed = chatSearchQuery.trim();
    if (!user?.id || trimmed.length < 3) {
      setDirectoryMatches([]);
      setSearchingDirectory(false);
      return;
    }

    let cancelled = false;
    setSearchingDirectory(true);
    const timer = setTimeout(async () => {
      try {
        const res = await personalChatService.findUsersByPhoneOrEmail(trimmed, user.id);
        if (!cancelled) {
          const familyIds = new Set(members.map((m) => m.userId || m.id));
          setDirectoryMatches(res.filter((u) => !familyIds.has(u.id)));
        }
      } finally {
        if (!cancelled) setSearchingDirectory(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chatSearchQuery, user?.id, members]);

  // Start or open a 1:1 personal conversation immediately (family member OR external phone/email contact)
  const handleStartPersonalChat = (target: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    phone?: string;
    role?: string;
    isExternal?: boolean;
  }) => {
    if (!family?.id || !user || !target.id) return;

    const effectiveFamilyId = target.isExternal ? 'direct' : family.id;
    const chatId = personalChatService.getPersonalChatId(effectiveFamilyId, user.id, target.id);
    const existing = personalChats.find((c) => c.id === chatId);

    const now = new Date().toISOString();
    const chatToOpen: PersonalChat = existing || {
      id: chatId,
      familyId: effectiveFamilyId,
      ...(target.isExternal ? { isDirectExternal: true } : {}),
      participantIds: [user.id, target.id].sort(),
      participantDetails: {
        [user.id]: {
          id: user.id,
          name: user.name || user.fullName || 'You',
          avatar: user.avatar || user.profileImage || '',
          email: user.email || '',
          role: user.roleInFamily || 'Member',
        },
        [target.id]: {
          id: target.id,
          name: target.name || 'FamilyHub User',
          avatar: target.avatar || '',
          email: target.email || '',
          role: target.role || 'Member',
        },
      },
      unreadCounts: { [user.id]: 0, [target.id]: 0 },
      createdAt: now,
      updatedAt: now,
    };

    setSelectedThread({ type: 'personal', chat: chatToOpen });
    setMobileShowThread(true);
    setShowMembersDrawer(false);
    setMoreMenuOpen(false);
    setSidebarMenuOpen(false);

    personalChatService
      .ensurePersonalChatExists({
        familyId: family.id,
        currentUser: user,
        otherMember: {
          id: target.id,
          name: target.name,
          avatar: target.avatar,
          email: target.email,
          phone: target.phone,
          role: target.role,
        },
        isDirectExternal: target.isExternal,
      })
      .catch((err) => console.warn('Background personal chat ensure notice:', err));
  };

  // Create a new Private Group and open it right away
  const handleCreatePersonalGroup = async (params: {
    groupName: string;
    selectedMembers: Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>;
  }) => {
    if (!family?.id || !user) return;
    const createdGroup = await personalChatService.createPersonalGroup({
      familyId: family.id,
      groupName: params.groupName,
      currentUser: user,
      selectedMembers: params.selectedMembers,
    });
    setSelectedThread({ type: 'personal', chat: createdGroup });
    setMobileShowThread(true);
  };

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(targetNode)) {
        setMoreMenuOpen(false);
      }
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(targetNode)) {
        setSidebarMenuOpen(false);
      }
      if (rowMenuPopupRef.current && !rowMenuPopupRef.current.contains(targetNode)) {
        setRowMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearChatForMe = async () => {
    if (!chatRoomId || !family?.id || !user) return;
    setClearingChat(true);
    try {
      const ts = await chatService.clearMessagesForMe(chatRoomId, family.id, user.id);
      setClearedAtForMe(ts);
      setShowClearChatConfirmModal(false);
      setMoreMenuOpen(false);
      showSuccess('Chat cleared for you.');
    } catch (err: any) {
      showError(err?.message || 'Could not clear chat.');
    } finally {
      setClearingChat(false);
    }
  };

  const handleClearAllChatMessages = async () => {
    if (!chatRoomId || !user) return;
    setClearingChat(true);
    try {
      await chatService.clearAllMessages(chatRoomId, {
        id: user.id,
        name: user.name || user.fullName || 'Family Member',
      });
      setShowClearChatConfirmModal(false);
      setMoreMenuOpen(false);
      showSuccess('Chat cleared for everyone.');
    } catch (err: any) {
      showError(err?.message || 'Could not clear chat messages.');
    } finally {
      setClearingChat(false);
    }
  };

  // Notification management
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingNotifs, setClearingNotifs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  const isAnyoneLive = Boolean(
    typeof navigator !== 'undefined' &&
      navigator.onLine &&
      (activeMemberIds.length > 0 || typingUsers.length > 0)
  );

  useEffect(() => {
    if (user?.id) {
      setImportantMessageIds(chatService.getUserImportantList(user.id));
    }
  }, [user?.id]);

  // Subscribe to Family Group chat room messages & presence
  useEffect(() => {
    if (!family?.id || !user?.id || !chatRoomId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    initialScrollDone.current = false;

    chatService.ensureChatRoomExists(chatRoomId, family.id, family.name, user.id);
    chatService.setInChatPresence(chatRoomId, user, true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        chatService.setInChatPresence(chatRoomId, user, true);
      } else {
        chatService.setInChatPresence(chatRoomId, user, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        chatService.setInChatPresence(chatRoomId, user, true);
      }
    }, 25000);

    const unsubMessages = chatService.subscribeMessages(
      chatRoomId,
      100,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
        setErrorNotice(null);

        if (liveMessages.length > 0) {
          const lastMsg = liveMessages[liveMessages.length - 1];
          chatService.updateReadState(chatRoomId, family.id, user.id, lastMsg.id);
        }

        if (!initialScrollDone.current) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            initialScrollDone.current = true;
          }, 50);
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      },
      (err) => {
        console.warn('Real-time chat subscription error:', err);
        setErrorNotice('Unable to connect to live chat. Please verify your connection.');
        setLoadingMessages(false);
      }
    );

    const unsubPresence = chatService.subscribeActivePresence(
      chatRoomId,
      user.id,
      (activeIds, typers) => {
        setActiveMemberIds(activeIds);
        setTypingUsers(typers);
      }
    );

    setDeletedForMeIds(chatService.getLocalDeletedForIds(chatRoomId, user.id));
    const unsubCleared = chatService.subscribeClearedAtForUser(
      chatRoomId,
      user.id,
      (ts) => setClearedAtForMe(ts)
    );

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubCleared();
      chatService.setInChatPresence(chatRoomId, user, false);
      unsubMessages();
      unsubPresence();
    };
  }, [chatRoomId, family?.id, user?.id]);

  // Family Group message handlers
  const handleSendMessage = async (
    text: string,
    replyTo?: Message['replyTo'],
    attachments?: Attachment[]
  ) => {
    if (!user || !family || !chatRoomId) return;
    try {
      await chatService.sendMessage({
        chatRoomId,
        familyId: family.id,
        sender: user,
        text,
        replyTo,
        attachments,
      });
      setReplyingTo(null);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showError(err?.message || 'Failed to send message. Please try again.');
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !chatRoomId) return;
    await chatService.toggleReaction(chatRoomId, messageId, emoji, user.id);
  };

  const handleTogglePin = async (messageId: string, currentlyPinned: boolean) => {
    if (!user || !chatRoomId) return;
    await chatService.togglePin(chatRoomId, messageId, user.id, currentlyPinned);
  };

  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!user || !chatRoomId) return;
    await chatService.editMessage(chatRoomId, messageId, newText, user.id);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !chatRoomId) return;
    await chatService.deleteMessage(chatRoomId, messageId, user.id, familyPermissions.isAdmin);
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    if (!user || !chatRoomId) return;
    setDeletedForMeIds((prev) => (prev.includes(messageId) ? prev : [...prev, messageId]));
    await chatService.deleteMessageForMe(chatRoomId, messageId, user.id);
  };

  const handleToggleImportant = (messageId: string) => {
    if (!user) return;
    const isNow = chatService.toggleUserImportant(messageId, user.id);
    setImportantMessageIds((prev) =>
      isNow ? [...prev, messageId] : prev.filter((id) => id !== messageId)
    );
  };

  const quickPrompts = [
    '🍽️ Dinner is ready!',
    '🚗 Heading home now',
    '🛒 Need anything from the store?',
    '❤️ Hope everyone is having a great day!',
  ];

  const visibleFamilyMessages = useMemo(() => {
    return messages.filter((m) => {
      if (deletedForMeIds.includes(m.id)) return false;
      if (user?.id && m.deletedFor?.includes(user.id)) return false;
      if (clearedAtForMe && new Date(m.createdAt).getTime() <= new Date(clearedAtForMe).getTime()) {
        return false;
      }
      return true;
    });
  }, [messages, deletedForMeIds, clearedAtForMe, user?.id]);

  const filteredMessages = useMemo(() => {
    let list = visibleFamilyMessages;

    if (showImportantOnly) {
      list = list.filter((m) => importantMessageIds.includes(m.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.attachments?.some((a) => a.fileName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [visibleFamilyMessages, searchQuery, showImportantOnly, importantMessageIds]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && !m.deletedAt),
    [messages]
  );

  // Build Unified WhatsApp Chat List Rows (Family Group + Personal Groups + 1:1 Direct Chats)
  const allUnifiedRows = useMemo<UnifiedChatRow[]>(() => {
    const rows: UnifiedChatRow[] = [];

    // 1. Main Family Group Chat row
    if (family) {
      const latestFamilyMsg =
        visibleFamilyMessages.length > 0
          ? visibleFamilyMessages[visibleFamilyMessages.length - 1]
          : null;

      let preview = `${members.length} family members • Tap to chat`;
      let isMine = false;
      let msgTime = family.createdAt || '';

      if (latestFamilyMsg) {
        isMine = latestFamilyMsg.senderId === user?.id;
        msgTime = latestFamilyMsg.createdAt;
        if (latestFamilyMsg.deletedAt) {
          preview = 'This message was deleted.';
        } else if (latestFamilyMsg.text?.trim()) {
          preview = isMine
            ? latestFamilyMsg.text.trim()
            : `${latestFamilyMsg.senderName?.split(' ')[0] || 'Member'}: ${latestFamilyMsg.text.trim()}`;
        } else if (latestFamilyMsg.attachments?.length) {
          const att = latestFamilyMsg.attachments[0];
          const label =
            att.fileType === 'sticker'
              ? `🎭 ${att.stickerMeta?.caption || 'Sticker'}`
              : att.fileType === 'image'
              ? '📷 Photo'
              : att.fileType === 'video'
              ? '🎥 Video'
              : att.fileType === 'audio'
              ? '🎤 Voice message'
              : '📎 Attachment';
          preview = isMine ? label : `${latestFamilyMsg.senderName?.split(' ')[0] || 'Member'}: ${label}`;
        }
      }

      rows.push({
        id: '__family_group__',
        kind: 'family',
        title: family.name || 'My Family',
        avatar: family.photo || family.avatar,
        isGroup: true,
        lastMessageText: preview,
        lastMessageIsMine: isMine,
        lastMessageRead: true,
        lastMessageTime: msgTime,
        unreadCount: familyChatPrefs.markedUnread ? 1 : 0,
        prefs: familyChatPrefs,
        searchableSubtitle: 'family group all members',
      });
    }

    // 2. Personal 1:1 & Private Group Chat rows
    personalChats.forEach((chat) => {
      const isGroup = Boolean(chat.isGroup);
      const otherId = isGroup
        ? undefined
        : chat.participantIds.find((id) => id !== user?.id) || '';
      const other = otherId ? chat.participantDetails?.[otherId] : undefined;
      const title = isGroup
        ? chat.groupName || 'Private Group'
        : other?.name || 'Family Member';
      const prefs = (user?.id && chat.chatPreferences?.[user.id]) || {};
      const rawUnread = user?.id ? chat.unreadCounts?.[user.id] || 0 : 0;
      const unreadCount = rawUnread > 0 ? rawUnread : prefs.markedUnread ? 1 : 0;
      const isMine = chat.lastMessageSenderId === user?.id;

      rows.push({
        id: chat.id,
        kind: 'personal',
        chat,
        title,
        avatar: isGroup ? undefined : other?.avatar,
        isGroup,
        isExternal: Boolean(chat.isDirectExternal || chat.familyId === 'direct'),
        lastMessageText:
          chat.lastMessage ||
          (isGroup ? `${chat.participantIds.length} members` : 'Start chatting...'),
        lastMessageIsMine: isMine,
        lastMessageRead: isMine && (otherId ? (chat.unreadCounts?.[otherId] || 0) === 0 : true),
        lastMessageTime: chat.lastMessageAt || chat.updatedAt || chat.createdAt,
        unreadCount,
        prefs,
        searchableSubtitle: `${other?.email || ''} ${other?.role || ''}`,
        otherId,
      });
    });

    // Sort: Pinned first, then newest activity timestamp
    rows.sort((a, b) => {
      const pinA = a.prefs.isPinned ? 1 : 0;
      const pinB = b.prefs.isPinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return tB - tA;
    });

    return rows;
  }, [family, members.length, visibleFamilyMessages, personalChats, user?.id, familyChatPrefs]);

  const archivedRows = useMemo(
    () => allUnifiedRows.filter((r) => Boolean(r.prefs.isArchived)),
    [allUnifiedRows]
  );

  const totalUnreadChatsCount = useMemo(
    () =>
      allUnifiedRows.filter((r) => !r.prefs.isArchived && (r.unreadCount > 0 || r.prefs.markedUnread))
        .length,
    [allUnifiedRows]
  );

  const visibleChatRows = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();

    return allUnifiedRows.filter((r) => {
      if (showArchivedView) {
        if (!r.prefs.isArchived) return false;
      } else {
        if (r.prefs.isArchived && !q) return false;
      }

      if (!showArchivedView) {
        if (activeFilter === 'unread' && !(r.unreadCount > 0 || r.prefs.markedUnread)) return false;
        if (activeFilter === 'favourites' && !r.prefs.isFavourite) return false;
        if (activeFilter === 'groups' && !r.isGroup) return false;
      }

      if (q) {
        return (
          r.title.toLowerCase().includes(q) ||
          r.lastMessageText.toLowerCase().includes(q) ||
          (r.searchableSubtitle || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [allUnifiedRows, showArchivedView, activeFilter, chatSearchQuery]);

  // Family members who do not have an active 1:1 chat row yet (quick 1-tap start)
  const quickFamilyContacts = useMemo(() => {
    if (!user || showArchivedView) return [];
    if (activeFilter === 'groups' || activeFilter === 'unread' || activeFilter === 'favourites') {
      return [];
    }

    const activeOtherIds = new Set(
      personalChats
        .filter((c) => !c.isGroup)
        .map((c) => c.participantIds.find((id) => id !== user.id))
        .filter(Boolean)
    );

    const q = chatSearchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const mId = m.userId || m.id;
      if (!mId || mId === user.id || m.status === 'removed') return false;
      if (m.userEmail && user.email && m.userEmail.toLowerCase() === user.email.toLowerCase()) {
        return false;
      }
      if (activeOtherIds.has(mId)) return false;
      if (q) {
        return (
          (m.userName || '').toLowerCase().includes(q) ||
          (m.userEmail || '').toLowerCase().includes(q) ||
          (m.role || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, personalChats, user, showArchivedView, activeFilter, chatSearchQuery]);

  // Select thread from left list
  const handleSelectRow = (row: UnifiedChatRow) => {
    if (row.kind === 'family') {
      setSelectedThread({ type: 'family' });
      setMobileShowThread(true);
      if (familyChatPrefs.markedUnread && chatRoomId && user?.id) {
        const next = personalChatService.setFamilyChatPrefs(chatRoomId, user.id, {
          markedUnread: false,
        });
        setFamilyChatPrefs(next);
      }
    } else if (row.chat) {
      setSelectedThread({ type: 'personal', chat: row.chat });
      setMobileShowThread(true);
      if (user?.id && (row.prefs.markedUnread || row.unreadCount > 0)) {
        personalChatService.updateChatPreference(row.chat.id, user.id, { markedUnread: false });
        personalChatService.markChatAsRead(row.chat.id, user.id);
      }
    }
  };

  // Open floating WhatsApp row context menu
  const handleOpenRowMenu = (
    e: React.MouseEvent,
    row: UnifiedChatRow
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const menuWidth = 220;
    const menuHeight = row.kind === 'family' ? 275 : 320;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let left = rect.right - menuWidth;
    if (left < 12) left = Math.min(rect.left, vw - menuWidth - 12);
    if (left + menuWidth > vw - 12) left = vw - menuWidth - 12;

    let top = rect.bottom + 6;
    if (top + menuHeight > vh - 12) {
      top = Math.max(12, rect.top - menuHeight - 6);
    }

    setRowMenu({ row, top, left });
  };

  const handleToggleRowPreference = async (
    row: UnifiedChatRow,
    updates: Partial<ChatItemPreference>,
    successMsg?: string
  ) => {
    if (!user?.id) return;
    setRowMenu(null);
    if (row.kind === 'family') {
      if (!chatRoomId) return;
      const next = personalChatService.setFamilyChatPrefs(chatRoomId, user.id, updates);
      setFamilyChatPrefs(next);
      if (successMsg) showSuccess(successMsg);
    } else if (row.chat) {
      await personalChatService.updateChatPreference(row.chat.id, user.id, updates);
      if (successMsg) showSuccess(successMsg);
    }
  };

  // Keep selected PersonalChat synced with live Firestore data
  const liveSelectedPersonalChat = useMemo(() => {
    if (selectedThread.type !== 'personal') return null;
    return (
      personalChats.find((c) => c.id === selectedThread.chat.id) || selectedThread.chat
    );
  }, [selectedThread, personalChats]);

  // If user has not joined or created any family yet
  if (!loadingFamilies && hasNoFamily) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Welcome to FamilyHub
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Create your family space or join with an invitation code to start real-time messaging, sharing updates, and organizing your household.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setCurrentRoute('family')}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Create or Join Family
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* ==================== LEFT PANE: WHATSAPP-STYLE CHATS SIDEBAR ==================== */}
      <aside
        className={`${
          mobileShowThread ? 'hidden md:flex' : 'flex'
        } w-full md:w-[350px] lg:w-[390px] flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 h-full overflow-hidden`}
      >
        {/* Top Header: Menu (mobile) + Chats + 3-dots + Dark New Chat Button */}
        <div className="px-3.5 sm:px-4 pt-3 pb-2 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {showArchivedView ? (
              <button
                type="button"
                onClick={() => setShowArchivedView(false)}
                className="p-2 -ml-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Back to Chats"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-1.5 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                title="Navigation Menu"
                aria-label="Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
                {showArchivedView ? 'Archived' : 'FamilyHub'}
              </h1>
              {!showArchivedView && family?.name && (
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate leading-tight">
                  {family.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 relative" ref={sidebarMenuRef}>
            <button
              type="button"
              onClick={() => setSidebarMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Menu"
              aria-label="Chats menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowCameraModal(true)}
              className="w-9 h-9 rounded-full bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Camera: Capture photo, record video or share file"
              aria-label="Open camera"
            >
              <Camera className="w-4 h-4" />
            </button>

            {sidebarMenuOpen && (
              <div className="absolute top-11 right-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setShowNewChatModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <MessageSquarePlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>New chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setShowNewGroupModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>New group</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setShowNewChatModal(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Find by phone / contacts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setShowArchivedView((v) => !v);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Archive className="w-4 h-4 text-slate-500" />
                    <span>{showArchivedView ? 'All chats' : 'Archived chats'}</span>
                  </div>
                  {archivedRows.length > 0 && !showArchivedView && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-bold">
                      {archivedRows.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setShowNotificationModal(true);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-slate-500" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                <button
                  type="button"
                  onClick={() => {
                    setSidebarMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                >
                  <Avatar
                    src={user?.avatar || user?.profileImage}
                    name={user?.name || user?.fullName || 'Me'}
                    size="xs"
                  />
                  <span className="truncate">My Profile ({user?.name?.split(' ')[0] || 'Me'})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Input Pill */}
        <div className="px-3.5 sm:px-4 py-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full bg-slate-100 dark:bg-slate-800/90 text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 pl-10 pr-8 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            {chatSearchQuery && (
              <button
                type="button"
                onClick={() => setChatSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Row: All | Unread | Favourites | Groups | + */}
        {!showArchivedView && (
          <div className="px-3.5 sm:px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {(
              [
                { id: 'all', label: 'All' },
                {
                  id: 'unread',
                  label: totalUnreadChatsCount > 0 ? `Unread ${totalUnreadChatsCount}` : 'Unread',
                },
                { id: 'favourites', label: 'Favourites' },
                { id: 'groups', label: 'Groups' },
              ] as const
            ).map((pill) => {
              const active = activeFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveFilter(pill.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-100/90 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowNewGroupModal(true)}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
              title="Create New Group"
              aria-label="Create New Group"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Unified Scrollable Chats List */}
        <div className="flex-1 overflow-y-auto touch-scroll divide-y divide-slate-100/70 dark:divide-slate-800/60">
          {/* Archived Banner Row */}
          {!showArchivedView &&
            activeFilter === 'all' &&
            !chatSearchQuery.trim() &&
            archivedRows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchivedView(true)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-8 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Archive className="w-4 h-4" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                    Archived
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {archivedRows.length}
                </span>
              </button>
            )}

          {loadingPersonalChats && allUnifiedRows.length <= 1 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading chats...
            </div>
          ) : visibleChatRows.length === 0 && quickFamilyContacts.length === 0 && directoryMatches.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {showArchivedView
                  ? 'No archived chats.'
                  : activeFilter !== 'all'
                  ? `No ${activeFilter} chats found.`
                  : 'No matching chats found.'}
              </p>
              {!showArchivedView && (
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" /> Start New Chat
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Active Conversations Rows */}
              {visibleChatRows.map((row) => {
                const isSelected =
                  row.kind === 'family'
                    ? selectedThread.type === 'family'
                    : selectedThread.type === 'personal' && selectedThread.chat.id === row.id;

                return (
                  <div
                    key={row.id}
                    onClick={() => handleSelectRow(row)}
                    onContextMenu={(e) => handleOpenRowMenu(e, row)}
                    className={`group px-3.5 sm:px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-slate-100/90 dark:bg-slate-800/90'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar / Group Icon */}
                    <div className="shrink-0 relative">
                      {row.isGroup && !row.avatar ? (
                        <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <Avatar src={row.avatar} name={row.title} size="md" />
                      )}
                    </div>

                    {/* Title + Message Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3
                            className={`text-[14px] truncate ${
                              row.unreadCount > 0
                                ? 'font-extrabold text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {row.title}
                          </h3>
                          {row.isExternal && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                              Contact
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] shrink-0 ${
                            row.unreadCount > 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {formatWhatsAppListTime(row.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          {row.lastMessageIsMine && (
                            <CheckCheck
                              className={`w-3.5 h-3.5 shrink-0 ${
                                row.lastMessageRead ? 'text-sky-500' : 'text-slate-400'
                              }`}
                            />
                          )}
                          <p
                            className={`text-xs truncate ${
                              row.unreadCount > 0
                                ? 'text-slate-800 dark:text-slate-200 font-semibold'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {row.lastMessageIsMine ? `You: ${row.lastMessageText}` : row.lastMessageText}
                          </p>
                        </div>

                        {/* Status icons + Unread Pill + Row Chevron Menu Trigger */}
                        <div className="flex items-center gap-1 shrink-0">
                          {row.prefs.isMuted && (
                            <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {row.prefs.isPinned && (
                            <Pin className="w-3.5 h-3.5 text-slate-400 rotate-45" />
                          )}
                          {row.prefs.isFavourite && (
                            <Heart className="w-3 h-3 text-rose-500 fill-current" />
                          )}
                          {row.unreadCount > 0 && (
                            <span className="min-w-[19px] h-[19px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                              {row.prefs.markedUnread && row.unreadCount === 1
                                ? ''
                                : row.unreadCount > 99
                                ? '99+'
                                : row.unreadCount}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleOpenRowMenu(e, row)}
                            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 opacity-75 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                            title="Chat options"
                            aria-label="Chat options"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Start Family Contacts (members without an active 1:1 thread yet) */}
              {quickFamilyContacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Family Contacts
                  </div>
                  {quickFamilyContacts.map((m) => {
                    const memberNameLower = (m.userName || '').toLowerCase();
                    const memberNotifCount = notifications.filter((n) => {
                      if (n.readAt) return false;
                      return (
                        Boolean(memberNameLower) &&
                        ((n.title || '').toLowerCase().includes(memberNameLower) ||
                          (n.message || '').toLowerCase().includes(memberNameLower))
                      );
                    }).length;

                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          handleStartPersonalChat({
                            id: m.userId || m.id,
                            name: m.userName || 'Family Member',
                            avatar: m.userPhoto,
                            email: m.userEmail,
                            role: m.role,
                          })
                        }
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="md" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {m.userName || 'Family Member'}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate capitalize">
                              {m.role || 'Member'} • Tap to message
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {memberNotifCount > 0 ? (
                            <span
                              className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-2xs"
                              title={`${memberNotifCount} unread notification(s)`}
                            >
                              {memberNotifCount > 99 ? '99+' : memberNotifCount}
                            </span>
                          ) : (
                            <Bell className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Global FamilyHub Users Matching Search (Phone / Email / Name) */}
              {chatSearchQuery.trim().length >= 3 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                    <span>FamilyHub Users (Phone / Email)</span>
                    {searchingDirectory && <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />}
                  </div>
                  {!searchingDirectory && directoryMatches.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">
                      No external user found matching "{chatSearchQuery.trim()}".
                    </p>
                  ) : (
                    directoryMatches.map((u) => (
                      <div
                        key={u.id}
                        onClick={() =>
                          handleStartPersonalChat({
                            id: u.id,
                            name: u.name || u.fullName || 'FamilyHub User',
                            avatar: u.avatar || u.profileImage,
                            email: u.email,
                            phone: u.phone,
                            isExternal: true,
                          })
                        }
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-emerald-50/50 dark:hover:bg-slate-800/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={u.avatar || u.profileImage} name={u.name || 'User'} size="md" />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">
                              {u.name || u.fullName}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                              {u.phone && (
                                <span className="inline-flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" /> {u.phone}
                                </span>
                              )}
                              {u.email && (
                                <span className="inline-flex items-center gap-0.5 truncate">
                                  <Mail className="w-3 h-3" /> {u.email}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Bell className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Bar: Trending Free Google AI Suite (ImageFX + Real Gemini + Google Flow) */}
        <div className="px-2 py-1.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-around gap-1 shrink-0">
          <a
            href="https://labs.google/fx/tools/image-fx"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Google ImageFX — Free AI Image Creator (labs.google/fx/tools/image-fx)"
            className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/70 dark:text-slate-300 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40 font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <div className="px-3 py-0.5 mb-0.5 relative flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <ExternalLink className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-slate-400" />
            </div>
            <span>ImageFX</span>
          </a>

          <a
            href="https://gemini.google.com/app"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Real Google Gemini (gemini.google.com)"
            className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/70 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <div className="px-3 py-0.5 mb-0.5 relative flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 2C12.4 7.3 16.7 11.6 22 12C16.7 12.4 12.4 16.7 12 22C11.6 16.7 7.3 12.4 2 12C7.3 11.6 11.6 7.3 12 2Z" />
              </svg>
              <ExternalLink className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-slate-400" />
            </div>
            <span>Gemini</span>
          </a>

          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Google Flow — Free AI Video Studio (labs.google/fx/tools/flow)"
            className="flex-1 flex flex-col items-center justify-center py-1 rounded-xl text-slate-600 hover:text-violet-600 hover:bg-violet-50/70 dark:text-slate-300 dark:hover:text-violet-400 dark:hover:bg-violet-950/40 font-semibold text-[11px] transition-colors cursor-pointer"
          >
            <div className="px-3 py-0.5 mb-0.5 relative flex items-center justify-center">
              <Film className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <ExternalLink className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-slate-400" />
            </div>
            <span>Google Flow</span>
          </a>
        </div>
      </aside>

      {/* ==================== RIGHT PANE: ACTIVE CONVERSATION ==================== */}
      <section
        className={`${
          mobileShowThread ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col min-w-0 h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative`}
      >
        {selectedThread.type === 'personal' && liveSelectedPersonalChat ? (
          <PersonalConversationView
            chat={liveSelectedPersonalChat}
            hideBackOnDesktop={true}
            onBack={() => setMobileShowThread(false)}
            onDeleteChat={async () => {
              if (!user?.id) return;
              await personalChatService.deleteOrLeavePersonalChat({
                chatId: liveSelectedPersonalChat.id,
                currentUserId: user.id,
                isGroup: liveSelectedPersonalChat.isGroup,
                createdBy: liveSelectedPersonalChat.createdBy,
              });
              setSelectedThread({ type: 'family' });
              setMobileShowThread(false);
            }}
            onRenameGroup={
              liveSelectedPersonalChat.isGroup
                ? async (newName: string) => {
                    await personalChatService.renamePersonalGroup(
                      liveSelectedPersonalChat.id,
                      newName
                    );
                  }
                : undefined
            }
          />
        ) : (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
            {/* Family Group Conversation Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0 min-h-[56px]">
              <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  className="md:hidden min-h-[40px] min-w-[40px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Back to Chats"
                  aria-label="Back to Chats"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div
                  onClick={() => setShowMembersDrawer(true)}
                  className="flex items-center gap-2.5 sm:gap-3 overflow-hidden cursor-pointer hover:opacity-90 active:scale-98 transition-all"
                  title="View Family Details & Members"
                >
                  <Avatar
                    src={family?.photo || family?.avatar}
                    name={family?.name || 'Family'}
                    size="md"
                    className="ring-2 ring-indigo-500/20 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                        {family?.name || 'Family'}
                      </h2>
                      {isAnyoneLive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                      {isAnyoneLive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {activeMemberIds.length} online now
                          </span>
                        </>
                      ) : (
                        <span>tap for info • {members.length} members</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Thread Controls */}
              <div className="flex items-center gap-1 shrink-0 relative" ref={moreMenuRef}>
                <button
                  onClick={() => {
                    setIsSearching(!isSearching);
                    if (isSearching) setSearchQuery('');
                  }}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    isSearching
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={t.chat.searchMessages || 'Search messages'}
                  aria-label="Search messages"
                >
                  <Search className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setShowImportantOnly(!showImportantOnly)}
                  className={`hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    showImportantOnly
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title={showImportantOnly ? 'Show all messages' : 'Show starred messages only'}
                  aria-label="Starred messages"
                >
                  <Star className={`w-5 h-5 ${showImportantOnly ? 'fill-current text-amber-500' : ''}`} />
                </button>

                <button
                  onClick={() => setShowMembersDrawer(true)}
                  className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="View Family Members"
                  aria-label="Family members"
                >
                  <Users className="w-5 h-5" />
                </button>

                <button
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    moreMenuOpen
                      ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Group Options"
                  aria-label="More options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {moreMenuOpen && (
                  <div className="absolute top-11 right-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setShowMembersDrawer(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Family Members & Info</span>
                    </button>

                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setShowImportantOnly(!showImportantOnly);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                    >
                      <Star className={`w-4 h-4 ${showImportantOnly ? 'fill-current text-amber-500' : 'text-amber-500'}`} />
                      <span>{showImportantOnly ? 'Show All Messages' : 'Starred Messages'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setShowNotificationModal(true);
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-slate-500" />
                        <span>Notifications & Alerts</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                    <button
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setShowClearChatConfirmModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Clear Chat</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* In-thread Search Bar */}
            {isSearching && (
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.chat.searchPlaceholder || 'Search message history...'}
                  className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {filteredMessages.length} found
                  </span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSearching(false);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Close search"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Starred filter banner */}
            {showImportantOnly && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 shrink-0">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span className="font-semibold">
                    Showing Starred Messages only ({filteredMessages.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowImportantOnly(false)}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}

            {/* Error Notice */}
            {errorNotice && (
              <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{errorNotice}</span>
              </div>
            )}

            {/* Pinned Messages Banner */}
            <PinnedBanner
              pinnedMessages={pinnedMessages}
              onUnpin={(msgId) => handleTogglePin(msgId, true)}
            />

            {/* Family Messages Stream */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1">
              {loadingMessages ? (
                <LoadingState message="Loading family messages..." />
              ) : filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <EmptyState
                    icon={<MessageSquare className="w-8 h-8 text-indigo-500" />}
                    title={
                      searchQuery
                        ? 'No matching messages'
                        : showImportantOnly
                        ? 'No starred messages yet'
                        : 'Start your family conversation'
                    }
                    description={
                      searchQuery
                        ? 'Try searching with a different word or phrase.'
                        : showImportantOnly
                        ? 'Star important notices, grocery items, or updates to view them here.'
                        : 'Say hello, share a photo of your day, or update everyone on dinner plans 👋'
                    }
                  />

                  {!searchQuery && !showImportantOnly && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 max-w-md">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => handleSendMessage(prompt)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                filteredMessages.map((msg, index) => {
                  const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                  const currentDateStr = new Date(msg.createdAt).toDateString();
                  const prevDateStr = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
                  const showDateDivider = currentDateStr !== prevDateStr;

                  const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
                  const timeDiff = prevMsg
                    ? new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()
                    : 0;
                  const isCloseInTime = timeDiff < 3 * 60 * 1000;
                  const isFirstInGroup = !isSameSender || !isCloseInTime || showDateDivider;

                  const isCurrent = user ? msg.senderId === user.id : false;
                  const isImportant = importantMessageIds.includes(msg.id);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-4">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800/80 shadow-2xs">
                            {formatMessageDateDivider(msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <MessageBubble
                        message={msg}
                        isCurrentUser={isCurrent}
                        isFirstInGroup={isFirstInGroup}
                        onReply={(m) => setReplyingTo(m)}
                        onToggleReaction={handleToggleReaction}
                        onTogglePin={handleTogglePin}
                        onEditMessage={handleEditMessage}
                        onDeleteMessage={handleDeleteMessage}
                        onDeleteMessageForMe={handleDeleteMessageForMe}
                        onPreviewAttachment={(att) => setPreviewAttachment(att)}
                        isImportant={isImportant}
                        onToggleImportant={handleToggleImportant}
                        currentUserId={user?.id || ''}
                        canPin={familyPermissions.isAdmin}
                        canDeleteForEveryone={familyPermissions.isAdmin}
                      />
                    </React.Fragment>
                  );
                })
              )}

              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 animate-in fade-in">
                  <div className="flex gap-1 items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-1.5">
                      {typingUsers.length === 1
                        ? `${typingUsers[0]} is typing...`
                        : `${typingUsers.join(', ')} are typing...`}
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Family Message Composer */}
            {user && family && (
              <MessageComposer
                chatRoomId={chatRoomId}
                familyId={family.id}
                currentUser={user}
                onSendMessage={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={() => setReplyingTo(null)}
                familyName={family.name || 'Family Group'}
                recentMessages={filteredMessages.slice(-6).map((m) => ({
                  senderName: m.senderName,
                  text: m.text,
                }))}
              />
            )}

            {/* Slide-in Members Drawer */}
            {showMembersDrawer && (
              <div className="absolute inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 p-5 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                      Family Members
                    </h3>
                    <p className="text-xs text-slate-400">
                      {members.length} active in {family?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMembersDrawer(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                  {members.map((m) => {
                    const isMe = m.userId === user?.id;
                    const isOnline = isMe || activeMemberIds.includes(m.userId);
                    const memberNameLower = (m.userName || '').toLowerCase();
                    const memberNotifCount = !isMe
                      ? notifications.filter((n) => {
                          if (n.readAt) return false;
                          return (
                            Boolean(memberNameLower) &&
                            ((n.title || '').toLowerCase().includes(memberNameLower) ||
                              (n.message || '').toLowerCase().includes(memberNameLower))
                          );
                        }).length
                      : 0;
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (!isMe && m.userId) {
                            handleStartPersonalChat({
                              id: m.userId,
                              name: m.userName || 'Family Member',
                              avatar: m.userPhoto,
                              email: m.userEmail,
                              role: m.role,
                            });
                          }
                        }}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl transition-colors ${
                          !isMe
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                            : ''
                        }`}
                      >
                        <Avatar
                          src={isMe ? user?.avatar || user?.profileImage || m.userPhoto : m.userPhoto}
                          name={
                            isMe
                              ? user?.name || user?.fullName || m.userName || 'Member'
                              : m.userName || 'Member'
                          }
                          size="md"
                          status={isOnline ? 'online' : undefined}
                        />
                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {m.userName || 'Member'}
                            </p>
                            {isMe && (
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] text-slate-400 capitalize">
                              {m.role === 'owner'
                                ? '👑 Owner'
                                : m.role === 'admin'
                                ? '⭐ Admin'
                                : 'Member'}
                            </p>
                            <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                            <span
                              className={`text-[10px] font-semibold ${
                                isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {!isMe && m.userId && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {memberNotifCount > 0 ? (
                              <span
                                className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-2xs"
                                title={`${memberNotifCount} unread notification(s)`}
                              >
                                {memberNotifCount > 99 ? '99+' : memberNotifCount}
                              </span>
                            ) : (
                              <Bell className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowMembersDrawer(false);
                      setCurrentRoute('family');
                    }}
                    className="w-full py-2.5 px-4 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-center cursor-pointer"
                  >
                    Manage Family & Invites →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ==================== WHATSAPP FLOATING ROW CONTEXT MENU ==================== */}
      {rowMenu && (
        <div
          ref={rowMenuPopupRef}
          style={{ top: rowMenu.top, left: rowMenu.left }}
          className="fixed w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() =>
              handleToggleRowPreference(
                rowMenu.row,
                { isArchived: !rowMenu.row.prefs.isArchived },
                rowMenu.row.prefs.isArchived ? 'Chat unarchived' : 'Chat archived'
              )
            }
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            {rowMenu.row.prefs.isArchived ? (
              <ArchiveRestore className="w-4 h-4 text-slate-500" />
            ) : (
              <Archive className="w-4 h-4 text-slate-500" />
            )}
            <span>{rowMenu.row.prefs.isArchived ? 'Unarchive chat' : 'Archive chat'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToggleRowPreference(
                rowMenu.row,
                { isMuted: !rowMenu.row.prefs.isMuted },
                rowMenu.row.prefs.isMuted ? 'Notifications unmuted' : 'Notifications muted'
              )
            }
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            {rowMenu.row.prefs.isMuted ? (
              <Volume2 className="w-4 h-4 text-slate-500" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
            <span>
              {rowMenu.row.prefs.isMuted ? 'Unmute notifications' : 'Mute notifications'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToggleRowPreference(
                rowMenu.row,
                { isPinned: !rowMenu.row.prefs.isPinned },
                rowMenu.row.prefs.isPinned ? 'Chat unpinned' : 'Chat pinned'
              )
            }
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            <Pin className="w-4 h-4 text-slate-500" />
            <span>{rowMenu.row.prefs.isPinned ? 'Unpin chat' : 'Pin chat'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToggleRowPreference(rowMenu.row, {
                markedUnread: !(rowMenu.row.unreadCount > 0 || rowMenu.row.prefs.markedUnread),
              })
            }
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            <MailCheck className="w-4 h-4 text-slate-500" />
            <span>
              {rowMenu.row.unreadCount > 0 || rowMenu.row.prefs.markedUnread
                ? 'Mark as read'
                : 'Mark as unread'}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleToggleRowPreference(
                rowMenu.row,
                { isFavourite: !rowMenu.row.prefs.isFavourite },
                rowMenu.row.prefs.isFavourite
                  ? 'Removed from favourites'
                  : 'Added to favourites'
              )
            }
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${
                rowMenu.row.prefs.isFavourite ? 'text-rose-500 fill-current' : 'text-slate-500'
              }`}
            />
            <span>
              {rowMenu.row.prefs.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
            </span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

          <button
            type="button"
            onClick={() => {
              const target = rowMenu.row;
              setRowMenu(null);
              if (target.kind === 'family') {
                setShowClearChatConfirmModal(true);
              } else if (target.chat) {
                setClearPersonalTargetChat(target.chat);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left cursor-pointer"
          >
            <Eraser className="w-4 h-4 text-slate-500" />
            <span>Clear chat</span>
          </button>

          {rowMenu.row.kind === 'personal' && rowMenu.row.chat && (
            <button
              type="button"
              onClick={() => {
                const chatObj = rowMenu.row.chat!;
                setRowMenu(null);
                setRemovePersonalTargetChat(chatObj);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>{rowMenu.row.isGroup ? 'Exit group' : 'Remove chat'}</span>
            </button>
          )}
        </div>
      )}

      {/* ==================== MODALS ==================== */}
      {previewAttachment && (
        <MediaViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onStartChatWithMember={handleStartPersonalChat}
        onOpenNewGroup={() => setShowNewGroupModal(true)}
      />

      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onCreateGroup={handleCreatePersonalGroup}
      />

      <CameraShareModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        personalChats={personalChats}
        chatRoomId={chatRoomId}
      />

      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />

      {/* Notifications Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title="Notifications & Alerts"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowClearConfirmModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No alerts right now</h4>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                const isUrgent = notif.type === 'urgent_item' || notif.type === 'urgent_need';
                const isMsg = notif.type === 'new_message';
                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      isUnread
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-600'
                          : isMsg
                          ? 'bg-indigo-100 text-indigo-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {isUrgent ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : isMsg ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => isUnread && markAsRead(notif.id)}
                    >
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                      aria-label="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Clear All Notifications Confirmation */}
      <Modal
        isOpen={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        title="Clear All Notifications?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Clear all notification alerts? Your chat messages will not be affected.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearingNotifs}
              onClick={async () => {
                setClearingNotifs(true);
                try {
                  await clearAllNotifications();
                  setShowClearConfirmModal(false);
                } finally {
                  setClearingNotifs(false);
                }
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Family Group Chat Modal */}
      <Modal
        isOpen={showClearChatConfirmModal}
        onClose={() => setShowClearChatConfirmModal(false)}
        title="Clear Family Chat History"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose whether to clear messages only for you or for everyone in "{family?.name}".
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={clearingChat}
              onClick={handleClearChatForMe}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-left cursor-pointer disabled:opacity-50"
            >
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Clear for Me</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hides all previous messages only on your account.
              </p>
            </button>
            <button
              type="button"
              disabled={clearingChat}
              onClick={handleClearAllChatMessages}
              className="w-full p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-left cursor-pointer disabled:opacity-50"
            >
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Clear for Everyone</p>
              <p className="text-[11px] text-rose-600/80 mt-0.5">
                Permanently deletes messages for all family members.
              </p>
            </button>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearChatConfirmModal(false)}
              disabled={clearingChat}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Personal Chat Modal (from Left Row Menu) */}
      <Modal
        isOpen={Boolean(clearPersonalTargetChat)}
        onClose={() => !clearingPersonalChat && setClearPersonalTargetChat(null)}
        title="Clear Chat?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Clear conversation messages only for yourself or for everyone?
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearPersonalTargetChat(null)}
              disabled={clearingPersonalChat}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={clearingPersonalChat}
              onClick={async () => {
                if (!clearPersonalTargetChat || !user?.id) return;
                setClearingPersonalChat(true);
                try {
                  await personalChatService.clearPersonalChatForMe(clearPersonalTargetChat.id, user.id);
                  setClearPersonalTargetChat(null);
                  showSuccess('Chat cleared for you.');
                } catch (err: any) {
                  showError(err?.message || 'Could not clear chat.');
                } finally {
                  setClearingPersonalChat(false);
                }
              }}
            >
              Clear for Me
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearingPersonalChat}
              onClick={async () => {
                if (!clearPersonalTargetChat || !user?.id) return;
                setClearingPersonalChat(true);
                try {
                  await personalChatService.clearPersonalChatMessages(
                    clearPersonalTargetChat.id,
                    user.id
                  );
                  setClearPersonalTargetChat(null);
                  showSuccess('Chat cleared for everyone.');
                } catch (err: any) {
                  showError(err?.message || 'Could not clear chat.');
                } finally {
                  setClearingPersonalChat(false);
                }
              }}
            >
              Clear for Everyone
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Personal Chat / Exit Group Modal */}
      <Modal
        isOpen={Boolean(removePersonalTargetChat)}
        onClose={() => !removingPersonalChat && setRemovePersonalTargetChat(null)}
        title={removePersonalTargetChat?.isGroup ? 'Exit Group?' : 'Remove Chat?'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {removePersonalTargetChat?.isGroup
              ? `Remove or leave "${removePersonalTargetChat.groupName || 'this group'}"?`
              : 'Remove this conversation from your chats list?'}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemovePersonalTargetChat(null)}
              disabled={removingPersonalChat}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={removingPersonalChat}
              onClick={async () => {
                if (!removePersonalTargetChat || !user?.id) return;
                setRemovingPersonalChat(true);
                try {
                  await personalChatService.deleteOrLeavePersonalChat({
                    chatId: removePersonalTargetChat.id,
                    currentUserId: user.id,
                    isGroup: removePersonalTargetChat.isGroup,
                    createdBy: removePersonalTargetChat.createdBy,
                  });
                  if (
                    selectedThread.type === 'personal' &&
                    selectedThread.chat.id === removePersonalTargetChat.id
                  ) {
                    setSelectedThread({ type: 'family' });
                    setMobileShowThread(false);
                  }
                  setRemovePersonalTargetChat(null);
                  showSuccess(
                    removePersonalTargetChat.isGroup ? 'Group removed' : 'Chat removed'
                  );
                } catch (err: any) {
                  showError(err?.message || 'Could not remove chat.');
                } finally {
                  setRemovingPersonalChat(false);
                }
              }}
            >
              {removePersonalTargetChat?.isGroup ? 'Exit Group' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
