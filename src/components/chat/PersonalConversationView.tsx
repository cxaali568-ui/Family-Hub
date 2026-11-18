import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCall } from '../../context/CallContext';
import { useBackButtonClose, useClickOutside } from '../../hooks/useOverlayDismiss';
import { personalChatService } from '../../services/personalChatService';
import { PersonalChat, PersonalMessage, Attachment, CallParticipantInfo } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MediaViewerModal } from './MediaViewerModal';
import { StickerBubbleCard } from './StickerBubbleCard';
import { StickerEmojiTray } from './StickerEmojiTray';
import { AIChatMagicPopover } from './AIChatMagicPopover';
import { CameraShareModal } from './CameraShareModal';
import { aiService } from '../../services/aiService';
import {
  ArrowLeft,
  MoreVertical,
  Trash2,
  Send,
  Paperclip,
  Smile,
  Keyboard,
  Mic,
  Loader2,
  X,
  Check,
  CheckCheck,
  Play,
  Pause,
  Image as ImageIcon,
  FileText,
  Users,
  Edit2,
  Copy,
  Camera,
  Sparkles,
  Languages,
  Volume2,
  Video,
  Phone,
} from 'lucide-react';

interface PersonalConversationViewProps {
  chat: PersonalChat;
  onBack: () => void;
  onDeleteChat?: () => Promise<void>;
  onRenameGroup?: (newName: string) => Promise<void>;
  hideBackOnDesktop?: boolean;
}

// Compact dedicated voice message player for 1:1 & personal group chat
const PersonalVoicePlayer: React.FC<{ url: string; fileName: string; isMe: boolean }> = ({
  url,
  isMe,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 1;
    setCurrentTime(cur);
    setProgress((cur / dur) * 100);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const formatSeconds = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = Math.floor(sec % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center gap-2.5 p-2 rounded-xl text-xs select-none max-w-[240px] border ${
        isMe
          ? 'bg-indigo-700/50 border-indigo-400/30 text-white'
          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
      }`}
    >
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer shadow-xs transition-transform active:scale-95 ${
          isMe
            ? 'bg-white text-indigo-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-1.5 w-full bg-slate-300/40 dark:bg-slate-600/40 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-indigo-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-80 mt-1">
          <span>{formatSeconds(currentTime)}</span>
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export const PersonalConversationView: React.FC<PersonalConversationViewProps> = ({
  chat,
  onBack,
  onDeleteChat,
  onRenameGroup,
  hideBackOnDesktop = false,
}) => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const { startCall } = useCall();

  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageLimit] = useState(80);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Clear / Delete Chat / Rename Group Modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showRemoveChatConfirm, setShowRemoveChatConfirm] = useState(false);
  const [removingChat, setRemovingChat] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState(chat.groupName || '');
  const [renaming, setRenaming] = useState(false);

  // Per-message Edit / Copy / Delete for Me / Delete for Everyone state
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [deletedForMeIds, setDeletedForMeIds] = useState<string[]>([]);
  const [localClearedAt, setLocalClearedAt] = useState<string | null>(() =>
    user?.id ? personalChatService.getLocalClearedAt(chat.id, user.id) : null
  );

  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [showTray, setShowTray] = useState(false);
  const [showAIMagic, setShowAIMagic] = useState(false);
  const [showDirectCamera, setShowDirectCamera] = useState(false);
  const [translatedByMsgId, setTranslatedByMsgId] = useState<Record<string, string>>({});
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Voice-to-Text speech dictation state
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const speechRecRef = useRef<any>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const composerWrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    composerWrapperRef,
    showTray || showAIMagic,
    () => {
      setShowTray(false);
      setShowAIMagic(false);
    }
  );
  useBackButtonClose(showTray, () => setShowTray(false), 'personal-tray');
  useBackButtonClose(showAIMagic, () => setShowAIMagic(false), 'personal-ai');
  useBackButtonClose(moreMenuOpen, () => setMoreMenuOpen(false), 'personal-more');
  useBackButtonClose(
    Boolean(activeActionMsgId),
    () => {
      setConfirmDeleteMsgId(null);
      setActiveActionMsgId(null);
    },
    'personal-msg-action'
  );
  useBackButtonClose(
    Boolean(editingMsgId),
    () => {
      setEditingMsgId(null);
      setEditValue('');
    },
    'personal-msg-edit'
  );

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const isGroup = Boolean(chat.isGroup);
  const otherId = isGroup ? '' : (chat.participantIds.find((id) => id !== user?.id) || '');
  const other = otherId ? chat.participantDetails?.[otherId] : undefined;
  const headerTitle = isGroup ? (chat.groupName || 'Private Group') : (other?.name || 'Family Member');

  const clearedAtForMe = useMemo(() => {
    const cloudClearedAt = user?.id ? chat.clearedAtByUser?.[user.id] : undefined;
    if (cloudClearedAt && localClearedAt) {
      return new Date(cloudClearedAt) > new Date(localClearedAt) ? cloudClearedAt : localClearedAt;
    }
    return cloudClearedAt || localClearedAt || null;
  }, [chat.clearedAtByUser, localClearedAt, user?.id]);

  // Real-time subscription to messages and presence in this chat
  useEffect(() => {
    if (!chat.id || !user?.id) return;
    setLoadingMessages(true);
    setLocalClearedAt(personalChatService.getLocalClearedAt(chat.id, user.id));
    setEditingMsgId(null);
    setEditValue('');
    setActiveActionMsgId(null);
    setConfirmDeleteMsgId(null);
    setMoreMenuOpen(false);
    setPendingAttachments([]);
    setIsOtherOnline(false);
    setIsOtherTyping(false);
    setDeletedForMeIds([]);
    setShowTray(false);
    setShowAIMagic(false);
    setTranslatedByMsgId({});
    setRenameText(chat.groupName || '');

    personalChatService.setPersonalInChatPresence(chat.id, user, true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        personalChatService.setPersonalInChatPresence(chat.id, user, true);
      } else {
        personalChatService.setPersonalInChatPresence(chat.id, user, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const presenceHeartbeat = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        personalChatService.setPersonalInChatPresence(chat.id, user, true);
      }
    }, 25000);

    // Mark as read immediately upon opening
    personalChatService.markChatAsRead(chat.id, user.id);

    const unsubMessages = personalChatService.subscribePersonalMessages(
      chat.id,
      messageLimit,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
        personalChatService.markChatAsRead(chat.id, user.id);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      (err) => {
        console.warn('Personal chat subscription error:', err);
        setLoadingMessages(false);
      }
    );

    let unsubPresence = () => {};
    let unsubTyping = () => {};
    if (!isGroup && otherId) {
      unsubPresence = personalChatService.subscribePersonalPresence(
        chat.id,
        otherId,
        (isOnline) => setIsOtherOnline(isOnline)
      );
      unsubTyping = personalChatService.subscribePersonalTyping(
        chat.id,
        otherId,
        (isTyping) => setIsOtherTyping(isTyping)
      );
    }

    return () => {
      clearInterval(presenceHeartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (user) {
        personalChatService.setPersonalInChatPresence(chat.id, user, false);
        personalChatService.setPersonalTyping(chat.id, user, false);
      }
      unsubMessages();
      unsubPresence();
      unsubTyping();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [chat.id, user?.id, otherId, isGroup, messageLimit]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreMenuOpen]);

  // Visible messages after filtering out cleared messages and deleteForMe messages
  const visibleMessages = useMemo(() => {
    let list = messages.filter(
      (m) =>
        !deletedForMeIds.includes(m.id) &&
        !(user?.id && m.deletedFor?.includes(user.id))
    );
    if (clearedAtForMe) {
      const clearMs = new Date(clearedAtForMe).getTime();
      list = list.filter((m) => new Date(m.createdAt).getTime() > clearMs);
    }
    return list;
  }, [messages, deletedForMeIds, user?.id, clearedAtForMe]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (user && !isGroup) {
      personalChatService.setPersonalTyping(chat.id, user, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        personalChatService.setPersonalTyping(chat.id, user, false);
      }, 2500);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && pendingAttachments.length === 0) || !user || isSending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    personalChatService.setPersonalTyping(chat.id, user, false);

    const textToSend = text.trim();
    const attachmentsToSend = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;
    const msgType = attachmentsToSend?.length
      ? (attachmentsToSend[0].fileType === 'image' ? 'image' : attachmentsToSend[0].fileType === 'audio' ? 'voice' : 'file')
      : 'text';

    setText('');
    setPendingAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsSending(true);

    const recipientTarget = isGroup
      ? { id: 'group', name: headerTitle }
      : { id: otherId, name: headerTitle };

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: PersonalMessage = {
      id: tempId,
      chatId: chat.id,
      familyId: chat.familyId,
      senderId: user.id,
      senderName: user.name || user.fullName || 'You',
      senderAvatar: user.avatar || user.profileImage || '',
      recipientId: recipientTarget.id,
      text: textToSend,
      type: msgType,
      attachments: attachmentsToSend || [],
      createdAt: new Date().toISOString(),
      readBy: [user.id],
      status: 'sent',
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 40);

    try {
      await personalChatService.sendPersonalMessage({
        chatId: chat.id,
        familyId: chat.familyId,
        sender: user,
        recipient: recipientTarget,
        participantIds: chat.participantIds,
        text: textToSend,
        attachments: attachmentsToSend,
      });
    } catch (err: any) {
      console.error('Personal message delivery error:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(textToSend);
      showError(err?.message || 'Could not send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSticker = async (stickerAtt: Attachment) => {
    if (!user || isSending) return;
    setIsSending(true);
    const recipientTarget = isGroup
      ? { id: 'group', name: headerTitle }
      : { id: otherId, name: headerTitle };
    try {
      await personalChatService.sendPersonalMessage({
        chatId: chat.id,
        familyId: chat.familyId,
        sender: user,
        recipient: recipientTarget,
        participantIds: chat.participantIds,
        text: '',
        attachments: [stickerAtt],
      });
    } catch (err: any) {
      showError(err?.message || 'Could not send sticker.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDirectCameraSend = async (file: File, captionText: string) => {
    if (!user) return;
    const att = await personalChatService.uploadPersonalFile({
      familyId: chat.familyId,
      chatId: chat.id,
      file,
    });
    const recipientTarget = isGroup
      ? { id: 'group', name: headerTitle }
      : { id: otherId, name: headerTitle };
    await personalChatService.sendPersonalMessage({
      chatId: chat.id,
      familyId: chat.familyId,
      sender: user,
      recipient: recipientTarget,
      participantIds: chat.participantIds,
      text: captionText,
      attachments: [att],
    });
  };

  const handleToggleSpeechDictation = () => {
    if (!speechSupported) return;
    if (isListeningSpeech && speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      setIsListeningSpeech(false);
      return;
    }
    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setText((prev) => (prev ? `${prev.trimEnd()} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListeningSpeech(false);
      recognition.onend = () => setIsListeningSpeech(false);
      speechRecRef.current = recognition;
      setIsListeningSpeech(true);
      recognition.start();
    } catch {
      setIsListeningSpeech(false);
    }
  };

  const handleTranslateMessage = async (msgId: string, msgText: string) => {
    if (!msgText.trim()) return;
    if (translatedByMsgId[msgId]) {
      setTranslatedByMsgId((prev) => {
        const next = { ...prev };
        delete next[msgId];
        return next;
      });
      return;
    }
    setTranslatingMsgId(msgId);
    try {
      const res = await aiService.sendMessage(
        [],
        `Detect the language of this chat message and translate it cleanly (if Urdu/Roman Urdu/Hindi/Arabic -> translate to English; if English -> translate to natural Roman Urdu + Urdu): "${msgText}"`,
        {
          systemInstruction:
            'You are a concise family chat translator. Output only the translated text clearly with no filler.',
        }
      );
      setTranslatedByMsgId((prev) => ({
        ...prev,
        [msgId]: (res.reply || '').trim(),
      }));
    } catch (err: any) {
      showError(err?.message || 'Translation unavailable right now.');
    } finally {
      setTranslatingMsgId(null);
    }
  };

  const handleSpeakMessage = (msgId: string, msgText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !msgText.trim()) {
      showError('Voice read-aloud is not supported on this browser.');
      return;
    }
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msgText);
      utterance.rate = 0.98;
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMsgId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Per-message Edit / Copy / Delete handlers
  const handleSaveEdit = async (messageId: string) => {
    if (!editValue.trim() || !user) return;
    const trimmed = editValue.trim();
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: trimmed, editedAt: new Date().toISOString() } : m
      )
    );
    setEditingMsgId(null);
    setEditValue('');
    try {
      await personalChatService.editPersonalMessage(chat.id, messageId, trimmed, user.id);
    } catch (err: any) {
      showError(err?.message || 'Could not save edit.');
    }
  };

  const handleDeleteMessageForMe = async (messageId: string) => {
    if (!user) return;
    setDeletedForMeIds((prev) => [...prev, messageId]);
    setConfirmDeleteMsgId(null);
    setActiveActionMsgId(null);
    await personalChatService.deletePersonalMessageForMe(chat.id, messageId, user.id);
  };

  const handleDeleteMessageForEveryone = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, text: 'This message was deleted.', deletedAt: new Date().toISOString(), attachments: [] }
          : m
      )
    );
    setConfirmDeleteMsgId(null);
    setActiveActionMsgId(null);
    try {
      await personalChatService.deletePersonalMessageForEveryone(chat.id, messageId);
    } catch (err: any) {
      showError(err?.message || 'Could not delete message.');
    }
  };

  const handleCopyMessage = (msgText: string) => {
    navigator.clipboard.writeText(msgText);
    setActiveActionMsgId(null);
    showSuccess('Copied');
  };

  // Voice recording controls
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      showError('Please allow microphone permissions to record voice notes.');
    }
  };

  const stopAndSendVoice = async () => {
    if (!mediaRecorderRef.current || !isRecording || !user) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsRecording(false);

      if (recordingSeconds < 1) {
        showError('Voice note too short.');
        return;
      }

      setIsSending(true);
      try {
        const att = await personalChatService.uploadPersonalVoice({
          familyId: chat.familyId,
          chatId: chat.id,
          blob: audioBlob,
          durationSeconds: recordingSeconds,
        });

        await personalChatService.sendPersonalMessage({
          chatId: chat.id,
          familyId: chat.familyId,
          sender: user,
          recipient: isGroup ? { id: 'group', name: headerTitle } : { id: otherId, name: headerTitle },
          participantIds: chat.participantIds,
          text: '',
          attachments: [att],
          type: 'voice',
        });
      } catch (err: any) {
        showError(err?.message || 'Could not upload voice message.');
      } finally {
        setIsSending(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancelVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // File / Photo selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 20 * 1024 * 1024) {
      showError('File size exceeds 20MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadPercent(0);

    try {
      const att = await personalChatService.uploadPersonalFile({
        familyId: chat.familyId,
        chatId: chat.id,
        file,
        onProgress: (pct) => setUploadPercent(pct),
      });

      setPendingAttachments((prev) => [...prev, att]);
    } catch (err: any) {
      showError(err?.message || 'Could not upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearForMe = async () => {
    if (!user) return;
    setClearing(true);
    try {
      const now = await personalChatService.clearPersonalChatForMe(chat.id, user.id);
      setLocalClearedAt(now);
      setShowClearConfirm(false);
      setMoreMenuOpen(false);
      showSuccess('Chat cleared for you.');
    } catch (err: any) {
      showError(err?.message || 'Could not clear chat.');
    } finally {
      setClearing(false);
    }
  };

  const handleClearForEveryone = async () => {
    if (!user) return;
    setClearing(true);
    try {
      await personalChatService.clearPersonalChatMessages(chat.id, user.id);
      setMessages([]);
      setShowClearConfirm(false);
      setMoreMenuOpen(false);
      showSuccess('Chat cleared for everyone.');
    } catch (err: any) {
      showError(err?.message || 'Could not clear history.');
    } finally {
      setClearing(false);
    }
  };

  const handleConfirmRemoveChat = async () => {
    if (!onDeleteChat) return;
    setRemovingChat(true);
    try {
      await onDeleteChat();
      setShowRemoveChatConfirm(false);
      showSuccess(isGroup ? 'Group removed' : 'Chat removed');
    } catch (err: any) {
      showError(err?.message || 'Could not remove chat.');
    } finally {
      setRemovingChat(false);
    }
  };

  const handleConfirmRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRenameGroup || !renameText.trim()) return;
    setRenaming(true);
    try {
      await onRenameGroup(renameText.trim());
      setShowRenameModal(false);
      showSuccess('Group renamed');
    } catch (err: any) {
      showError(err?.message || 'Could not rename group.');
    } finally {
      setRenaming(false);
    }
  };

  const handleStartCall = (callType: 'audio' | 'video') => {
    if (!user) return;
    const calleeIds = chat.participantIds.filter((id) => id !== user.id);
    if (calleeIds.length === 0) {
      showError('No other participant in this chat to call.');
      return;
    }

    const participantDetails: Record<string, CallParticipantInfo> = {
      [user.id]: {
        id: user.id,
        name: user.name || user.fullName || 'You',
        avatar: user.avatar || user.profileImage || '',
      },
    };
    Object.entries(chat.participantDetails || {}).forEach(([pid, info]) => {
      participantDetails[pid] = {
        id: pid,
        name: info?.name || 'Member',
        avatar: info?.avatar || '',
      };
    });

    startCall({
      familyId: chat.familyId || 'direct',
      chatId: chat.id,
      chatName: headerTitle,
      isGroup,
      type: callType,
      calleeIds,
      participantDetails,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0 min-h-[56px]">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <button
            onClick={onBack}
            className={`${hideBackOnDesktop ? 'md:hidden ' : ''}min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0`}
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              {isGroup ? (
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center ring-2 ring-indigo-500/20">
                  <Users className="w-5 h-5" />
                </div>
              ) : (
                <>
                  <Avatar
                    src={other?.avatar}
                    name={headerTitle}
                    size="md"
                    className="ring-2 ring-indigo-500/20"
                  />
                  {(isOtherTyping || isOtherOnline) && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 ${
                        isOtherTyping ? 'animate-pulse' : ''
                      }`}
                    />
                  )}
                </>
              )}
            </div>

            <div className="overflow-hidden">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {headerTitle}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                {isGroup ? (
                  <span>{chat.participantIds.length} members</span>
                ) : isOtherTyping ? (
                  <strong className="text-indigo-600 dark:text-indigo-400 font-bold">typing...</strong>
                ) : isOtherOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Offline</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right Call & Overflow Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => handleStartCall('audio')}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
            title={`Voice call ${headerTitle}`}
            aria-label="Start voice call"
          >
            <Phone className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleStartCall('video')}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
            title={`Video call ${headerTitle}`}
            aria-label="Start video call"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Options"
            aria-label="Conversation Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {moreMenuOpen && (
            <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              {isGroup && onRenameGroup && (
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setRenameText(chat.groupName || '');
                    setShowRenameModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 text-indigo-500" />
                  <span>Rename Group</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowClearConfirm(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-amber-500" />
                <span>Clear Chat</span>
              </button>

              {onDeleteChat && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                  <button
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setShowRemoveChatConfirm(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>{isGroup ? 'Remove Group' : 'Remove Chat'}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div
        onClick={() => {
          if (activeActionMsgId) {
            setActiveActionMsgId(null);
            setConfirmDeleteMsgId(null);
          }
        }}
        className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 touch-scroll"
      >
        {loadingMessages ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading messages...
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="py-16 text-center max-w-xs mx-auto space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const isDeleted = Boolean(msg.deletedAt);
            const isEditing = editingMsgId === msg.id;
            const isActionOpen = activeActionMsgId === msg.id;
            const isDeleteConfirmOpen = confirmDeleteMsgId === msg.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            if (isDeleted) {
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs italic bg-slate-100 dark:bg-slate-800/60 text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                    <span>This message was deleted.</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMessageForMe(msg.id)}
                      className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 cursor-pointer"
                      title="Remove for me"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            const isPureSticker =
              !isDeleted &&
              !isEditing &&
              !msg.text?.trim() &&
              msg.attachments?.length === 1 &&
              msg.attachments[0].fileType === 'sticker';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
              >
                {/* Sender name above incoming group messages */}
                {isGroup && !isMe && (
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1 mb-0.5">
                    {msg.senderName || 'Member'}
                  </span>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-lg rounded-2xl break-words relative ${
                    isPureSticker
                      ? 'p-1 bg-transparent'
                      : isMe
                      ? 'px-3.5 py-2 shadow-xs bg-indigo-600 text-white rounded-tr-xs'
                      : 'px-3.5 py-2 shadow-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  {/* Attachments */}
                  {!isEditing && msg.attachments && msg.attachments.length > 0 && (
                    <div className={`space-y-1.5 ${isPureSticker ? 'mb-0.5' : 'mb-1.5'}`}>
                      {msg.attachments.map((att) => (
                        <div key={att.id}>
                          {att.fileType === 'sticker' ? (
                            <StickerBubbleCard attachment={att} />
                          ) : att.fileType === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.fileName}
                              onClick={() => setPreviewAttachment(att)}
                              className="rounded-xl max-h-60 w-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            />
                          ) : att.fileType === 'video' ? (
                            <video
                              src={att.url}
                              controls
                              playsInline
                              preload="metadata"
                              className="rounded-xl max-h-60 w-full bg-black"
                            />
                          ) : att.fileType === 'audio' ? (
                            <PersonalVoicePlayer
                              url={att.url}
                              fileName={att.fileName}
                              isMe={isMe}
                            />
                          ) : (
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-xl text-xs underline ${
                                isMe ? 'text-white' : 'text-indigo-600'
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span className="truncate">{att.fileName}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Large Clean Edit Box OR Message Text */}
                  {isEditing ? (
                    <div className="w-[260px] sm:w-[340px] max-w-full bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-lg border border-indigo-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                      <textarea
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                        }}
                        rows={4}
                        className="w-full min-h-[96px] max-h-[240px] p-2.5 text-sm leading-relaxed rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMsgId(null);
                            setEditValue('');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(msg.id)}
                          disabled={!editValue.trim()}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    msg.text && (
                      <>
                        <p className="text-xs sm:text-[13px] whitespace-pre-wrap leading-relaxed select-text">
                          {msg.text}
                        </p>
                        {translatingMsgId === msg.id && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Translating...</span>
                          </div>
                        )}
                        {translatedByMsgId[msg.id] && (
                          <div
                            className={`mt-1.5 pt-1.5 border-t text-xs leading-relaxed ${
                              isMe
                                ? 'border-indigo-400/40 text-indigo-100'
                                : 'border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {translatedByMsgId[msg.id]}
                          </div>
                        )}
                      </>
                    )
                  )}

                  {/* Timestamp, Read Status & Quick Action Menu Trigger */}
                  {!isEditing && (
                    <div
                      className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 select-none ${
                        isPureSticker
                          ? 'px-2 py-0.5 rounded-full bg-white/85 dark:bg-slate-800/85 text-slate-500 shadow-2xs w-fit ml-auto'
                          : isMe
                          ? 'text-indigo-200'
                          : 'text-slate-400'
                      }`}
                    >
                      {msg.editedAt && <span className="italic opacity-80">edited</span>}
                      <span>{timeStr}</span>
                      {isMe && (
                        <span className="shrink-0">
                          {msg.status === 'read' || (msg.readBy && msg.readBy.length > 1) ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteMsgId(null);
                          setActiveActionMsgId(isActionOpen ? null : msg.id);
                        }}
                        className={`p-0.5 rounded-full transition-colors cursor-pointer ${
                          isMe && !isPureSticker
                            ? 'text-indigo-100 hover:bg-indigo-500/50'
                            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Message options"
                        aria-label="Message options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Clean Inline Action Bar (Copy / Translate / Listen / Edit / Delete) */}
                {isActionOpen && !isEditing && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-20 animate-in fade-in duration-100"
                  >
                    {!isDeleteConfirmOpen ? (
                      <>
                        {msg.text && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.text)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleTranslateMessage(msg.id, msg.text);
                                setActiveActionMsgId(null);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                            >
                              <Languages className="w-3 h-3" />
                              {translatedByMsgId[msg.id] ? 'Original' : 'Translate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSpeakMessage(msg.id, msg.text);
                                setActiveActionMsgId(null);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                            >
                              <Volume2 className="w-3 h-3" />
                              {speakingMsgId === msg.id ? 'Stop' : 'Listen'}
                            </button>
                          </>
                        )}
                        {isMe && msg.text && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMsgId(msg.id);
                              setEditValue(msg.text);
                              setActiveActionMsgId(null);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMsgId(msg.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveActionMsgId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 px-1 py-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => handleDeleteMessageForMe(msg.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 cursor-pointer"
                        >
                          Delete for Me
                        </button>
                        {isMe && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessageForEveryone(msg.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                          >
                            Delete for Everyone
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteMsgId(null);
                            setActiveActionMsgId(null);
                          }}
                          className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Other user is typing animation */}
        {!isGroup && isOtherTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-in fade-in">
            <div className="flex gap-1 items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[10px] font-semibold text-slate-500 ml-1">
                {headerTitle} is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer Matching User Screenshot */}
      <div
        ref={composerWrapperRef}
        className="bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shrink-0"
      >
        <div className="p-2.5 sm:p-3">
          {showAIMagic && (
            <AIChatMagicPopover
              familyId={chat.familyId}
              draftText={text}
              recentMessages={visibleMessages.slice(-6).map((m) => ({
                senderName: m.senderName || 'Member',
                text: m.text || '',
              }))}
              onApplyText={(newText) => setText(newText)}
              speechSupported={speechSupported}
              isListeningSpeech={isListeningSpeech}
              onVoiceToText={handleToggleSpeechDictation}
              onClose={() => setShowAIMagic(false)}
            />
          )}

          {isUploading && (
            <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300">
              <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
                <span>Uploading attachment...</span>
                <span>{uploadPercent}%</span>
              </div>
              <div className="h-1.5 w-full bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-100"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              {pendingAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border text-xs shadow-2xs"
                >
                  {att.fileType === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  ) : att.fileType === 'video' ? (
                    <Video className="w-3.5 h-3.5 text-violet-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className="max-w-[120px] truncate">{att.fileName}</span>
                  <button
                    onClick={() => setPendingAttachments((p) => p.filter((x) => x.id !== att.id))}
                    className="text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {isRecording ? (
            <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Recording Voice Note: {recordingSeconds}s
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelVoice}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={stopAndSendVoice}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Pill Capsule: [Emoji/Keyboard] [Message] [AI] [Paperclip] [Camera] */}
              <div className="flex-1 flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 px-2 sm:px-3 py-1 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500/30 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowTray((v) => !v);
                    setShowAIMagic(false);
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                    showTray
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                  title="Emojis, GIFs & Funny Stickers"
                  aria-label="Open Emoji and Sticker tray"
                >
                  {showTray ? <Keyboard className="w-5 h-5" /> : <Smile className="w-5 h-5" />}
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setShowAIMagic(false);
                    setShowTray(false);
                    setActiveActionMsgId(null);
                  }}
                  onClick={() => {
                    setShowAIMagic(false);
                    setShowTray(false);
                    setActiveActionMsgId(null);
                  }}
                  placeholder="Message"
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm py-1.5 px-1 resize-none max-h-32 min-h-[38px] leading-snug"
                />

                <button
                  type="button"
                  onClick={() => {
                    setShowAIMagic((v) => !v);
                    setShowTray(false);
                  }}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                    showAIMagic
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                      : 'text-indigo-500/80 hover:text-indigo-600 dark:text-indigo-400'
                  }`}
                  title="AI Smart Replies, Polish, Translate & Voice-to-Text"
                  aria-label="Smart AI Assist"
                >
                  <Sparkles className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  title="Attach photo, video or document"
                  aria-label="Attach file"
                >
                  <Paperclip className="w-5 h-5 -rotate-45" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowDirectCamera(true)}
                  disabled={isUploading}
                  className="p-1.5 sm:p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  title="Camera: Snap photo or record video"
                  aria-label="Open camera"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              {/* Outside Right Circular Green Mic / Send Button */}
              {text.trim().length === 0 && pendingAttachments.length === 0 ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={isUploading}
                  className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer disabled:opacity-40"
                  title="Record voice note"
                  aria-label="Record voice note"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isUploading || isSending}
                  className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Send message"
                  aria-label="Send message"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 translate-x-0.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expandable Emoji / GIF / Funny Stickers Tray */}
        {showTray && !isRecording && (
          <StickerEmojiTray
            onInsertEmoji={(emoji) => setText((prev) => prev + emoji)}
            onBackspace={() =>
              setText((prev) => {
                const chars = Array.from(prev);
                chars.pop();
                return chars.join('');
              })
            }
            onSendSticker={handleSendSticker}
          />
        )}
      </div>

      {/* Direct Camera Photo/Video Capture into this Personal/Group Chat */}
      <CameraShareModal
        isOpen={showDirectCamera}
        onClose={() => setShowDirectCamera(false)}
        personalChats={[]}
        chatRoomId={chat.id}
        directTargetLabel={headerTitle}
        onCaptureDirect={handleDirectCameraSend}
      />

      {/* Media Viewer Modal */}
      {previewAttachment && (
        <MediaViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Clear Chat Confirmation Modal (Clear for Me vs Clear for Everyone) */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => !clearing && setShowClearConfirm(false)}
        title="Clear Chat?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Choose whether to clear messages only for yourself or for everyone in "{headerTitle}".
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={clearing}
              onClick={handleClearForMe}
            >
              Clear for Me
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={handleClearForEveryone}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear for Everyone
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Remove Chat / Leave Group Modal */}
      <Modal
        isOpen={showRemoveChatConfirm}
        onClose={() => !removingChat && setShowRemoveChatConfirm(false)}
        title={isGroup ? 'Remove Group?' : 'Remove Chat?'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Remove "{headerTitle}" from your conversations?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRemoveChatConfirm(false)}
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

      {/* Rename Group Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => !renaming && setShowRenameModal(false)}
        title="Rename Group"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmRenameGroup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              placeholder="Enter group name"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRenameModal(false)}
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={renaming}
              disabled={!renameText.trim()}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
