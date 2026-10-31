import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Smile, Loader2, Mic, Square, Trash2 } from 'lucide-react';
import { Message, Attachment, User } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { chatService } from '../../services/chatService';

interface MessageComposerProps {
  chatRoomId: string;
  familyId: string;
  currentUser: User;
  onSendMessage: (text: string, replyTo?: Message['replyTo'], attachments?: Attachment[]) => Promise<void>;
  replyingTo: Message | null;
  onCancelReply: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  chatRoomId,
  familyId,
  currentUser,
  onSendMessage,
  replyingTo,
  onCancelReply,
}) => {
  const { t } = useLanguage();
  const [isSending, setIsSending] = useState(false);
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  // Cleanup typing presence and recording streams on unmount
  useEffect(() => {
    return () => {
      chatService.setTyping(chatRoomId, currentUser, false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [chatRoomId, currentUser]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    // Auto resize height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    // Debounced real-time typing indicator
    chatService.setTyping(chatRoomId, currentUser, true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      chatService.setTyping(chatRoomId, currentUser, false);
    }, 2500);
  };

  const handleSend = async () => {
    if ((!text.trim() && pendingAttachments.length === 0) || isUploading || isSending) return;

    // Reset typing immediately
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

    if (window.innerWidth > 768) {
      textareaRef.current?.focus();
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

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
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

        // Send voice message
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

  const commonEmojis = ['😊', '❤️', '👍', '🙏', '🎉', '🍲', '🚗', '🛒', '☕', '🌟'];

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 md:p-4 shrink-0 relative">
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
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
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
          <button onClick={() => setUploadError('')} className="p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending Attachments List */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
            >
              {att.fileType === 'image' ? (
                <ImageIcon className="w-4 h-4 text-indigo-500" />
              ) : att.fileType === 'audio' ? (
                <Mic className="w-4 h-4 text-emerald-500" />
              ) : (
                <FileText className="w-4 h-4 text-amber-500" />
              )}
              <span className="max-w-[140px] truncate font-medium">{att.fileName}</span>
              <button
                onClick={() => removePendingAttachment(att.id)}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row or Active Voice Recording Bar */}
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
        <div className="relative flex items-end gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
            title="Attach Photo or Document"
            aria-label="Attach Photo or Document"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Voice Record Button */}
          <button
            type="button"
            onClick={startVoiceRecording}
            disabled={isUploading}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
            title="Record Voice Note"
            aria-label="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Emoji Selector Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer shrink-0"
              title="Emoji"
              aria-label="Insert Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Quick Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex gap-1 z-30 animate-in fade-in">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="p-1 hover:scale-125 transition-transform text-lg cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input (auto-expanding textarea) */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.inputPlaceholder || 'Message your family...'}
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
  );
};
