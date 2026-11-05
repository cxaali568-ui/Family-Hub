import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useLanguage } from '../../context/LanguageContext';
import { PersonalChat } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Search,
  MessageSquarePlus,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  FileText,
  Lock,
  User as UserIcon,
  X,
  Sparkles,
} from 'lucide-react';

interface PersonalConversationsListProps {
  chats: PersonalChat[];
  loading: boolean;
  onSelectChat: (chat: PersonalChat) => void;
  onStartNewChatWithMember: (member: { id: string; name: string; avatar?: string; email?: string; role?: string }) => void;
}

export const PersonalConversationsList: React.FC<PersonalConversationsListProps> = ({
  chats,
  loading,
  onSelectChat,
  onStartNewChatWithMember,
}) => {
  const { user } = useAuth();
  const { members, currentFamily } = useFamily();
  const { t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [memberFilterQuery, setMemberFilterQuery] = useState('');

  // Eligible family members to start a new chat with (exclude current user)
  const eligibleMembers = useMemo(() => {
    if (!user) return [];
    return members.filter((m) => m.userId && m.userId !== user.id && m.status === 'active');
  }, [members, user]);

  // Filter conversations by other participant's name or last message
  const filteredChats = useMemo(() => {
    if (!user) return chats;
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase().trim();

    return chats.filter((c) => {
      const otherId = c.participantIds.find((id) => id !== user.id) || '';
      const other = c.participantDetails[otherId];
      const otherName = (other?.name || '').toLowerCase();
      const lastMsg = (c.lastMessage || '').toLowerCase();
      return otherName.includes(q) || lastMsg.includes(q);
    });
  }, [chats, searchQuery, user]);

  // Filter member picker list
  const filteredEligibleMembers = useMemo(() => {
    if (!memberFilterQuery.trim()) return eligibleMembers;
    const q = memberFilterQuery.toLowerCase().trim();
    return eligibleMembers.filter(
      (m) =>
        (m.userName || '').toLowerCase().includes(q) ||
        (m.userEmail || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
    );
  }, [eligibleMembers, memberFilterQuery]);

  const formatConversationTime = (isoString?: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return 'Yesterday';

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Search & Action Bar */}
      <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-9 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowNewChatModal(true)}
          className="min-h-[38px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          title="Start a new private 1:1 conversation"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Security Privacy Notice */}
      <div className="px-4 py-1.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between text-[11px] text-indigo-900 dark:text-indigo-300 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="truncate">
            End-to-end authorized. Only you and the chosen family member can view messages.
          </span>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto touch-scroll divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading private conversations...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center max-w-sm mx-auto my-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {searchQuery ? 'No matching conversations' : 'No Private Chats Yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {searchQuery
                  ? 'Try searching with a different name or message snippet.'
                  : 'Start a direct, private 1-on-1 conversation with any family member.'}
              </p>
            </div>
            {!searchQuery && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowNewChatModal(true)}
                icon={<MessageSquarePlus className="w-4 h-4" />}
                className="mt-2 text-xs font-bold"
              >
                Start a Private Chat
              </Button>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const otherId = chat.participantIds.find((id) => id !== user?.id) || '';
            const other = chat.participantDetails[otherId];
            const otherName = other?.name || 'Family Member';
            const unread = (user && chat.unreadCounts?.[user.id]) || 0;
            const isMeLastSender = chat.lastMessageSenderId === user?.id;

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className="p-3.5 flex items-center gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-900/60 transition-colors cursor-pointer active:bg-slate-200/60 dark:active:bg-slate-800"
              >
                <div className="relative shrink-0">
                  <Avatar
                    src={other?.avatar}
                    name={otherName}
                    size="md"
                    className="ring-2 ring-indigo-500/20"
                  />
                  {/* Subtle online ring indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {otherName}
                    </h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                      {formatConversationTime(chat.lastMessageAt || chat.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      {isMeLastSender && (
                        <span className="shrink-0 text-indigo-500">
                          {unread === 0 ? (
                            <CheckCheck className="w-3.5 h-3.5 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 inline" />
                          )}
                        </span>
                      )}

                      {chat.lastMessageType === 'image' ? (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" /> Photo
                        </span>
                      ) : chat.lastMessageType === 'voice' ? (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Mic className="w-3.5 h-3.5 text-emerald-500" /> Voice message
                        </span>
                      ) : chat.lastMessageType === 'file' ? (
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <FileText className="w-3.5 h-3.5 text-amber-500" /> File
                        </span>
                      ) : (
                        <span className="truncate">
                          {chat.lastMessage || 'No messages yet'}
                        </span>
                      )}
                    </p>

                    {unread > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-xs animate-in zoom-in-90">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Start New Private Chat Modal */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start Private Chat"
        subtitle={`Select a member from ${currentFamily?.name || 'your family'} to start a confidential 1:1 conversation.`}
        maxWidth="md"
      >
        <div className="space-y-3">
          {/* Search Member input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={memberFilterQuery}
              onChange={(e) => setMemberFilterQuery(e.target.value)}
              placeholder="Search member by name..."
              className="w-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 touch-scroll">
            {filteredEligibleMembers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {eligibleMembers.length === 0
                  ? 'No other family members found in this space.'
                  : 'No matching family members found.'}
              </div>
            ) : (
              filteredEligibleMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    setShowNewChatModal(false);
                    onStartNewChatWithMember({
                      id: member.userId,
                      name: member.userName || 'Family Member',
                      avatar: member.userPhoto,
                      email: member.userEmail,
                      role: member.role,
                    });
                  }}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar
                      src={member.userPhoto}
                      name={member.userName || 'Member'}
                      size="sm"
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {member.userName || 'Family Member'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate capitalize">
                        {member.role || 'Member'} {member.userEmail ? `• ${member.userEmail}` : ''}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    Message →
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewChatModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
