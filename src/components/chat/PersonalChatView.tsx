import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { personalChatService } from '../../services/personalChatService';
import { PersonalChat } from '../../types';
import { PersonalConversationsList } from './PersonalConversationsList';
import { PersonalConversationView } from './PersonalConversationView';

interface PersonalChatViewProps {
  initialChat?: PersonalChat | null;
  initialChatId?: string | null;
  onBackToFamilyGroup?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const PersonalChatView: React.FC<PersonalChatViewProps> = ({
  initialChat = null,
  initialChatId = null,
  onBackToFamilyGroup,
  onUnreadCountChange,
}) => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  const [chats, setChats] = useState<PersonalChat[]>(initialChat ? [initialChat] : []);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<PersonalChat | null>(initialChat || null);

  // Sync activeChat immediately if parent passes initialChat (e.g. clicking Chat on a member)
  useEffect(() => {
    if (initialChat) {
      setActiveChat(initialChat);
      setChats((prev) =>
        prev.some((c) => c.id === initialChat.id) ? prev : [initialChat, ...prev]
      );
    }
  }, [initialChat]);

  // Sync activeChat if parent passes initialChatId
  useEffect(() => {
    if (initialChatId && chats.length > 0) {
      const match = chats.find((c) => c.id === initialChatId);
      if (match) setActiveChat(match);
    }
  }, [initialChatId, chats]);

  // Subscribe to real-time personal chats for current user in this family
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = personalChatService.subscribeUserPersonalChats(
      currentFamily.id,
      user.id,
      (liveChats) => {
        setChats(liveChats);
        setLoading(false);

        // Keep activeChat updated if live data changes
        setActiveChat((current) => {
          if (!current) return null;
          const fresh = liveChats.find((c) => c.id === current.id);
          return fresh ? { ...current, ...fresh } : current;
        });

        // Compute total unread across all personal chats
        const totalUnread = liveChats.reduce((sum, c) => {
          return sum + (c.unreadCounts?.[user.id] || 0);
        }, 0);
        if (onUnreadCountChange) onUnreadCountChange(totalUnread);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [currentFamily?.id, user?.id, onUnreadCountChange]);

  const handleStartNewChatWithMember = (member: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role?: string;
  }) => {
    if (!currentFamily?.id || !user) return;

    // 1. Check if 1:1 chat already exists in live list
    const existing = chats.find((c) => !c.isGroup && c.participantIds.includes(member.id));
    if (existing) {
      setActiveChat(existing);
      return;
    }

    // 2. Generate deterministic ID and build optimistic chat object immediately (0ms)
    const chatId = personalChatService.getPersonalChatId(currentFamily.id, user.id, member.id);
    const now = new Date().toISOString();
    const optimisticChat: PersonalChat = {
      id: chatId,
      familyId: currentFamily.id,
      participantIds: [user.id, member.id].sort(),
      participantDetails: {
        [user.id]: {
          id: user.id,
          name: user.name || user.fullName || 'You',
          avatar: user.avatar || user.profileImage || '',
          email: user.email || '',
          role: user.roleInFamily || 'Member',
        },
        [member.id]: {
          id: member.id,
          name: member.name || 'Family Member',
          avatar: member.avatar || '',
          email: member.email || '',
          role: member.role || 'Member',
        },
      },
      unreadCounts: { [user.id]: 0, [member.id]: 0 },
      createdAt: now,
      updatedAt: now,
    };

    // Open chat instantly for the user!
    setActiveChat(optimisticChat);
    setChats((prev) => [optimisticChat, ...prev.filter((c) => c.id !== chatId)]);

    // Ensure document is created in Firestore in the background
    personalChatService
      .ensurePersonalChatExists({
        familyId: currentFamily.id,
        currentUser: user,
        otherMember: member,
      })
      .catch((err) => console.warn('Background ensure chat error:', err));
  };

  const handleCreateGroup = async (params: {
    groupName: string;
    selectedMembers: Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>;
  }) => {
    if (!currentFamily?.id || !user) return;
    const newGroup = await personalChatService.createPersonalGroup({
      familyId: currentFamily.id,
      groupName: params.groupName,
      currentUser: user,
      selectedMembers: params.selectedMembers,
    });
    setChats((prev) => [newGroup, ...prev.filter((c) => c.id !== newGroup.id)]);
    setActiveChat(newGroup);
  };

  const handleDeleteOrLeaveChat = async (chat: PersonalChat) => {
    if (!user?.id) return;
    // Optimistically remove from list & close if active
    setChats((prev) => prev.filter((c) => c.id !== chat.id));
    if (activeChat?.id === chat.id) {
      setActiveChat(null);
    }
    await personalChatService.deleteOrLeavePersonalChat({
      chatId: chat.id,
      currentUserId: user.id,
      isGroup: chat.isGroup,
      createdBy: chat.createdBy,
    });
  };

  const handleRenameGroup = async (chatId: string, newName: string) => {
    await personalChatService.renamePersonalGroup(chatId, newName);
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, groupName: newName.trim() } : c))
    );
    setActiveChat((prev) =>
      prev && prev.id === chatId ? { ...prev, groupName: newName.trim() } : prev
    );
  };

  if (activeChat) {
    return (
      <PersonalConversationView
        chat={activeChat}
        onBack={() => setActiveChat(null)}
        onDeleteChat={() => handleDeleteOrLeaveChat(activeChat)}
        onRenameGroup={(newName) => handleRenameGroup(activeChat.id, newName)}
      />
    );
  }

  return (
    <PersonalConversationsList
      chats={chats}
      loading={loading}
      onSelectChat={(chat) => setActiveChat(chat)}
      onStartNewChatWithMember={handleStartNewChatWithMember}
      onCreateGroup={handleCreateGroup}
      onDeleteChat={handleDeleteOrLeaveChat}
      onBackToFamilyGroup={onBackToFamilyGroup}
    />
  );
};
