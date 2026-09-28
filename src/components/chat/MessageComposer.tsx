import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, Image as ImageIcon, FileText } from 'lucide-react';
import { Message, Attachment } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface MessageComposerProps {
  onSendMessage: (text: string, replyTo?: Message['replyTo'], attachments?: Attachment[]) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  isTyping?: boolean;
}

const SAMPLE_ATTACHMENTS: Attachment[] = [
  {
    id: 'sample-img-1',
    fileName: 'grocery_shopping_list.jpg',
    fileType: 'image',
    fileSize: 310000,
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'sample-img-2',
    fileName: 'family_weekend_photo.jpg',
    fileType: 'image',
    fileSize: 520000,
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=500&q=80',
    previewUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=500&q=80',
  },
  {
    id: 'sample-doc-1',
    fileName: 'school_permission_slip.pdf',
    fileType: 'document',
    fileSize: 145000,
    url: '#',
  },
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  replyingTo,
  onCancelReply,
}) => {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSend = () => {
    if (!text.trim() && pendingAttachments.length === 0) return;

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text.slice(0, 60),
        }
      : undefined;

    onSendMessage(
      text.trim(),
      replyData,
      pendingAttachments.length > 0 ? pendingAttachments : undefined
    );

    setText('');
    setPendingAttachments([]);
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setText(promptText);
    inputRef.current?.focus();
  };

  const handleAddAttachment = (att: Attachment) => {
    setPendingAttachments(prev => [...prev, att]);
    setShowAttachMenu(false);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 md:p-4">
      {/* Quick Family Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar text-xs">
        <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-1">
          Quick:
        </span>
        <button
          onClick={() => handleQuickPrompt(t.chat.quickPrompts.grocery)}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          {t.chat.quickPrompts.grocery}
        </button>
        <button
          onClick={() => handleQuickPrompt(t.chat.quickPrompts.dinner)}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          {t.chat.quickPrompts.dinner}
        </button>
        <button
          onClick={() => handleQuickPrompt(t.chat.quickPrompts.onMyWay)}
          className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
        >
          {t.chat.quickPrompts.onMyWay}
        </button>
      </div>

      {/* Reply Quote Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-2 rounded-xl mb-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              {t.chat.replyingTo} {replyingTo.senderName}:
            </span>
            <span className="truncate text-slate-600 dark:text-slate-400">
              {replyingTo.text}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            title={t.chat.cancelReply}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          {pendingAttachments.map(att => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
            >
              {att.fileType === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span className="max-w-[120px] truncate font-medium">{att.fileName}</span>
              <button
                onClick={() => removePendingAttachment(att.id)}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="relative flex items-center gap-2">
        {/* Attachment button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
            title={t.chat.attach}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment options dropdown */}
          {showAttachMenu && (
            <div className="absolute bottom-12 left-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 z-30 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Select Family File
              </p>
              {SAMPLE_ATTACHMENTS.map(att => (
                <button
                  key={att.id}
                  onClick={() => handleAddAttachment(att)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors text-xs"
                >
                  {att.fileType === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{att.fileName}</p>
                    <p className="text-[10px] text-slate-400">{(att.fileSize / 1024).toFixed(0)} KB</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input box */}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.chat.inputPlaceholder}
          className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() && pendingAttachments.length === 0}
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
          title={t.chat.send}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
