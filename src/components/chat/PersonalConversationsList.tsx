import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useToast } from '../../context/ToastContext';
import { PersonalChat } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  FileText,
  X,
  Users,
  MessageCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface PersonalConversationsListProps {
  chats: PersonalChat[];
  loading: boolean;
  onSelectChat: (chat: PersonalChat) => void;
  onStartNewChatWithMember: (member: { id: string; name: string; avatar?: string; email?: string; role?: string }) => void;
  onCreateGroup: (params: {
    groupName: string;
    selectedMembers: Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>;
  }) => Promise<void>;
  onDeleteChat: (chat: PersonalChat) => Promise<void>;
  onBackToFamilyGroup?: () => void;
}

export const PersonalConversationsList: React.FC<PersonalConversationsListProps> = ({
  chats,
  loading,
  onSelectChat,
  onStartNewChatWithMember,
  onCreateGroup,
  onDeleteChat,
  onBackToFamilyGroup,
}) => {
  const { user } = useAuth();
  const { members } = useFamily();
  const { showError, showSuccess } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [chatToRemove, setChatToRemove] = useState<PersonalChat | null>(null);
  const [removingChat, setRemovingChat] = useState(false);

  // Eligible family members to start a new chat or add to group (exclude current user)
  const eligibleMembers = useMemo(() => {
    if (!user) return [];
    return members.filter((m) => {
      const mUserId = m.userId || m.id;
      if (!mUserId) return false;
      if (mUserId === user.id) return false;
      if (m.userEmail && user.email && m.userEmail.toLowerCase() === user.email.toLowerCase()) return false;
      if (m.status === 'removed') return false;
      return true;
    });
  }, [members, user]);

  // Map of otherUserId -> existing 1:1 chat for quick lookup
  const chatByMemberId = useMemo(() => {
    if (!user) return new Map<string, PersonalChat>();
    const map = new Map<string, PersonalChat>();
    chats.forEach((c) => {
      if (c.isGroup) return;
      const otherId = c.participantIds.find((id) => id !== user.id);
      if (otherId) {
        map.set(otherId, c);
      }
    });
    return map;
  }, [chats, user]);

  // Filter conversations by name/groupName or last message
  const filteredChats = useMemo(() => {
    if (!user) return chats;
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase().trim();

    return chats.filter((c) => {
      if (c.isGroup) {
        const gName = (c.groupName || '').toLowerCase();
        const lastMsg = (c.lastMessage || '').toLowerCase();
        return gName.includes(q) || lastMsg.includes(q);
      }
      const otherId = c.participantIds.find((id) => id !== user.id) || '';
      const other = c.participantDetails[otherId];
      const otherName = (other?.name || '').toLowerCase();
      const lastMsg = (c.lastMessage || '').toLowerCase();
      return otherName.includes(q) || lastMsg.includes(q);
    });
  }, [chats, searchQuery, user]);

  // Filter member list for quick tap
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return eligibleMembers;
    const q = searchQuery.toLowerCase().trim();
    return eligibleMembers.filter(
      (m) =>
        (m.userName || '').toLowerCase().includes(q) ||
        (m.userEmail || '').toLowerCase().includes(q) ||
        (m.role || '').toLowerCase().includes(q)
    );
  }, [eligibleMembers, searchQuery]);

  const handleMemberClick = (member: (typeof eligibleMembers)[0]) => {
    const memberId = member.userId || member.id;
    const existing = chatByMemberId.get(memberId);
    if (existing) {
      onSelectChat(existing);
    } else {
      onStartNewChatWithMember({
        id: memberId,
        name: member.userName || 'Family Member',
        avatar: member.userPhoto,
        email: member.userEmail,
        role: member.role,
      });
    }
  };

  const toggleMemberForGroup = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmitNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showError('Please enter a group name.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      showError('Please select at least one family member.');
      return;
    }

    setCreatingGroup(true);
    try {
      const selectedMembers = eligibleMembers
        .filter((m) => selectedMemberIds.includes(m.userId || m.id))
        .map((m) => ({
          id: m.userId || m.id,
          name: m.userName || 'Family Member',
          avatar: m.userPhoto,
          email: m.userEmail,
          role: m.role,
        }));

      await onCreateGroup({
        groupName: groupName.trim(),
        selectedMembers,
      });
      setShowNewGroupModal(false);
      setGroupName('');
      setSelectedMemberIds([]);
      showSuccess('Group created');
    } catch (err: any) {
      showError(err?.message || 'Could not create group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleConfirmRemoveChat = async () => {
    if (!chatToRemove) return;
    setRemovingChat(true);
    try {
      await onDeleteChat(chatToRemove);
      setChatToRemove(null);
      showSuccess(chatToRemove.isGroup ? 'Group removed' : 'Chat removed');
    } catch (err: any) {
      showError(err?.message || 'Could not remove chat.');
    } finally {
      setRemovingChat(false);
    }
  };

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
      {/* Top Header: Clean, NO 3-line navigation menu */}
      <div className="px-3 sm:px-4 py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 min-h-[56px]">
        <div className="flex items-center gap-2 overflow-hidden">
          {onBackToFamilyGroup && (
            <button
              onClick={onBackToFamilyGroup}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 -ml-1"
              title="Back to Family Chat"
              aria-label="Back to Family Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
              Personal Chats
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setGroupName('');
              setSelectedMemberIds([]);
              setShowNewGroupModal(true);
            }}
            className="min-h-[36px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Group</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations or members..."
            className="w-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 pl-9 pr-8 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto touch-scroll">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading conversations...
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* 1. RECENT CONVERSATIONS (1:1 & Personal Groups) */}
            {filteredChats.length > 0 && (
              <div className="bg-white dark:bg-slate-900">
                <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Chats ({filteredChats.length})
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredChats.map((chat) => {
                    const isGroup = Boolean(chat.isGroup);
                    const otherId = chat.participantIds.find((id) => id !== user?.id) || '';
                    const other = chat.participantDetails?.[otherId];
                    const title = isGroup ? (chat.groupName || 'Private Group') : (other?.name || 'Family Member');
                    const unread = (user && chat.unreadCounts?.[user.id]) || 0;
                    const isMeLastSender = chat.lastMessageSenderId === user?.id;

                    return (
                      <div
                        key={chat.id}
                        onClick={() => onSelectChat(chat)}
                        className="p-3.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer active:bg-slate-100 dark:active:bg-slate-800 group"
                      >
                        <div className="relative shrink-0">
                          {isGroup ? (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center ring-2 ring-indigo-500/20">
                              <Users className="w-5 h-5" />
                            </div>
                          ) : (
                            <Avatar
                              src={other?.avatar}
                              name={title}
                              size="md"
                              className="ring-2 ring-indigo-500/20"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {title}
                              </h4>
                              {isGroup && (
                                <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                  ({chat.participantIds.length})
                                </span>
                              )}
                            </div>
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

                            <div className="flex items-center gap-1.5 shrink-0">
                              {unread > 0 && (
                                <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                                  {unread > 9 ? '9+' : unread}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChatToRemove(chat);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Remove Chat"
                                aria-label="Remove Chat"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. FAMILY MEMBERS LIST (Tap any member to chat) */}
            <div className="bg-white dark:bg-slate-900">
              <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Members ({filteredMembers.length})
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery
                    ? 'No matching members found.'
                    : 'No other family members in this space yet.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredMembers.map((member) => {
                    const memberName = member.userName || 'Family Member';

                    return (
                      <div
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-indigo-50/50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer active:bg-indigo-100/60 dark:active:bg-slate-800"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Avatar
                            src={member.userPhoto}
                            name={memberName}
                            size="md"
                            className="ring-2 ring-indigo-500/20 shrink-0"
                          />
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {memberName}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate capitalize">
                              {member.role || 'Member'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="min-h-[36px] px-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create New Group Modal */}
      <Modal
        isOpen={showNewGroupModal}
        onClose={() => !creatingGroup && setShowNewGroupModal(false)}
        title="New Private Group"
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitNewGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Parents Only, Weekend Trip"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Members ({selectedMemberIds.length} selected)
            </label>
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              {eligibleMembers.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No members available.</p>
              ) : (
                eligibleMembers.map((m) => {
                  const mId = m.userId || m.id;
                  const checked = selectedMemberIds.includes(mId);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Avatar src={m.userPhoto} name={m.userName || 'Member'} size="sm" />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {m.userName || 'Family Member'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMemberForGroup(mId)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewGroupModal(false)}
              disabled={creatingGroup}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={creatingGroup}
              disabled={!groupName.trim() || selectedMemberIds.length === 0}
            >
              Create Group
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove Chat Modal */}
      <Modal
        isOpen={Boolean(chatToRemove)}
        onClose={() => !removingChat && setChatToRemove(null)}
        title={chatToRemove?.isGroup ? 'Remove Group?' : 'Remove Chat?'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {chatToRemove?.isGroup
              ? `Remove "${chatToRemove.groupName || 'this group'}" from your chats?`
              : 'Remove this conversation from your list?'}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatToRemove(null)}
              disabled={removingChat}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={removingChat}
              onClick={handleConfirmRemoveChat}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
