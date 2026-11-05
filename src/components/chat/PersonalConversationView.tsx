import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { personalChatService } from '../../services/personalChatService';
import { PersonalChat, PersonalMessage, Attachment } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MediaViewerModal } from './MediaViewerModal';
import { UserProfileModal } from '../profile/UserProfileModal';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Trash2,
  Lock,
  Send,
  Paperclip,
  Smile,
  Mic,
  Loader2,
  X,
  Check,
  CheckCheck,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';

interface PersonalConversationViewProps {
  chat: PersonalChat;
  onBack: () => void;
}

// Compact dedicated voice message player for 1:1 chat
const PersonalVoicePlayer: React.FC<{ url: string; fileName: string; isMe: boolean }> = ({
  url,
  fileName,
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
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageLimit, setMessageLimit] = useState(80);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  // Identify other participant
  const otherId = chat.participantIds.find((id) => id !== user?.id) || '';
  const other = chat.participantDetails[otherId];
  const otherName = other?.name || 'Family Member';

  // Real-time subscription to messages in this 1:1 chat
  useEffect(() => {
    if (!chat.id || !user?.id) return;
    setLoadingMessages(true);

    // Mark as read immediately upon opening
    personalChatService.markChatAsRead(chat.id, user.id);

    const unsubMessages = personalChatService.subscribePersonalMessages(
      chat.id,
      messageLimit,
      (liveMessages) => {
        setMessages(liveMessages);
        setLoadingMessages(false);
        // Mark any incoming unread messages as read
        personalChatService.markChatAsRead(chat.id, user.id);
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      },
      (err) => {
        console.warn('Personal chat subscription error:', err);
        setLoadingMessages(false);
      }
    );

    // Subscribe to other user's typing state
    const unsubTyping = personalChatService.subscribePersonalTyping(
      chat.id,
      otherId,
      (isTyping) => setIsOtherTyping(isTyping)
    );

    return () => {
      unsubMessages();
      unsubTyping();
      if (user) personalChatService.setPersonalTyping(chat.id, user, false);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [chat.id, user?.id, otherId, messageLimit]);

  // Close 3-dots overflow menu on outside click
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

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Debounced typing indicator
    if (user) {
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

    setText('');
    setPendingAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsSending(true);

    try {
      await personalChatService.sendPersonalMessage({
        chatId: chat.id,
        familyId: chat.familyId,
        sender: user,
        recipient: {
          id: otherId,
          name: otherName,
        },
        text: textToSend,
        attachments: attachmentsToSend,
      });
    } catch (err: any) {
      showError(err?.message || 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
          recipient: { id: otherId, name: otherName },
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

  const handleClearHistory = async () => {
    if (!user) return;
    setClearing(true);
    try {
      await personalChatService.clearPersonalChatMessages(chat.id, user.id);
      setShowClearConfirm(false);
      setMoreMenuOpen(false);
      showSuccess('Conversation history cleared.');
    } catch (err: any) {
      showError(err?.message || 'Could not clear history.');
    } finally {
      setClearing(false);
    }
  };

  const commonEmojis = ['❤️', '👍', '😊', '😂', '🙏', '🎉', '☕', '🌟'];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-10 shrink-0 min-h-[56px]">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          {/* Back button */}
          <button
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Back to conversation list"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Details */}
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="relative shrink-0">
              <Avatar
                src={other?.avatar}
                name={otherName}
                size="md"
                className="ring-2 ring-indigo-500/20"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div className="overflow-hidden">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {otherName}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>
                  {isOtherTyping ? (
                    <strong className="text-indigo-600 dark:text-indigo-400">typing...</strong>
                  ) : (
                    'Confidential 1:1 Chat'
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={moreMenuRef}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Options"
            aria-label="Conversation Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {moreMenuOpen && (
            <div className="absolute top-12 right-0 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setMoreMenuOpen(false);
                  setShowClearConfirm(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Clear Chat History</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3 touch-scroll">
        {loadingMessages ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center max-w-xs mx-auto space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Confidential Conversation
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Messages and attachments between you and {otherName} are completely private. Send a greeting to start chatting!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-100`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-md rounded-2xl px-3.5 py-2 shadow-xs break-words ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                  }`}
                >
                  {/* Photo attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1.5 mb-1.5">
                      {msg.attachments.map((att) => (
                        <div key={att.id}>
                          {att.fileType === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.fileName}
                              onClick={() => setPreviewAttachment(att)}
                              className="rounded-xl max-h-60 w-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
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

                  {/* Text content */}
                  {msg.text && (
                    <p className="text-xs whitespace-pre-wrap leading-relaxed select-text">
                      {msg.text}
                    </p>
                  )}

                  {/* Timestamp & Read Tick Status */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
                      isMe ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      <span
                        className="shrink-0 ml-0.5"
                        title={msg.status === 'read' || (msg.readBy && msg.readBy.length > 1) ? 'Read' : 'Sent'}
                      >
                        {msg.status === 'read' || (msg.readBy && msg.readBy.length > 1) ? (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Other user is typing animation */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 animate-in fade-in">
            <div className="flex gap-1 items-center bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[10px] font-semibold text-slate-500 ml-1">
                {otherName} is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shrink-0">
        {/* Upload progress indicator */}
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

        {/* Pending Attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border text-xs shadow-2xs"
              >
                {att.fileType === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="max-w-[120px] truncate">{att.fileName}</span>
                <button
                  onClick={() => setPendingAttachments((p) => p.filter((x) => x.id !== att.id))}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row or Voice Recording bar */}
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
          <div className="relative flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer shrink-0"
              title="Attach photo or document"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={startVoiceRecording}
              disabled={isUploading}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer shrink-0"
              title="Record voice note"
              aria-label="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Quick Emojis Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer shrink-0"
                title="Emoji"
                aria-label="Insert emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex gap-1 z-30 animate-in fade-in">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setText((prev) => prev + emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:scale-125 transition-transform text-lg cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto expanding text input */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${otherName}...`}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 resize-none max-h-32 min-h-[44px]"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && pendingAttachments.length === 0) || isUploading || isSending}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0 active:scale-95"
              title="Send message"
              aria-label="Send message"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {previewAttachment && (
        <MediaViewerModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}

      {/* Clear Chat Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Conversation History?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to clear message history between you and {otherName}?
            This action will delete messages in this 1:1 conversation.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={handleClearHistory}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Clear Messages
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
