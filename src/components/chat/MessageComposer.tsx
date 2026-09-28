import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, FileText, Smile, Loader2 } from 'lucide-react';
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
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  // Cleanup typing presence when component unmounts
  useEffect(() => {
    return () => {
      chatService.setTyping(chatRoomId, currentUser, false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
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
    if ((!text.trim() && pendingAttachments.length === 0) || isUploading) return;

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

    // Clear state
    setText('');
    setPendingAttachments([]);
    onCancelReply();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(textToSend, replyData, attachmentsToSend);

    // Keep focus on desktop
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
    // Maximum 25MB check
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

      {/* Input Row */}
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
          className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-40"
          title="Attach Photo or Document"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Selector Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
            title="Emoji"
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
          className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 resize-none max-h-32 min-h-[44px]"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && pendingAttachments.length === 0) || isUploading}
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
