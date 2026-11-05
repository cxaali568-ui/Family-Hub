import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocs,
  where,
  writeBatch,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { PersonalChat, PersonalMessage, PersonalChatParticipant, Attachment, User, AppNotification } from '../types';

class PersonalChatService {
  /**
   * Deterministically computes the unique personal chat ID between two family members.
   * Guarantees that only ONE conversation can ever exist between any pair of users in a family.
   */
  getPersonalChatId(familyId: string, userAId: string, userBId: string): string {
    const sorted = [userAId, userBId].sort();
    return `pchat_${familyId}_${sorted[0]}_${sorted[1]}`;
  }

  /**
   * Ensures the personal chat room document exists in Firestore.
   * Only the two participants are authorized.
   */
  async ensurePersonalChatExists(params: {
    familyId: string;
    currentUser: User;
    otherMember: {
      id: string;
      name: string;
      avatar?: string;
      email?: string;
      role?: string;
    };
  }): Promise<PersonalChat> {
    const { familyId, currentUser, otherMember } = params;
    const chatId = this.getPersonalChatId(familyId, currentUser.id, otherMember.id);
    const chatDocRef = doc(db, 'personalChats', chatId);

    try {
      const snap = await getDoc(chatDocRef);
      if (snap.exists()) {
        const existingData = snap.data() as PersonalChat;
        // Optionally update participant details if they have fresh names/avatars
        const updatedDetails = {
          ...existingData.participantDetails,
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name || currentUser.fullName || 'Family Member',
            avatar: currentUser.avatar || currentUser.profileImage || '',
            email: currentUser.email || '',
            role: currentUser.roleInFamily || 'Member',
          },
          [otherMember.id]: {
            id: otherMember.id,
            name: otherMember.name || 'Family Member',
            avatar: otherMember.avatar || '',
            email: otherMember.email || '',
            role: otherMember.role || 'Member',
          },
        };

        await updateDoc(chatDocRef, {
          participantDetails: updatedDetails,
          updatedAt: new Date().toISOString(),
        });

        return {
          ...existingData,
          participantDetails: updatedDetails,
        };
      }

      // Create new private chat record
      const now = new Date().toISOString();
      const newChat: PersonalChat = {
        id: chatId,
        familyId,
        participantIds: [currentUser.id, otherMember.id].sort(),
        participantDetails: {
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name || currentUser.fullName || 'Family Member',
            avatar: currentUser.avatar || currentUser.profileImage || '',
            email: currentUser.email || '',
            role: currentUser.roleInFamily || 'Member',
          },
          [otherMember.id]: {
            id: otherMember.id,
            name: otherMember.name || 'Family Member',
            avatar: otherMember.avatar || '',
            email: otherMember.email || '',
            role: otherMember.role || 'Member',
          },
        },
        unreadCounts: {
          [currentUser.id]: 0,
          [otherMember.id]: 0,
        },
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(chatDocRef, newChat);
      return newChat;
    } catch (err) {
      console.warn("Could not ensure personal chat exists in Firestore:", err);
      // Fallback in-memory representation so UI remains functional
      return {
        id: chatId,
        familyId,
        participantIds: [currentUser.id, otherMember.id].sort(),
        participantDetails: {
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name || 'You',
            avatar: currentUser.avatar,
          },
          [otherMember.id]: {
            id: otherMember.id,
            name: otherMember.name || 'Family Member',
            avatar: otherMember.avatar,
          },
        },
        unreadCounts: { [currentUser.id]: 0, [otherMember.id]: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Real-time subscription to all personal chats for the current user in this family.
   * Single-field index on `participantIds` array-contains ensures zero composite index issues.
   */
  subscribeUserPersonalChats(
    familyId: string,
    currentUserId: string,
    callback: (chats: PersonalChat[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!currentUserId || !familyId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'personalChats'),
      where('participantIds', 'array-contains', currentUserId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const chats: PersonalChat[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PersonalChat;
          if (data.familyId === familyId) {
            chats.push({
              ...data,
              id: docSnap.id,
            });
          }
        });

        // Sort descending by last message timestamp (most recent first)
        chats.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });

        callback(chats);
      },
      (err) => {
        console.warn("Error subscribing to personal chats:", err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Real-time subscription to messages inside a specific personal 1:1 chat with pagination.
   */
  subscribePersonalMessages(
    chatId: string,
    messageLimit: number,
    callback: (messages: PersonalMessage[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (!chatId) {
      callback([]);
      return () => {};
    }

    const messagesCol = collection(db, 'personalChats', chatId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(messageLimit));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: PersonalMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let createdAtStr = new Date().toISOString();
          if (data.createdAt) {
            if (data.createdAt instanceof Timestamp) {
              createdAtStr = data.createdAt.toDate().toISOString();
            } else if (typeof data.createdAt === 'string') {
              createdAtStr = data.createdAt;
            } else if (typeof data.createdAt.toDate === 'function') {
              createdAtStr = data.createdAt.toDate().toISOString();
            }
          }

          list.push({
            id: docSnap.id,
            chatId: data.chatId || chatId,
            familyId: data.familyId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar || '',
            recipientId: data.recipientId,
            text: data.text || '',
            type: data.type || 'text',
            attachments: data.attachments || undefined,
            createdAt: createdAtStr,
            readAt: data.readAt || null,
            readBy: data.readBy || [data.senderId],
            status: data.status || (data.readBy?.length > 1 ? 'read' : 'sent'),
          });
        });

        // Sort chronologically ascending (oldest to newest) for chat stream
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn("Error subscribing to personal messages:", err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Sends a private one-to-one message to Firestore.
   */
  async sendPersonalMessage(params: {
    chatId: string;
    familyId: string;
    sender: User;
    recipient: {
      id: string;
      name: string;
    };
    text: string;
    attachments?: Attachment[];
    type?: 'text' | 'image' | 'voice' | 'file';
  }): Promise<string> {
    const { chatId, familyId, sender, recipient, text, attachments } = params;
    const messagesCol = collection(db, 'personalChats', chatId, 'messages');
    const newDocRef = doc(messagesCol);
    const messageId = newDocRef.id;

    const messageType = params.type || (attachments?.length ? (attachments[0].fileType === 'image' ? 'image' : attachments[0].fileType === 'audio' ? 'voice' : 'file') : 'text');
    const now = new Date().toISOString();

    const cleanAttachments = attachments?.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileType: att.fileType,
      fileSize: att.fileSize,
      url: att.url,
      previewUrl: att.previewUrl || att.url,
    })) || [];

    const newMsg: PersonalMessage = {
      id: messageId,
      chatId,
      familyId,
      senderId: sender.id,
      senderName: sender.name || sender.fullName || 'Family Member',
      senderAvatar: sender.avatar || sender.profileImage || '',
      recipientId: recipient.id,
      text: text.trim(),
      type: messageType,
      attachments: cleanAttachments.length > 0 ? cleanAttachments : undefined,
      createdAt: now,
      readBy: [sender.id],
      status: 'sent',
    };

    const batch = writeBatch(db);
    batch.set(newDocRef, newMsg);

    // Update conversation summary
    const summaryText = text.trim()
      ? text.trim()
      : messageType === 'image'
      ? '📷 Photo'
      : messageType === 'voice'
      ? '🎤 Voice message'
      : '📎 File attachment';

    const chatDocRef = doc(db, 'personalChats', chatId);
    batch.set(
      chatDocRef,
      {
        lastMessage: summaryText,
        lastMessageAt: now,
        lastMessageSenderId: sender.id,
        lastMessageType: messageType,
        [`unreadCounts.${recipient.id}`]: increment(1),
        [`unreadCounts.${sender.id}`]: 0,
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    // Trigger in-app notification for the recipient asynchronously
    this.sendPersonalMessageNotification({
      familyId,
      chatId,
      sender,
      recipientId: recipient.id,
      previewText: summaryText,
    });

    return messageId;
  }

  /**
   * Marks unread messages in a personal chat as read by current user.
   */
  async markChatAsRead(chatId: string, currentUserId: string): Promise<void> {
    if (!chatId || !currentUserId) return;
    try {
      const chatDocRef = doc(db, 'personalChats', chatId);
      await updateDoc(chatDocRef, {
        [`unreadCounts.${currentUserId}`]: 0,
      });

      // Update recent unread messages where current user is recipient
      const messagesCol = collection(db, 'personalChats', chatId, 'messages');
      const unreadQ = query(
        messagesCol,
        where('recipientId', '==', currentUserId),
        where('status', '==', 'sent'),
        limit(50)
      );

      const snap = await getDocs(unreadQ);
      if (!snap.empty) {
        const batch = writeBatch(db);
        const now = new Date().toISOString();
        snap.forEach((d) => {
          batch.update(d.ref, {
            status: 'read',
            readAt: now,
            readBy: arrayUnion(currentUserId),
          });
        });
        await batch.commit();
      }
    } catch (err) {
      console.warn("Could not mark personal chat as read:", err);
    }
  }

  /**
   * Uploads file attachment for personal chat with progress and resilient fallback.
   */
  async uploadPersonalFile(params: {
    familyId: string;
    chatId: string;
    file: File;
    onProgress?: (percent: number) => void;
  }): Promise<Attachment> {
    const { familyId, chatId, file, onProgress } = params;
    const isImage = file.type.startsWith('image/');
    const fileType = isImage ? 'image' : 'document';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/personalChats/${chatId}/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          }
        },
        async (error) => {
          console.warn("Personal chat storage upload error, using resilient data URL fallback:", error);
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve({
                id: `att-${Date.now()}`,
                fileName: file.name,
                fileType,
                fileSize: file.size,
                url: dataUrl,
                previewUrl: isImage ? dataUrl : undefined,
              });
            };
            reader.onerror = () => reject(error);
            reader.readAsDataURL(file);
          } catch {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              id: `att-${Date.now()}`,
              fileName: file.name,
              fileType,
              fileSize: file.size,
              url: downloadUrl,
              previewUrl: isImage ? downloadUrl : undefined,
            });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Uploads voice note recording for personal chat with progress and resilient fallback.
   */
  async uploadPersonalVoice(params: {
    familyId: string;
    chatId: string;
    blob: Blob;
    durationSeconds: number;
    onProgress?: (percent: number) => void;
  }): Promise<Attachment> {
    const { familyId, chatId, blob, durationSeconds, onProgress } = params;
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `Voice Note (${Math.round(durationSeconds)}s).${ext}`;
    const storagePath = `families/${familyId}/personalChats/${chatId}/voice_${Date.now()}.${ext}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: blob.type || 'audio/webm',
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          }
        },
        async (error) => {
          console.warn("Storage upload error for personal voice message, using data URL fallback:", error);
          try {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve({
                id: `att-voice-${Date.now()}`,
                fileName,
                fileType: 'audio',
                fileSize: blob.size,
                url: dataUrl,
              });
            };
            reader.onerror = () => reject(error);
            reader.readAsDataURL(blob);
          } catch {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              id: `att-voice-${Date.now()}`,
              fileName,
              fileType: 'audio',
              fileSize: blob.size,
              url: downloadUrl,
            });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Clears all messages in a personal 1:1 chat.
   */
  async clearPersonalChatMessages(chatId: string, currentUserId: string): Promise<void> {
    if (!chatId) return;
    try {
      const messagesCol = collection(db, 'personalChats', chatId, 'messages');
      const snap = await getDocs(query(messagesCol, limit(500)));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));

      const chatDocRef = doc(db, 'personalChats', chatId);
      batch.update(chatDocRef, {
        lastMessage: 'Conversation history cleared',
        lastMessageAt: new Date().toISOString(),
        [`unreadCounts.${currentUserId}`]: 0,
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
    } catch (err) {
      console.error("Could not clear personal chat messages:", err);
      throw err;
    }
  }

  /**
   * Updates typing indicator in personal chat.
   */
  async setPersonalTyping(chatId: string, currentUser: User, isTyping: boolean): Promise<void> {
    if (!chatId || !currentUser?.id) return;
    const typingDocRef = doc(db, 'personalChats', chatId, 'typing', currentUser.id);

    try {
      if (isTyping) {
        await setDoc(typingDocRef, {
          userId: currentUser.id,
          userName: currentUser.name || 'Member',
          isTyping: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await setDoc(typingDocRef, {
          isTyping: false,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Subscribes to typing status of the other participant in personal chat.
   */
  subscribePersonalTyping(
    chatId: string,
    otherUserId: string,
    callback: (isOtherTyping: boolean) => void
  ): () => void {
    if (!chatId || !otherUserId) {
      callback(false);
      return () => {};
    }

    const typingDocRef = doc(db, 'personalChats', chatId, 'typing', otherUserId);
    return onSnapshot(typingDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback(Boolean(data.isTyping));
      } else {
        callback(false);
      }
    }, () => callback(false));
  }

  /**
   * Helper to broadcast in-app notification to the recipient of a personal message.
   */
  private async sendPersonalMessageNotification(params: {
    familyId: string;
    chatId: string;
    sender: User;
    recipientId: string;
    previewText: string;
  }): Promise<void> {
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const notif: AppNotification = {
        id: notifRef.id,
        recipientUserId: params.recipientId,
        familyId: params.familyId,
        type: 'new_message',
        title: `💬 ${params.sender.name || 'Private Message'}`,
        message: params.previewText.slice(0, 100),
        relatedEntityType: 'personal_chat',
        relatedEntityId: params.chatId,
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      await setDoc(notifRef, notif);
    } catch (err) {
      console.warn("Could not send personal message notification:", err);
    }
  }
}

export const personalChatService = new PersonalChatService();
