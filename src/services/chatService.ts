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
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Message, Attachment, User, AppNotification } from '../types';

class ChatService {
  /**
   * Ensures the chat room document exists in Firestore
   */
  async ensureChatRoomExists(chatRoomId: string, familyId: string, familyName: string, userId: string): Promise<void> {
    if (!chatRoomId || !familyId) return;
    try {
      const roomRef = doc(db, 'chatRooms', chatRoomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        await setDoc(roomRef, {
          id: chatRoomId,
          familyId,
          type: 'family',
          name: `${familyName} Chat`,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          isGeneral: true,
        });
      }
    } catch (err) {
      console.warn("Could not ensure chat room exists:", err);
    }
  }

  /**
   * Subscribes to real-time messages in a family chat room with pagination
   */
  subscribeMessages(
    chatRoomId: string,
    messageLimit: number,
    callback: (messages: Message[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!chatRoomId) {
      callback([]);
      return () => {};
    }

    const messagesCol = collection(db, 'chatRooms', chatRoomId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'desc'), limit(messageLimit));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Normalize serverTimestamp or fallback
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
            chatRoomId: data.chatRoomId || chatRoomId,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderPhoto || data.senderAvatar || '',
            text: data.text || '',
            createdAt: createdAtStr,
            updatedAt: data.updatedAt,
            editedAt: data.editedAt,
            deletedAt: data.deletedAt,
            replyTo: data.replyTo || undefined,
            attachments: data.attachments || undefined,
            reactions: data.reactions || {},
            isPinned: data.isPinned || false,
          });
        });

        // Sort chronologically ascending (oldest to newest) for chat stream
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        callback(list);
      },
      (err) => {
        console.warn("Error subscribing to real-time chat messages:", err);
        if (onError) onError(err);
      }
    );
  }

  /**
   * Sends a real-time message to Firestore
   */
  async sendMessage(params: {
    chatRoomId: string;
    familyId: string;
    sender: User;
    text: string;
    replyTo?: Message['replyTo'];
    attachments?: Attachment[];
    type?: 'text' | 'image' | 'file' | 'system';
  }): Promise<string> {
    const messagesCol = collection(db, 'chatRooms', params.chatRoomId, 'messages');
    const newDocRef = doc(messagesCol);
    const messageId = newDocRef.id;

    const messageType = params.type || (params.attachments?.length ? (params.attachments[0].fileType === 'image' ? 'image' : 'file') : 'text');

    const cleanReplyTo = params.replyTo ? {
      id: params.replyTo.id,
      senderName: params.replyTo.senderName || '',
      text: params.replyTo.text || '',
    } : null;

    const cleanAttachments = params.attachments?.map(att => ({
      id: att.id,
      fileName: att.fileName,
      fileType: att.fileType,
      fileSize: att.fileSize,
      url: att.url,
      previewUrl: att.previewUrl || null,
    })) || null;

    const messageData = {
      id: messageId,
      chatRoomId: params.chatRoomId,
      familyId: params.familyId,
      senderId: params.sender.id,
      senderName: params.sender.name,
      senderPhoto: params.sender.avatar || params.sender.profileImage || null,
      text: params.text.trim(),
      type: messageType,
      replyTo: cleanReplyTo,
      attachments: cleanAttachments,
      reactions: {},
      isPinned: false,
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(newDocRef, messageData);

    // Update sender's read state
    await this.updateReadState(params.chatRoomId, params.familyId, params.sender.id, messageId);

    // Send in-app notification to family members (async non-blocking)
    this.broadcastMessageNotification({
      chatRoomId: params.chatRoomId,
      familyId: params.familyId,
      sender: params.sender,
      previewText: params.text.trim() || (messageType === 'image' ? 'Sent a photo' : 'Sent an attachment'),
    });

    return messageId;
  }

  /**
   * Edits user's own message
   */
  async editMessage(chatRoomId: string, messageId: string, newText: string, userId: string): Promise<void> {
    const docRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Message not found');

    const data = snap.data();
    if (data.senderId !== userId) {
      throw new Error('You can only edit your own messages.');
    }

    await updateDoc(docRef, {
      text: newText.trim(),
      editedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Soft-deletes user's own message or admin moderation
   */
  async deleteMessage(chatRoomId: string, messageId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const docRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Message not found');

    const data = snap.data();
    if (data.senderId !== userId && !isAdmin) {
      throw new Error('You can only delete your own messages.');
    }

    await updateDoc(docRef, {
      text: 'This message was deleted.',
      deletedAt: new Date().toISOString(),
      attachments: null,
      replyTo: null,
      reactions: {},
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Toggles an emoji reaction on a message
   */
  async toggleReaction(chatRoomId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    const docRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentReactions: Record<string, string[]> = data.reactions || {};
    const userList = currentReactions[emoji] || [];

    if (userList.includes(userId)) {
      currentReactions[emoji] = userList.filter((id) => id !== userId);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      currentReactions[emoji] = [...userList, userId];
    }

    await updateDoc(docRef, { reactions: currentReactions });
  }

  /**
   * Toggles pin status on a message
   */
  async togglePin(chatRoomId: string, messageId: string, userId: string, currentlyPinned: boolean): Promise<void> {
    const docRef = doc(db, 'chatRooms', chatRoomId, 'messages', messageId);
    await updateDoc(docRef, {
      isPinned: !currentlyPinned,
      pinnedBy: !currentlyPinned ? userId : null,
      pinnedAt: !currentlyPinned ? new Date().toISOString() : null,
    });
  }

  /**
   * Uploads image or file to Firebase Storage with progress callback
   */
  async uploadAttachment(params: {
    familyId: string;
    chatRoomId: string;
    file: File;
    onProgress?: (percent: number) => void;
  }): Promise<Attachment> {
    const { familyId, chatRoomId, file, onProgress } = params;
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `families/${familyId}/chat/${chatRoomId}/${Date.now()}_${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        async (error) => {
          console.warn("Storage upload error, attempting safe fallback:", error);
          if (file.size <= 3 * 1024 * 1024) {
            try {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve({
                  id: `att-${Date.now()}`,
                  fileName: file.name,
                  fileType: isImage ? 'image' : 'document',
                  fileSize: file.size,
                  url: dataUrl,
                  previewUrl: isImage ? dataUrl : undefined,
                });
              };
              reader.onerror = () => reject(error);
              reader.readAsDataURL(file);
              return;
            } catch {
              reject(error);
            }
          } else {
            reject(error);
          }
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            const att: Attachment = {
              id: `att-${Date.now()}`,
              fileName: file.name,
              fileType: isImage ? 'image' : 'document',
              fileSize: file.size,
              url: downloadUrl,
              previewUrl: isImage ? downloadUrl : undefined,
            };
            resolve(att);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Updates real-time typing state with automatic debounce
   */
  async setTyping(chatRoomId: string, user: User, isTyping: boolean): Promise<void> {
    if (!chatRoomId || !user?.id) return;
    const typingDocRef = doc(db, 'chatRooms', chatRoomId, 'typing', user.id);

    try {
      if (isTyping) {
        await setDoc(typingDocRef, {
          id: user.id,
          userId: user.id,
          userName: user.name,
          chatRoomId,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(typingDocRef);
      }
    } catch {
      // Non-blocking presence
    }
  }

  /**
   * Subscribes to active typing users in the room
   */
  subscribeTyping(
    chatRoomId: string,
    currentUserId: string,
    callback: (typingUsers: string[]) => void
  ): () => void {
    if (!chatRoomId) {
      callback([]);
      return () => {};
    }

    const typingCol = collection(db, 'chatRooms', chatRoomId, 'typing');

    return onSnapshot(typingCol, (snapshot) => {
      const names: string[] = [];
      const now = Date.now();

      snapshot.forEach((d) => {
        const data = d.data();
        if (data.userId !== currentUserId) {
          // Check heartbeat if present
          let isFresh = true;
          if (data.updatedAt instanceof Timestamp) {
            isFresh = now - data.updatedAt.toMillis() < 6000;
          }
          if (isFresh && data.userName) {
            names.push(data.userName);
          }
        }
      });

      callback(names);
    });
  }

  /**
   * Updates the user's read cursor in Firestore
   */
  async updateReadState(chatRoomId: string, familyId: string, userId: string, lastReadMessageId: string): Promise<void> {
    if (!chatRoomId || !userId) return;
    const docRef = doc(db, 'chatReadStates', `${chatRoomId}_${userId}`);
    try {
      await setDoc(
        docRef,
        {
          id: `${chatRoomId}_${userId}`,
          chatRoomId,
          familyId,
          userId,
          lastReadMessageId,
          lastReadAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn("Could not update read state:", err);
    }
  }

  /**
   * Emits in-app notifications to family members for incoming messages
   */
  private async broadcastMessageNotification(params: {
    chatRoomId: string;
    familyId: string;
    sender: User;
    previewText: string;
  }): Promise<void> {
    try {
      // Query members of this family
      const membersSnap = await getDocs(
        query(collection(db, 'familyMembers'), where('familyId', '==', params.familyId), where('status', '==', 'active'))
      );

      const now = new Date().toISOString();
      const promises: Promise<any>[] = [];

      membersSnap.forEach((mDoc) => {
        const mem = mDoc.data();
        if (mem.userId !== params.sender.id) {
          const notifRef = doc(collection(db, 'notifications'));
          const notif: AppNotification = {
            id: notifRef.id,
            recipientUserId: mem.userId,
            familyId: params.familyId,
            type: 'new_message',
            title: `💬 ${params.sender.name}`,
            message: params.previewText.slice(0, 100),
            relatedEntityType: 'chat',
            relatedEntityId: params.chatRoomId,
            createdAt: now,
            readAt: null,
          };
          promises.push(setDoc(notifRef, notif));
        }
      });

      await Promise.all(promises);
    } catch (err) {
      console.warn("Could not broadcast message notification:", err);
    }
  }

  /**
   * Toggle user-specific starred / important message
   */
  toggleUserImportant(messageId: string, userId: string): boolean {
    const key = `familyhub_important_${userId}`;
    const raw = localStorage.getItem(key);
    let list: string[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch {}
    }
    const isNow = !list.includes(messageId);
    if (isNow) {
      list.push(messageId);
    } else {
      list = list.filter(id => id !== messageId);
    }
    localStorage.setItem(key, JSON.stringify(list));
    return isNow;
  }

  getUserImportantList(userId: string): string[] {
    const key = `familyhub_important_${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }
    return [];
  }
}

export const chatService = new ChatService();
