import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { chatService } from '../../services/chatService';
import { Message, Attachment } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { PinnedBanner } from './PinnedBanner';
import { MediaViewerModal } from './MediaViewerModal';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { formatMessageDateDivider } from '../../utils/dateUtils';
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
} from 'lucide-react';

export const FamilyChatView: React.FC = () => {
  const { user } = useAuth();
  const { family, members, familyPermissions, setCurrentRoute, hasNoFamily, loadingFamilies } = useFamily();
  const { t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showImportantOnly, setShowImportantOnly] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [importantMessageIds, setImportantMessageIds] = useState<string[]>([]);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Compute active family chat room id
  const chatRoomId = family?.id ? `${family.id}_general` : '';

  // Load user's starred/important messages from local preference
  useEffect(() => {
    if (user?.id) {
      setImportantMessageIds(chatService.getUserImportantList(user.id));
    }
  }, [user?.id]);

  // Ensure chat room exists in Firestore and subscribe to messages
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

    // Subscribe to real-time typing indicators
    const unsubTyping = chatService.subscribeTyping(
      chatRoomId,
      user.id,
      (typers) => {
        setTypingUsers(typers);
      }
    );

    return () => {
      unsubMessages();
      unsubTyping();
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
      alert(err?.message || 'Failed to send message. Please try again.');
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
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar
            src={family?.photo || family?.avatar}
            name={family?.name || 'Family'}
            size="md"
            status="online"
            className="ring-2 ring-indigo-500/20 shrink-0"
          />
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {family?.name || 'Family'}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              <span>{members.length} family members</span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Starred / Important Messages Filter */}
          <button
            onClick={() => setShowImportantOnly(!showImportantOnly)}
            className={`p-2 rounded-xl transition-colors ${
              showImportantOnly
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={showImportantOnly ? 'Show all messages' : 'Show starred messages only'}
          >
            <Star className={`w-5 h-5 ${showImportantOnly ? 'fill-current' : ''}`} />
          </button>

          {/* Search Toggle */}
          <button
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-colors ${
              isSearching
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t.chat.searchMessages || 'Search messages'}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Members Drawer Toggle */}
          <button
            onClick={() => setShowMembersDrawer(!showMembersDrawer)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View Family Members"
          >
            <Users className="w-5 h-5" />
          </button>
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
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <Avatar
                    src={m.userPhoto}
                    name={m.userName || 'Member'}
                    size="md"
                    status="online"
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
                    <p className="text-[11px] text-slate-400 capitalize">
                      {m.role === 'owner' ? '👑 Family Owner' : m.role === 'admin' ? '⭐ Admin' : 'Family Member'}
                    </p>
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
    </div>
  );
};
