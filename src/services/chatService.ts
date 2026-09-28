import { Message, Attachment } from '../types';
import { INITIAL_MESSAGES } from './mockData';

class ChatService {
  private messages: Message[] = [...INITIAL_MESSAGES];
  private listeners: Array<(messages: Message[]) => void> = [];

  getMessages(chatRoomId: string = 'room-main'): Message[] {
    return this.messages.filter(m => m.chatRoomId === chatRoomId);
  }

  getPinnedMessages(chatRoomId: string = 'room-main'): Message[] {
    return this.messages.filter(m => m.chatRoomId === chatRoomId && m.isPinned);
  }

  searchMessages(query: string, chatRoomId: string = 'room-main'): Message[] {
    if (!query.trim()) return this.getMessages(chatRoomId);
    const q = query.toLowerCase();
    return this.messages.filter(
      m => m.chatRoomId === chatRoomId && m.text.toLowerCase().includes(q)
    );
  }

  subscribe(callback: (messages: Message[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    const list = [...this.messages];
    this.listeners.forEach(cb => cb(list));
  }

  sendMessage(params: {
    chatRoomId?: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    replyTo?: { id: string; senderName: string; text: string };
    attachments?: Attachment[];
  }): Message {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      chatRoomId: params.chatRoomId || 'room-main',
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      text: params.text,
      createdAt: new Date().toISOString(),
      replyTo: params.replyTo,
      attachments: params.attachments,
      reactions: {},
    };

    this.messages.push(newMsg);
    this.notify();

    // Simulated responsive feedback from family member if appropriate
    this.simulateFamilyReaction(newMsg);

    return newMsg;
  }

  toggleReaction(messageId: string, emoji: string, userId: string): void {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) {
      msg.reactions = {};
    }

    const currentUsers = msg.reactions[emoji] || [];
    if (currentUsers.includes(userId)) {
      msg.reactions[emoji] = currentUsers.filter(id => id !== userId);
      if (msg.reactions[emoji].length === 0) {
        delete msg.reactions[emoji];
      }
    } else {
      msg.reactions[emoji] = [...currentUsers, userId];
    }

    this.notify();
  }

  togglePin(messageId: string): void {
    const msg = this.messages.find(m => m.id === messageId);
    if (msg) {
      msg.isPinned = !msg.isPinned;
      this.notify();
    }
  }

  private simulateFamilyReaction(msg: Message): void {
    // If current sender asks a question or mentions dinner, simulate a loving family response after 3 seconds
    const lower = msg.text.toLowerCase();
    if (lower.includes('dinner') || lower.includes('milk') || lower.includes('home') || lower.includes('doctor')) {
      setTimeout(() => {
        // Choose another family member to reply
        const otherSender = msg.senderId === 'user-ayesha'
          ? { id: 'user-tariq', name: 'Tariq Khan', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80' }
          : { id: 'user-ayesha', name: 'Ayesha Khan', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80' };

        let replyContent = "Sounds good! I'll take care of it ❤️";
        if (lower.includes('dinner')) {
          replyContent = "I'm making chicken biryani and a fresh salad tonight! 🍲";
        } else if (lower.includes('milk')) {
          replyContent = "I'm near the store right now, picking it up! 🛒";
        }

        const autoMsg: Message = {
          id: `msg-${Date.now()}`,
          chatRoomId: msg.chatRoomId,
          senderId: otherSender.id,
          senderName: otherSender.name,
          senderAvatar: otherSender.avatar,
          text: replyContent,
          createdAt: new Date().toISOString(),
          replyTo: {
            id: msg.id,
            senderName: msg.senderName,
            text: msg.text.slice(0, 60),
          },
        };

        this.messages.push(autoMsg);
        this.notify();
      }, 2500);
    }
  }
}

export const chatService = new ChatService();
