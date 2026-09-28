import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { chatService } from '../../services/chatService';
import { Message, Attachment } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { PinnedBanner } from './PinnedBanner';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Search, Users, MessageSquare, Info, ShieldAlert, Sparkles } from 'lucide-react';

export const FamilyChatView: React.FC = () => {
  const { user } = useAuth();
  const { family, members, setCurrentRoute } = useFamily();
  const { t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>(() => chatService.getMessages());
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>(() => chatService.getPinnedMessages());
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const unsub = chatService.subscribe(newMessages => {
      setMessages(newMessages);
      setPinnedMessages(newMessages.filter(m => m.isPinned));
      scrollToBottom('smooth');
    });

    scrollToBottom('auto');
    return () => unsub();
  }, []);

  const handleSendMessage = (
    text: string,
    replyTo?: Message['replyTo'],
    attachments?: Attachment[]
  ) => {
    if (!user) return;
    chatService.sendMessage({
      chatRoomId: 'room-main',
      senderId: user.id,
      senderName: user.name || 'Member',
      senderAvatar: user.avatar || user.profileImage || '',
      text,
      replyTo,
      attachments,
    });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    chatService.toggleReaction(messageId, emoji, user.id);
  };

  const handleTogglePin = (messageId: string) => {
    chatService.togglePin(messageId);
  };

  const filteredMessages = searchQuery.trim()
    ? chatService.searchMessages(searchQuery)
    : messages;

  const onlineMembersCount = members.length;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Family Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar
            src={family?.photo || family?.avatar}
            name={family?.name || 'Family'}
            size="md"
            status="online"
            className="ring-2 ring-indigo-500/20"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                {family?.name || 'Family'}
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>
                {members.length} members
              </span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-xl transition-colors ${
              isSearching
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t.chat.searchMessages}
          >
            <Search className="w-5 h-5" />
          </button>

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
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2 duration-150">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.chat.searchPlaceholder}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages Banner */}
      <PinnedBanner
        pinnedMessages={pinnedMessages}
        onUnpin={handleTogglePin}
      />

      {/* Main Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredMessages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-7 h-7" />}
            title={t.chat.noMessagesTitle}
            description={t.chat.noMessagesDesc}
          />
        ) : (
          filteredMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === user?.id}
              onReply={m => setReplyingTo(m)}
              onToggleReaction={handleToggleReaction}
              onTogglePin={handleTogglePin}
              currentUserId={user?.id || ''}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        onSendMessage={handleSendMessage}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Slide-in Members Drawer on desktop or mobile toggle */}
      {showMembersDrawer && (
        <div className="absolute inset-y-0 right-0 w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl z-30 p-4 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Family Members ({members.length})
            </h3>
            <button
              onClick={() => setShowMembersDrawer(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="sm" />
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{m.userName || 'Member'}</p>
                    {m.userId === user?.id && (
                      <span className="text-[10px] text-indigo-600 font-semibold">(You)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 capitalize">{m.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <button
              onClick={() => {
                setShowMembersDrawer(false);
                setCurrentRoute('family');
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl hover:bg-indigo-100 text-center"
            >
              Manage Family & Children →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
