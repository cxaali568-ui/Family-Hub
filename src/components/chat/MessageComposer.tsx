import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Smile,
  Keyboard,
  Loader2,
  Mic,
  Trash2,
  Camera,
  Sparkles,
  Video,
} from 'lucide-react';
import { Message, Attachment, User } from '../../types';
import { chatService } from '../../services/chatService';
import { StickerEmojiTray } from './StickerEmojiTray';
import { AIChatMagicPopover } from './AIChatMagicPopover';
import { CameraShareModal } from './CameraShareModal';
import { useBackButtonClose, useClickOutside } from '../../hooks/useOverlayDismiss';

interface MessageComposerProps {
  chatRoomId: string;
  familyId: string;
  currentUser: User;
  onSendMessage: (text: string, replyTo?: Message['replyTo'], attachments?: Attachment[]) => Promise<void>;
  replyingTo: Message | null;
  onCancelReply: () => void;
  recentMessages?: Array<{ senderName: string; text: string }>;
  familyName?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  chatRoomId,
  familyId,
  currentUser,
  onSendMessage,
  replyingTo,
  onCancelReply,
  recentMessages = [],
  familyName = 'Family Group',
}) => {
  const [isSending, setIsSending] = useState(false);
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState('');

  const [showTray, setShowTray] = useState(false);
  const [showAIMagic, setShowAIMagic] = useState(false);
  const [showDirectCamera, setShowDirectCamera] = useState(false);

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

  const composerWrapperRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  useClickOutside(
    composerWrapperRef,
    showTray || showAIMagic,
    () => {
      setShowTray(false);
      setShowAIMagic(false);
    }
  );
  useBackButtonClose(showTray, () => setShowTray(false), 'chat-tray');
  useBackButtonClose(showAIMagic, () => setShowAIMagic(false), 'chat-ai');

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    return () => {
      chatService.setTyping(chatRoomId, currentUser, false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {}
      }
    };
  }, [chatRoomId, currentUser]);

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    resizeTextarea();

    chatService.setTyping(chatRoomId, currentUser, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      chatService.setTyping(chatRoomId, currentUser, false);
    }, 2500);
  };

  const handleSend = async () => {
    if ((!text.trim() && pendingAttachments.length === 0) || isUploading || isSending) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    chatService.setTyping(chatRoomId, currentUser, false);

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.slice(0, 80),
        }
      : undefined;

    const attachmentsToSend = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;
    const textToSend = text.trim();

    setIsSending(true);
    setText('');
    setPendingAttachments([]);
    onCancelReply();
    setShowAIMagic(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSendMessage(textToSend, replyData, attachmentsToSend);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to send message. Please retry.');
    } finally {
      setIsSending(false);
    }

    if (window.innerWidth > 768 && !showTray) {
      textareaRef.current?.focus();
    }
  };

  const handleSendSticker = async (stickerAtt: Attachment) => {
    if (isSending) return;
    setIsSending(true);
    try {
      const replyData = replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text.slice(0, 80),
          }
        : undefined;
      await onSendMessage('', replyData, [stickerAtt]);
      onCancelReply();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to send sticker.');
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB limit.');
      return;
    }

    setUploadError('');
    setIsUploading(true);
    setUploadPercent(0);

    try {
      const att = await chatService.uploadAttachment({
        familyId,
        chatRoomId,
        file,
        onProgress: (percent) => setUploadPercent(percent),
      });

      setPendingAttachments((prev) => [...prev, att]);
    } catch (err: any) {
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDirectCameraSend = async (file: File, captionText: string) => {
    const att = await chatService.uploadAttachment({
      familyId,
      chatRoomId,
      file,
    });
    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.slice(0, 80),
        }
      : undefined;
    await onSendMessage(captionText, replyData, [att]);
    onCancelReply();
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleInsertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setTimeout(resizeTextarea, 10);
  };

  const handleBackspace = () => {
    setText((prev) => {
      const chars = Array.from(prev);
      chars.pop();
      return chars.join('');
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
          setTimeout(resizeTextarea, 20);
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

  // ================= Voice Message Recording =================
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setUploadError('Voice recording is not supported in this browser.');
      return;
    }

    try {
      setUploadError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setUploadError('Microphone access denied. Please grant permission to record audio.');
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceRecording = async () => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const duration = recordingSeconds;
    const recorder = mediaRecorderRef.current;

    setIsRecording(false);
    setIsUploading(true);
    setUploadPercent(0);

    recorder.onstop = async () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size < 100) {
        setUploadError('Recorded audio was too short.');
        setIsUploading(false);
        return;
      }

      try {
        const audioAttachment = await chatService.uploadVoiceMessage({
          familyId,
          chatRoomId,
          blob: audioBlob,
          durationSeconds: duration,
          onProgress: (pct) => setUploadPercent(pct),
        });

        await onSendMessage(
          `🎙️ Voice Message (${Math.round(duration)}s)`,
          replyingTo
            ? {
                id: replyingTo.id,
                senderName: replyingTo.senderName,
                text: replyingTo.text.slice(0, 80),
              }
            : undefined,
          [audioAttachment]
        );
        onCancelReply();
      } catch (err: any) {
        console.error('Failed to upload/send voice message:', err);
        setUploadError('Failed to send voice message. Please retry.');
      } finally {
        setIsUploading(false);
        setUploadPercent(0);
        setRecordingSeconds(0);
        audioChunksRef.current = [];
      }
    };

    recorder.stop();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={composerWrapperRef}
      className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-md shrink-0 relative"
    >
      <div className="p-2.5 sm:p-3">
        {/* Reply Quote Banner */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-2 rounded-xl mb-2 text-xs animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                Replying to {replyingTo.senderName}:
              </span>
              <span className="truncate text-slate-600 dark:text-slate-400">
                {replyingTo.text}
              </span>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
              title="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Smart AI Assist Popover */}
        {showAIMagic && (
          <AIChatMagicPopover
            familyId={familyId}
            draftText={text}
            recentMessages={recentMessages}
            onApplyText={(newText) => {
              setText(newText);
              setTimeout(resizeTextarea, 10);
            }}
            speechSupported={speechSupported}
            isListeningSpeech={isListeningSpeech}
            onVoiceToText={handleToggleSpeechDictation}
            onClose={() => setShowAIMagic(false)}
          />
        )}

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="mb-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-semibold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading attachment...
              </span>
              <span>{uploadPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-150"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mb-2 p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError('')} className="p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Attachments List */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2 bg-white dark:bg-slate-800/70 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
              >
                {att.fileType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                ) : att.fileType === 'video' ? (
                  <Video className="w-4 h-4 text-violet-500" />
                ) : att.fileType === 'audio' ? (
                  <Mic className="w-4 h-4 text-emerald-500" />
                ) : (
                  <FileText className="w-4 h-4 text-amber-500" />
                )}
                <span className="max-w-[140px] truncate font-medium">{att.fileName}</span>
                <button
                  onClick={() => removePendingAttachment(att.id)}
                  className="text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active Voice Recording Bar OR Screenshot-Matched Pill Composer */}
        {isRecording ? (
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-2xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600" />
              </span>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Recording Voice Note:
              </span>
              <span className="font-mono text-sm font-extrabold text-rose-800 dark:text-rose-200 tabular-nums">
                {formatTimer(recordingSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cancel recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Voice</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Pill Capsule matching screenshot: [Emoji/Keyboard] [Message...] [AI] [Paperclip] [Camera] */}
            <div className="flex-1 flex items-center gap-0.5 sm:gap-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 px-2 sm:px-3 py-1 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500/30 min-w-0">
              {/* 1. Emoji / GIF / Stickers Toggle */}
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

              {/* 2. Center Message Input */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setShowAIMagic(false);
                  setShowTray(false);
                }}
                onClick={() => {
                  setShowAIMagic(false);
                  setShowTray(false);
                }}
                placeholder="Message"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm py-1.5 px-1 resize-none max-h-32 min-h-[38px] leading-snug"
              />

              {/* 3. Smart AI Helper Icon */}
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

              {/* 4. Paperclip Attachment Inside Input Pill */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                title="Attach file, photo or video"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5 -rotate-45" />
              </button>

              {/* 5. Camera Inside Input Pill */}
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

            {/* Outside Right Circular Green Action Button: Mic (when empty) or Send (when typing) */}
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

      {/* Expandable Emoji / GIF / Funny Stickers Tray matching screenshot */}
      {showTray && !isRecording && (
        <StickerEmojiTray
          onInsertEmoji={handleInsertEmoji}
          onBackspace={handleBackspace}
          onSendSticker={handleSendSticker}
        />
      )}

      {/* Direct Camera Photo/Video Capture into this Family Chat */}
      <CameraShareModal
        isOpen={showDirectCamera}
        onClose={() => setShowDirectCamera(false)}
        personalChats={[]}
        chatRoomId={chatRoomId}
        directTargetLabel={familyName}
        onCaptureDirect={handleDirectCameraSend}
      />
    </div>
  );
};
