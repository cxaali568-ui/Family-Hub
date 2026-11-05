import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { personalChatService } from '../../services/personalChatService';
import { PersonalChat } from '../../types';
import { PersonalConversationsList } from './PersonalConversationsList';
import { PersonalConversationView } from './PersonalConversationView';

interface PersonalChatViewProps {
  initialChatId?: string | null;
  onUnreadCountChange?: (count: number) => void;
}

export const PersonalChatView: React.FC<PersonalChatViewProps> = ({
  initialChatId = null,
  onUnreadCountChange,
}) => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  const [chats, setChats] = useState<PersonalChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(initialChatId);

  // Sync activeChatId if parent passes or updates initialChatId
  useEffect(() => {
    if (initialChatId) {
      setActiveChatId(initialChatId);
    }
  }, [initialChatId]);

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

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const handleStartNewChatWithMember = async (member: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
    role?: string;
  }) => {
    if (!currentFamily?.id || !user) return;
    try {
      const created = await personalChatService.ensurePersonalChatExists({
        familyId: currentFamily.id,
        currentUser: user,
        otherMember: member,
      });

      // Update chats state optimistically if not yet in snapshot
      setChats((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [created, ...prev];
      });

      setActiveChatId(created.id);
    } catch (err) {
      console.warn('Could not start personal chat:', err);
    }
  };

  if (activeChat) {
    return (
      <PersonalConversationView
        chat={activeChat}
        onBack={() => setActiveChatId(null)}
      />
    );
  }

  return (
    <PersonalConversationsList
      chats={chats}
      loading={loading}
      onSelectChat={(chat) => setActiveChatId(chat.id)}
      onStartNewChatWithMember={handleStartNewChatWithMember}
    />
  );
};
