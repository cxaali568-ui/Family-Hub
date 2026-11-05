import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { chatService } from '../../services/chatService';
import { Message, Attachment } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { PinnedBanner } from './PinnedBanner';
import { MediaViewerModal } from './MediaViewerModal';
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
  Sparkles,
  Star,
  Pin,
  X,
  ChevronDown,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Bell,
  Trash2,
  Clock,
  CheckCheck,
  Smartphone,
  Menu,
  MoreVertical,
} from 'lucide-react';

export const FamilyChatView: React.FC = () => {
  const { user } = useAuth();
  const { family, members, familyPermissions, setCurrentRoute, hasNoFamily, loadingFamilies, setMobileMenuOpen } = useFamily();
  const { t } = useLanguage();
  const { showError } = useToast();

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
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showClearChatConfirmModal, setShowClearChatConfirmModal] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots overflow menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

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
    } catch (err: any) {
      showError(err?.message || 'Could not clear chat messages.');
    } finally {
      setClearingChat(false);
    }
  };

  // Notification management in Family Chat
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    mobilePushEnabled,
    toggleMobilePush,
  } = useNotifications();
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearingNotifs, setClearingNotifs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Compute active family chat room id
  const chatRoomId = family?.id ? `${family.id}_general` : '';

  // Only consider chat room Live if other family members are active or typing
  const isAnyoneLive = Boolean(typeof navigator !== 'undefined' && navigator.onLine && (activeMemberIds.length > 0 || typingUsers.length > 0));

  // Load user's starred/important messages from local preference
  useEffect(() => {
    if (user?.id) {
      setImportantMessageIds(chatService.getUserImportantList(user.id));
    }
  }, [user?.id]);

  // Ensure chat room exists in Firestore, maintain presence heartbeat, and subscribe to messages
  useEffect(() => {
    if (!family?.id || !user?.id || !chatRoomId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    initialScrollDone.current = false;

    // Make sure room doc exists
    chatService.ensureChatRoomExists(chatRoomId, family.id, family.name, user.id);

    // Register initial active presence in room
    chatService.setInChatPresence(chatRoomId, user, true);

    // Heartbeat presence every 25 seconds while chat view is open and tab is active
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        chatService.setInChatPresence(chatRoomId, user, true);
      }
    }, 25000);

    // Subscribe to real-time messages
    const unsubMessages = chatService.subscribeMessages(
      chatRoomId,
      100,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
        setErrorNotice(null);

        // Update read cursor for current user with the latest message
        if (liveMessages.length > 0) {
          const lastMsg = liveMessages[liveMessages.length - 1];
          chatService.updateReadState(chatRoomId, family.id, user.id, lastMsg.id);
        }

        // Auto-scroll logic: smooth on new messages, instant on first load
        if (!initialScrollDone.current) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            initialScrollDone.current = true;
          }, 50);
        } else {
          // Only auto-scroll if near bottom or sent by current user
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      },
      (err) => {
        console.warn('Real-time chat subscription error:', err);
        setErrorNotice('Unable to connect to live chat. Please verify your connection.');
        setLoadingMessages(false);
      }
    );

    // Subscribe to real-time presence and typing indicators
    const unsubPresence = chatService.subscribeActivePresence(
      chatRoomId,
      user.id,
      (activeIds, typers) => {
        setActiveMemberIds(activeIds);
        setTypingUsers(typers);
      }
    );

    return () => {
      clearInterval(heartbeatInterval);
      chatService.setInChatPresence(chatRoomId, user, false);
      unsubMessages();
      unsubPresence();
    };
  }, [chatRoomId, family?.id, user?.id]);

  // Handle sending a message
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

  // Toggle emoji reaction
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !chatRoomId) return;
    await chatService.toggleReaction(chatRoomId, messageId, emoji, user.id);
  };

  // Toggle message pin
  const handleTogglePin = async (messageId: string, currentlyPinned: boolean) => {
    if (!user || !chatRoomId) return;
    await chatService.togglePin(chatRoomId, messageId, user.id, currentlyPinned);
  };

  // Edit message
  const handleEditMessage = async (messageId: string, newText: string) => {
    if (!user || !chatRoomId) return;
    await chatService.editMessage(chatRoomId, messageId, newText, user.id);
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !chatRoomId) return;
    await chatService.deleteMessage(chatRoomId, messageId, user.id, familyPermissions.isAdmin);
  };

  // Toggle important / starred
  const handleToggleImportant = (messageId: string) => {
    if (!user) return;
    const isNow = chatService.toggleUserImportant(messageId, user.id);
    setImportantMessageIds((prev) =>
      isNow ? [...prev, messageId] : prev.filter((id) => id !== messageId)
    );
  };

  // Quick family prompts for convenient one-tap updates
  const quickPrompts = [
    '🍽️ Dinner is ready!',
    '🚗 Heading home now',
    '🛒 Need anything from the store?',
    '❤️ Hope everyone is having a great day!',
  ];

  // Filter messages based on search query and important filter
  const filteredMessages = useMemo(() => {
    let list = messages;

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
  }, [messages, searchQuery, showImportantOnly, importantMessageIds]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned && !m.deletedAt),
    [messages]
  );

  // If user has not joined or created any family yet
  if (!loadingFamilies && hasNoFamily) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
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
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Create or Join Family
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* WhatsApp / Upwork Style Top Bar Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0 min-h-[56px]">
        {/* Left: 3-line hamburger menu for mobile + Family Avatar & Name */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          {/* 3-line menu button on mobile so user can jump to any section */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Family Avatar & Info (WhatsApp contact style) */}
          <div
            onClick={() => setShowMembersDrawer(true)}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer hover:opacity-90 active:scale-98 transition-all"
            title="View Family Details & Members"
          >
            <Avatar
              src={family?.photo || family?.avatar}
              name={family?.name || 'Family'}
              size="md"
              status={isAnyoneLive ? 'online' : 'offline'}
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
                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isAnyoneLive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span>
                  {isAnyoneLive
                    ? `${activeMemberIds.length} online now`
                    : `${members.length} members`}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: WhatsApp-style Search + 3-Dots Overflow Menu (plus desktop shortcuts) */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={moreMenuRef}>
          {/* Search Toggle */}
          <button
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isSearching
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t.chat.searchMessages || 'Search messages'}
            aria-label="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Desktop quick shortcuts */}
          <button
            onClick={() => setShowImportantOnly(!showImportantOnly)}
            className={`hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors cursor-pointer ${
              showImportantOnly
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={showImportantOnly ? 'Show all messages' : 'Show starred messages only'}
            aria-label="Starred messages"
          >
            <Star className={`w-5 h-5 ${showImportantOnly ? 'fill-current text-amber-500' : ''}`} />
          </button>

          <button
            onClick={() => setShowMembersDrawer(true)}
            className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="View Family Members"
            aria-label="Family members"
          >
            <Users className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowNotificationModal(true)}
            className="hidden sm:flex relative min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Notifications & Alerts"
            aria-label="Manage notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Logged-in User's Own Profile Avatar (Desktop) */}
          {user && (
            <button
              onClick={() => setProfileModalOpen(true)}
              className="hidden sm:flex ml-0.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/60 transition-all cursor-pointer group relative shrink-0"
              title={`My Profile (${user.name || user.fullName || 'User'})`}
            >
              <Avatar
                src={user.avatar || user.profileImage}
                name={user.name || user.fullName || 'User'}
                size="sm"
                status="online"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[7px] shadow-sm">
                ✎
              </span>
            </button>
          )}

          {/* 3-Dots WhatsApp Overflow Menu Button */}
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              moreMenuOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Chat Options & Menu"
            aria-label="More options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* WhatsApp / Upwork Style Dropdown Menu */}
          {moreMenuOpen && (
            <div className="absolute top-12 right-0 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setMobileMenuOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <Menu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Open Navigation Menu</span>
              </button>

              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowMembersDrawer(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Family Members & Info</span>
              </button>

              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowImportantOnly(!showImportantOnly);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <Star className={`w-4 h-4 ${showImportantOnly ? 'fill-current text-amber-500' : 'text-amber-500'}`} />
                <span>{showImportantOnly ? 'Show All Messages' : 'Starred Messages'}</span>
              </button>

              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowNotificationModal(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Notifications & Alerts</span>
                </div>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <Avatar
                  src={user?.avatar || user?.profileImage}
                  name={user?.name || user?.fullName || 'User'}
                  size="xs"
                />
                <span className="truncate">My Profile ({user?.name?.split(' ')[0] || 'Me'})</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

              {/* Clear All Messages (For All Members) */}
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowClearChatConfirmModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear All Messages</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar when active */}
      {isSearching && (
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150 shrink-0">
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
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Starred filter alert banner */}
      {showImportantOnly && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 shrink-0">
          <div className="flex items-center gap-2">
            <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
            <span className="font-semibold">Showing Starred Messages only ({filteredMessages.length})</span>
          </div>
          <button
            onClick={() => setShowImportantOnly(false)}
            className="text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
          >
            Show All
          </button>
        </div>
      )}

      {/* Error notice if offline or permission issue */}
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

      {/* Main Message Thread */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-1"
      >
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
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs"
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

            // Date divider calculation
            const currentDateStr = new Date(msg.createdAt).toDateString();
            const prevDateStr = prevMsg ? new Date(prevMsg.createdAt).toDateString() : null;
            const showDateDivider = currentDateStr !== prevDateStr;

            // Grouping consecutive messages from same sender within 3 minutes
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
                  onPreviewAttachment={(att) => setPreviewAttachment(att)}
                  isImportant={isImportant}
                  onToggleImportant={handleToggleImportant}
                  currentUserId={user?.id || ''}
                  canPin={familyPermissions.isAdmin}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Real-time Typing Indicator */}
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

      {/* Message Composer */}
      {user && family && (
        <MessageComposer
          chatRoomId={chatRoomId}
          familyId={family.id}
          currentUser={user}
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      )}

      {/* Full Screen Photo / Document Media Viewer */}
      {previewAttachment && (
        <MediaViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
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
              className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {members.map((m) => {
              const isMe = m.userId === user?.id;
              const isOnline = isMe || activeMemberIds.includes(m.userId);
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Avatar
                    src={isMe ? (user?.avatar || user?.profileImage || m.userPhoto) : m.userPhoto}
                    name={isMe ? (user?.name || user?.fullName || m.userName || 'Member') : (m.userName || 'Member')}
                    size="md"
                    status={isOnline ? 'online' : 'offline'}
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
                        {m.role === 'owner' ? '👑 Family Owner' : m.role === 'admin' ? '⭐ Admin' : 'Family Member'}
                      </p>
                      <span className="text-[10px] text-slate-300 dark:text-slate-700">•</span>
                      <span className={`text-[10px] font-semibold ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => {
                setShowMembersDrawer(false);
                setCurrentRoute('family');
              }}
              className="w-full py-2.5 px-4 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors text-center"
            >
              Manage Family & Invites →
            </button>
          </div>
        </div>
      )}

      {/* User Personal Profile & Avatar Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Family Chat Notification Management Modal */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title="Notifications & Alerts"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {unreadCount > 0
                  ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowClearConfirmModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                  <Bell className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No alerts right now
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You're all caught up with your family notifications!
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                const isUrgent = notif.type === 'urgent_item' || notif.type === 'urgent_need';
                const isMsg = notif.type === 'new_message';
                return (
                  <div
                    key={notif.id}
                    className={`group relative p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isUnread
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/60'
                        : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                          : isMsg
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
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
                      onClick={() => {
                        if (isUnread) markAsRead(notif.id);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {notif.title}
                        </h5>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notif.id);
                      }}
                      className="opacity-60 hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Dismiss notification"
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

      {/* Confirmation Modal to Clear All Notifications */}
      <Modal
        isOpen={showClearConfirmModal}
        onClose={() => setShowClearConfirmModal(false)}
        title="Clear All Notifications?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Clear all notifications? This will clear your personal notification alerts. Your chat messages and family records will not be affected.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirmModal(false)}
              disabled={clearingNotifs}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={clearingNotifs}
              onClick={async () => {
                try {
                  setClearingNotifs(true);
                  await clearAllNotifications();
                  setShowClearConfirmModal(false);
                } finally {
                  setClearingNotifs(false);
                }
              }}
            >
              {clearingNotifs ? 'Clearing...' : 'Clear All'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal to Clear All Chat Messages for Everyone */}
      <Modal
        isOpen={showClearChatConfirmModal}
        onClose={() => setShowClearChatConfirmModal(false)}
        title="Clear All Messages for Everyone?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-300">
            <strong>Warning:</strong> This will delete all chat messages in this family space for all members.
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to clear message history? A system note will be posted indicating the chat was cleared. Other family records, bills, and medical items will remain intact.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearChatConfirmModal(false)}
              disabled={clearingChat}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearingChat}
              onClick={handleClearAllChatMessages}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Messages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
