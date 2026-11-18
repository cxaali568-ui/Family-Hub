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
  arrayRemove,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import {
  PersonalChat,
  PersonalMessage,
  PersonalChatParticipant,
  Attachment,
  User,
  AppNotification,
  ChatItemPreference,
} from '../types';

/**
 * Recursively removes any undefined values from an object to ensure
 * Firestore operations never fail with "Unsupported field value: undefined".
 * Preserves FieldValue instances (increment, serverTimestamp, arrayUnion, etc.) unmodified.
 */
function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        !(val instanceof Date) &&
        !(val instanceof Timestamp) &&
        !('_methodName' in (val as any)) &&
        !(val.constructor && val.constructor.name && (val.constructor.name.includes('FieldValue') || val.constructor.name.includes('Transform')))
      ) {
        clean[key] = sanitizeFirestorePayload(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean as T;
}

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
   * Supports both same-family members and external FamilyHub contacts found via phone/email.
   */
  async ensurePersonalChatExists(params: {
    familyId: string;
    currentUser: User;
    otherMember: {
      id: string;
      name: string;
      avatar?: string;
      email?: string;
      phone?: string;
      role?: string;
    };
    isDirectExternal?: boolean;
  }): Promise<PersonalChat> {
    const { familyId, currentUser, otherMember, isDirectExternal } = params;
    const effectiveFamilyId = isDirectExternal ? 'direct' : familyId;
    const chatId = this.getPersonalChatId(effectiveFamilyId, currentUser.id, otherMember.id);
    const chatDocRef = doc(db, 'personalChats', chatId);

    try {
      const snap = await getDoc(chatDocRef);
      if (snap.exists()) {
        const existingData = snap.data() as PersonalChat;
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
            name: otherMember.name || 'FamilyHub User',
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

      const now = new Date().toISOString();
      const newChat: PersonalChat = {
        id: chatId,
        familyId: effectiveFamilyId,
        ...(isDirectExternal ? { isDirectExternal: true } : {}),
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
            name: otherMember.name || 'FamilyHub User',
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

      await setDoc(chatDocRef, sanitizeFirestorePayload(newChat));
      return newChat;
    } catch (err) {
      console.warn('Could not ensure personal chat exists in Firestore:', err);
      return {
        id: chatId,
        familyId: effectiveFamilyId,
        ...(isDirectExternal ? { isDirectExternal: true } : {}),
        participantIds: [currentUser.id, otherMember.id].sort(),
        participantDetails: {
          [currentUser.id]: {
            id: currentUser.id,
            name: currentUser.name || 'You',
            avatar: currentUser.avatar,
          },
          [otherMember.id]: {
            id: otherMember.id,
            name: otherMember.name || 'FamilyHub User',
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
   * Creates a new Private Group Chat with selected family members.
   */
  async createPersonalGroup(params: {
    familyId: string;
    groupName: string;
    currentUser: User;
    selectedMembers: Array<{ id: string; name: string; avatar?: string; email?: string; role?: string }>;
  }): Promise<PersonalChat> {
    const { familyId, groupName, currentUser, selectedMembers } = params;
    const creatorId = auth.currentUser?.uid || currentUser.id;
    const groupDocRef = doc(collection(db, 'personalChats'));
    const chatId = groupDocRef.id;
    const now = new Date().toISOString();

    const participantIdsSet = new Set<string>([creatorId]);
    const participantDetails: Record<string, PersonalChatParticipant> = {
      [creatorId]: {
        id: creatorId,
        name: currentUser.name || currentUser.fullName || 'You',
        avatar: currentUser.avatar || currentUser.profileImage || '',
        email: currentUser.email || '',
        role: currentUser.roleInFamily || 'Member',
      },
    };
    const unreadCounts: Record<string, number> = { [creatorId]: 0 };

    selectedMembers.forEach((m) => {
      if (m.id && m.id !== creatorId) {
        participantIdsSet.add(m.id);
        participantDetails[m.id] = {
          id: m.id,
          name: m.name || 'Family Member',
          avatar: m.avatar || '',
          email: m.email || '',
          role: m.role || 'Member',
        };
        unreadCounts[m.id] = 0;
      }
    });

    const newGroup: PersonalChat = {
      id: chatId,
      familyId,
      isGroup: true,
      groupName: groupName.trim() || 'Private Group',
      createdBy: creatorId,
      participantIds: Array.from(participantIdsSet),
      participantDetails,
      unreadCounts,
      lastMessage: `Group "${groupName.trim() || 'Private Group'}" created`,
      lastMessageAt: now,
      lastMessageSenderId: creatorId,
      lastMessageType: 'text',
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(groupDocRef, sanitizeFirestorePayload(newGroup));
    } catch (err) {
      console.warn('Could not save group to Firestore immediately:', err);
    }

    return newGroup;
  }

  /**
   * Renames a personal group chat.
   */
  async renamePersonalGroup(chatId: string, newName: string): Promise<void> {
    if (!chatId || !newName.trim()) return;
    const chatDocRef = doc(db, 'personalChats', chatId);
    await updateDoc(chatDocRef, {
      groupName: newName.trim(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Deletes a personal chat / group (or leaves group if participant).
   */
  async deleteOrLeavePersonalChat(params: {
    chatId: string;
    currentUserId: string;
    isGroup?: boolean;
    createdBy?: string;
  }): Promise<void> {
    const { chatId, currentUserId, isGroup, createdBy } = params;
    if (!chatId || !currentUserId) return;

    try {
      localStorage.removeItem(`familyhub_pchat_${chatId}`);
      localStorage.removeItem(`familyhub_pchat_cleared_${chatId}_${currentUserId}`);
    } catch {}

    const chatDocRef = doc(db, 'personalChats', chatId);
    try {
      if (!isGroup || createdBy === currentUserId || !createdBy) {
        // Delete messages first in batch, then parent chat doc
        const messagesCol = collection(db, 'personalChats', chatId, 'messages');
        const snap = await getDocs(query(messagesCol, limit(500)));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        await deleteDoc(chatDocRef);
      } else {
        // Non-creator member leaves the group
        await updateDoc(chatDocRef, {
          participantIds: arrayRemove(currentUserId),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Could not remove/leave personal chat:', err);
      throw err;
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
          if (
            data.familyId === familyId ||
            data.familyId === 'direct' ||
            data.isDirectExternal === true
          ) {
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
  /**
   * Real-time subscription to messages inside a specific personal 1:1 chat with pagination & offline caching.
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

    // Immediately deliver cached messages from localStorage if available
    try {
      const cached = localStorage.getItem(`familyhub_pchat_${chatId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
        }
      }
    } catch {}

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
            attachments: Array.isArray(data.attachments) ? data.attachments : [],
            createdAt: createdAtStr,
            editedAt: data.editedAt || undefined,
            deletedAt: data.deletedAt || undefined,
            deletedFor: Array.isArray(data.deletedFor) ? data.deletedFor : [],
            readAt: data.readAt || null,
            readBy: data.readBy || [data.senderId],
            status: data.status || (data.readBy?.length > 1 ? 'read' : 'sent'),
          });
        });

        // Sort chronologically ascending (oldest to newest) for chat stream
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        // Cache latest list in localStorage
        try {
          localStorage.setItem(`familyhub_pchat_${chatId}`, JSON.stringify(list));
        } catch {}

        callback(list);
      },
      (err) => {
        console.warn("Personal chat firestore subscription fallback:", err);
        // Fallback to cached messages
        try {
          const cached = localStorage.getItem(`familyhub_pchat_${chatId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) callback(parsed);
          }
        } catch {}
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
    participantIds?: string[];
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

    const cleanAttachments = (attachments || []).map(att => ({
      id: att.id || `att-${Date.now()}`,
      fileName: att.fileName || 'Attachment',
      fileType: att.fileType || 'file',
      fileSize: typeof att.fileSize === 'number' ? att.fileSize : 0,
      url: att.url || '',
      previewUrl: att.previewUrl || att.url || '',
      ...(att.stickerMeta ? { stickerMeta: att.stickerMeta } : {}),
    }));

    // Authoritative Firebase Auth UID for Firestore security rules
    const senderId = auth.currentUser?.uid || sender.id;
    const recipientId = recipient.id;
    const participantIds = params.participantIds && params.participantIds.length > 0
      ? params.participantIds
      : [senderId, recipientId].sort();

    const newMsgData: Record<string, any> = {
      id: messageId,
      chatId,
      familyId: familyId || '',
      participantIds,
      senderId,
      senderName: sender.name || sender.fullName || 'Family Member',
      senderAvatar: sender.avatar || sender.profileImage || '',
      recipientId,
      text: text ? text.trim() : '',
      type: messageType,
      createdAt: now,
      readBy: [senderId],
      status: 'sent',
    };

    if (cleanAttachments.length > 0) {
      newMsgData.attachments = cleanAttachments;
    }

    const cleanMsgPayload = sanitizeFirestorePayload(newMsgData);

    // Save to local cache immediately so it persists across refreshes instantly
    try {
      const cacheKey = `familyhub_pchat_${chatId}`;
      const existing = localStorage.getItem(cacheKey);
      const list = existing ? JSON.parse(existing) : [];
      if (Array.isArray(list)) {
        list.push({
          ...cleanMsgPayload,
          attachments: cleanAttachments,
        });
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    } catch {}

    // 1. Commit the message document directly to Firestore subcollection
    try {
      await setDoc(newDocRef, cleanMsgPayload);
    } catch (setErr) {
      console.warn("Could not save to firestore, stored locally:", setErr);
    }

    // 2. Update parent conversation summary document asynchronously/resiliently
    const firstAtt = attachments?.[0];
    const summaryText = text.trim()
      ? text.trim()
      : firstAtt?.fileType === 'sticker'
      ? `🎭 ${firstAtt.stickerMeta?.caption || 'Sticker'}`
      : firstAtt?.fileType === 'video'
      ? '🎥 Video'
      : messageType === 'image'
      ? '📷 Photo'
      : messageType === 'voice'
      ? '🎤 Voice message'
      : '📎 File attachment';

    const chatDocRef = doc(db, 'personalChats', chatId);

    try {
      const updatePayload: Record<string, any> = {
        lastMessage: summaryText,
        lastMessageAt: now,
        lastMessageSenderId: senderId,
        lastMessageType: messageType,
        [`unreadCounts.${senderId}`]: 0,
        updatedAt: now,
      };
      participantIds.forEach((pid) => {
        if (pid !== senderId && pid !== 'group') {
          updatePayload[`unreadCounts.${pid}`] = increment(1);
        }
      });
      await updateDoc(chatDocRef, updatePayload);
    } catch (_updateErr) {
      // Document may not exist yet or need merge creation
      try {
        await setDoc(chatDocRef, sanitizeFirestorePayload({
          id: chatId,
          familyId: familyId || '',
          participantIds,
          lastMessage: summaryText,
          lastMessageAt: now,
          lastMessageSenderId: senderId,
          lastMessageType: messageType,
          unreadCounts: {
            [recipientId]: 1,
            [senderId]: 0,
          },
          participantDetails: {
            [senderId]: {
              id: senderId,
              name: sender.name || sender.fullName || 'You',
              avatar: sender.avatar || sender.profileImage || '',
            },
            [recipientId]: {
              id: recipientId,
              name: recipient.name || 'Family Member',
              avatar: '',
            },
          },
          createdAt: now,
          updatedAt: now,
        }), { merge: true });
      } catch (createErr) {
        console.warn("Personal chat parent document update notice (non-fatal):", createErr);
      }
    }

    // Trigger in-app notification for the recipient asynchronously
    this.sendPersonalMessageNotification({
      familyId,
      chatId,
      sender,
      recipientId,
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
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', 'm4v', 'mkv'].includes(ext);
    const fileType: Attachment['fileType'] = isImage ? 'image' : isVideo ? 'video' : 'document';
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
                previewUrl: isImage ? dataUrl : '',
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
              previewUrl: isImage ? downloadUrl : '',
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
                previewUrl: '',
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
              previewUrl: '',
            });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Edits sender's own message in personal chat.
   */
  async editPersonalMessage(chatId: string, messageId: string, newText: string, userId: string): Promise<void> {
    if (!chatId || !messageId || !newText.trim()) return;
    const trimmed = newText.trim();
    const now = new Date().toISOString();

    // Update local cache
    try {
      const cacheKey = `familyhub_pchat_${chatId}`;
      const existing = localStorage.getItem(cacheKey);
      if (existing) {
        const list = JSON.parse(existing);
        if (Array.isArray(list)) {
          const updated = list.map((m: PersonalMessage) =>
            m.id === messageId ? { ...m, text: trimmed, editedAt: now } : m
          );
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      }
    } catch {}

    const msgDocRef = doc(db, 'personalChats', chatId, 'messages', messageId);
    await updateDoc(msgDocRef, {
      text: trimmed,
      editedAt: now,
    });
  }

  /**
   * Deletes/hides a message only for the current user ("Delete for Me").
   */
  async deletePersonalMessageForMe(chatId: string, messageId: string, userId: string): Promise<void> {
    if (!chatId || !messageId || !userId) return;

    // Update local cache
    try {
      const cacheKey = `familyhub_pchat_${chatId}`;
      const existing = localStorage.getItem(cacheKey);
      if (existing) {
        const list = JSON.parse(existing);
        if (Array.isArray(list)) {
          const updated = list.map((m: PersonalMessage) =>
            m.id === messageId ? { ...m, deletedFor: [...(m.deletedFor || []), userId] } : m
          );
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      }
    } catch {}

    const msgDocRef = doc(db, 'personalChats', chatId, 'messages', messageId);
    try {
      await updateDoc(msgDocRef, {
        deletedFor: arrayUnion(userId),
      });
    } catch (err) {
      console.warn('Could not persist personal deleteForMe:', err);
    }
  }

  /**
   * Deletes a message for all participants ("Delete for Everyone").
   */
  async deletePersonalMessageForEveryone(chatId: string, messageId: string): Promise<void> {
    if (!chatId || !messageId) return;
    const now = new Date().toISOString();

    // Update local cache
    try {
      const cacheKey = `familyhub_pchat_${chatId}`;
      const existing = localStorage.getItem(cacheKey);
      if (existing) {
        const list = JSON.parse(existing);
        if (Array.isArray(list)) {
          const updated = list.map((m: PersonalMessage) =>
            m.id === messageId
              ? { ...m, text: 'This message was deleted.', deletedAt: now, attachments: [] }
              : m
          );
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        }
      }
    } catch {}

    const msgDocRef = doc(db, 'personalChats', chatId, 'messages', messageId);
    await updateDoc(msgDocRef, {
      text: 'This message was deleted.',
      deletedAt: now,
      attachments: [],
    });
  }

  /**
   * Clears conversation history ONLY for the current user ("Clear for Me").
   */
  async clearPersonalChatForMe(chatId: string, currentUserId: string): Promise<string> {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(`familyhub_pchat_cleared_${chatId}_${currentUserId}`, now);
    } catch {}

    if (chatId && currentUserId) {
      const chatDocRef = doc(db, 'personalChats', chatId);
      try {
        await updateDoc(chatDocRef, {
          [`clearedAtByUser.${currentUserId}`]: now,
          [`unreadCounts.${currentUserId}`]: 0,
        });
      } catch (err) {
        console.warn('Could not persist clearPersonalChatForMe:', err);
      }
    }
    return now;
  }

  getLocalClearedAt(chatId: string, userId: string): string | null {
    if (!chatId || !userId) return null;
    try {
      return localStorage.getItem(`familyhub_pchat_cleared_${chatId}_${userId}`);
    } catch {
      return null;
    }
  }

  /**
   * Clears all messages in a personal chat for ALL participants ("Clear for Everyone").
   */
  async clearPersonalChatMessages(chatId: string, currentUserId: string): Promise<void> {
    if (!chatId) return;
    try {
      localStorage.removeItem(`familyhub_pchat_${chatId}`);
    } catch {}

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
   * Updates typing indicator in personal chat with automatic expiration.
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
   * Sets real-time active in-chat presence for personal chat.
   * Cleans up automatically on tab switch or navigation.
   */
  async setPersonalInChatPresence(chatId: string, currentUser: User, inChat: boolean): Promise<void> {
    if (!chatId || !currentUser?.id) return;
    const typingDocRef = doc(db, 'personalChats', chatId, 'typing', currentUser.id);

    try {
      if (inChat) {
        await setDoc(typingDocRef, {
          userId: currentUser.id,
          userName: currentUser.name || 'Member',
          inChat: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        await updateDoc(typingDocRef, {
          inChat: false,
          isTyping: false,
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Subscribes to real-time online presence of the other participant in personal chat.
   * Only returns true if they are actively in the chat within 35 seconds.
   */
  subscribePersonalPresence(
    chatId: string,
    otherUserId: string,
    callback: (isOnline: boolean) => void
  ): () => void {
    if (!chatId || !otherUserId) {
      callback(false);
      return () => {};
    }

    const typingDocRef = doc(db, 'personalChats', chatId, 'typing', otherUserId);
    return onSnapshot(typingDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let isFresh = false;
        if (data.inChat === true || data.isTyping === true) {
          const now = Date.now();
          if (data.updatedAt instanceof Timestamp) {
            isFresh = now - data.updatedAt.toMillis() < 35000;
          } else if (typeof data.updatedAt === 'string') {
            const ms = new Date(data.updatedAt).getTime();
            isFresh = !isNaN(ms) && (now - ms) < 35000;
          }
        }
        callback(Boolean(isFresh));
      } else {
        callback(false);
      }
    }, () => callback(false));
  }

  /**
   * Subscribes to typing status of the other participant in personal chat with freshness verification.
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
        let isFresh = false;
        if (data.isTyping) {
          const now = Date.now();
          if (data.updatedAt instanceof Timestamp) {
            isFresh = now - data.updatedAt.toMillis() < 12000;
          } else if (typeof data.updatedAt === 'string') {
            const ms = new Date(data.updatedAt).getTime();
            isFresh = !isNaN(ms) && (now - ms) < 12000;
          }
        }
        callback(Boolean(data.isTyping && isFresh));
      } else {
        callback(false);
      }
    }, () => callback(false));
  }

  /**
   * Updates per-user WhatsApp chat preference (pin, archive, mute, favourite, mark as unread).
   */
  async updateChatPreference(
    chatId: string,
    userId: string,
    updates: Partial<ChatItemPreference>
  ): Promise<void> {
    if (!chatId || !userId) return;
    const chatDocRef = doc(db, 'personalChats', chatId);
    const payload: Record<string, any> = {};
    Object.entries(updates).forEach(([key, val]) => {
      if (val !== undefined) {
        payload[`chatPreferences.${userId}.${key}`] = val;
      }
    });
    if (updates.markedUnread === false) {
      payload[`unreadCounts.${userId}`] = 0;
    }
    try {
      await updateDoc(chatDocRef, payload);
    } catch (err) {
      console.warn('Could not persist chat preference update:', err);
    }
  }

  /**
   * Local + synced preference store for the main Family Group chat row.
   */
  getFamilyChatPrefs(chatRoomId: string, userId: string): ChatItemPreference {
    if (!chatRoomId || !userId) return {};
    try {
      const raw = localStorage.getItem(`familyhub_fchat_prefs_${chatRoomId}_${userId}`);
      return raw ? (JSON.parse(raw) as ChatItemPreference) : {};
    } catch {
      return {};
    }
  }

  setFamilyChatPrefs(
    chatRoomId: string,
    userId: string,
    updates: Partial<ChatItemPreference>
  ): ChatItemPreference {
    const current = this.getFamilyChatPrefs(chatRoomId, userId);
    const next = { ...current, ...updates };
    try {
      localStorage.setItem(`familyhub_fchat_prefs_${chatRoomId}_${userId}`, JSON.stringify(next));
    } catch {}
    return next;
  }

  /**
   * Normalizes a phone string to digits only for reliable international/local matching.
   */
  normalizePhone(raw?: string): string {
    return (raw || '').replace(/\D/g, '');
  }

  /**
   * Checks whether two phone numbers match (supports full digits or last 9-10 digits).
   */
  phoneNumbersMatch(a?: string, b?: string): boolean {
    const na = this.normalizePhone(a);
    const nb = this.normalizePhone(b);
    if (!na || !nb || na.length < 7 || nb.length < 7) return false;
    if (na === nb) return true;
    const tailLen = Math.min(10, na.length, nb.length);
    if (tailLen < 7) return false;
    return na.slice(-tailLen) === nb.slice(-tailLen);
  }

  /**
   * Searches registered FamilyHub users by phone number, email, or name.
   */
  async findUsersByPhoneOrEmail(queryStr: string, currentUserId: string): Promise<User[]> {
    const trimmed = queryStr.trim();
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    const digits = this.normalizePhone(trimmed);

    const resultsMap = new Map<string, User>();

    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(250)));
      usersSnap.forEach((docSnap) => {
        const u = { ...(docSnap.data() as User), id: docSnap.id };
        if (u.id === currentUserId) return;

        const uEmail = (u.email || u.emailLower || '').toLowerCase();
        const uName = (u.name || u.fullName || '').toLowerCase();
        const uPhone = u.phone || u.phoneNormalized || '';

        const emailMatch = Boolean(uEmail && uEmail.includes(lower));
        const nameMatch = Boolean(uName && uName.includes(lower));
        const phoneMatch = Boolean(
          digits.length >= 4 &&
            uPhone &&
            (this.normalizePhone(uPhone).includes(digits) || this.phoneNumbersMatch(uPhone, digits))
        );

        if (emailMatch || nameMatch || phoneMatch) {
          resultsMap.set(u.id, u);
        }
      });
    } catch (err) {
      console.warn('User directory search notice:', err);
    }

    return Array.from(resultsMap.values());
  }

  /**
   * Matches a list of device contacts (from Contact Picker API or .vcf import)
   * against registered FamilyHub users by email and phone number.
   */
  async matchDeviceContacts(
    contacts: Array<{ name: string; phones: string[]; emails: string[] }>,
    currentUserId: string
  ): Promise<{
    matched: Array<{ contactName: string; user: User }>;
    unmatched: Array<{ name: string; phone?: string; email?: string }>;
  }> {
    const allUsers: User[] = [];
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(300)));
      usersSnap.forEach((docSnap) => {
        const u = { ...(docSnap.data() as User), id: docSnap.id };
        if (u.id !== currentUserId) allUsers.push(u);
      });
    } catch (err) {
      console.warn('Could not query users for contact matching:', err);
    }

    const matched: Array<{ contactName: string; user: User }> = [];
    const seenUserIds = new Set<string>();
    const unmatched: Array<{ name: string; phone?: string; email?: string }> = [];

    for (const c of contacts) {
      const contactEmails = c.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
      const foundUser = allUsers.find((u) => {
        const uEmail = (u.email || u.emailLower || '').toLowerCase();
        if (uEmail && contactEmails.includes(uEmail)) return true;
        const uPhone = u.phone || u.phoneNormalized;
        if (uPhone && c.phones.some((p) => this.phoneNumbersMatch(uPhone, p))) return true;
        return false;
      });

      if (foundUser) {
        if (!seenUserIds.has(foundUser.id)) {
          seenUserIds.add(foundUser.id);
          matched.push({ contactName: c.name || foundUser.name, user: foundUser });
        }
      } else {
        unmatched.push({
          name: c.name || c.phones[0] || c.emails[0] || 'Contact',
          phone: c.phones[0],
          email: c.emails[0],
        });
      }
    }

    return { matched, unmatched };
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
    if (!params.recipientId || params.recipientId === 'group') return;
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const notif: AppNotification = sanitizeFirestorePayload({
        id: notifRef.id,
        recipientUserId: params.recipientId,
        familyId: params.familyId && params.familyId !== 'direct' ? params.familyId : undefined,
        type: 'new_message',
        title: `💬 ${params.sender.name || 'Private Message'}`,
        message: params.previewText.slice(0, 100),
        relatedEntityType: 'personal_chat',
        relatedEntityId: params.chatId,
        createdAt: new Date().toISOString(),
        readAt: null,
      }) as AppNotification;
      await setDoc(notifRef, notif);
    } catch (err) {
      console.warn('Could not send personal message notification:', err);
    }
  }
}

export const personalChatService = new PersonalChatService();
