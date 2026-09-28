import React, { useState } from 'react';
import { Message } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Reply, Pin, Smile, FileText, Image as ImageIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onReply: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onTogglePin: (messageId: string) => void;
  currentUserId: string;
}

const COMMON_EMOJIS = ['❤️', '👍', '😂', '👏', '🙏', '🔥'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  onReply,
  onToggleReaction,
  onTogglePin,
  currentUserId,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  return (
    <div
      className={`group relative flex flex-col mb-4 ${
        isCurrentUser ? 'items-end' : 'items-start'
      }`}
    >
      <div className={`flex gap-2.5 max-w-[88%] md:max-w-[75%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isCurrentUser && (
          <Avatar
            src={message.senderAvatar}
            name={message.senderName}
            size="sm"
            className="mt-1 shrink-0"
          />
        )}

        <div className="flex flex-col">
          {!isCurrentUser && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {message.senderName}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatTime(message.createdAt)}
              </span>
              {message.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded-full">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
            </div>
          )}

          {/* Replying quote if present */}
          {message.replyTo && (
            <div
              className={`text-xs px-3 py-1.5 mb-1 rounded-xl border-l-3 ${
                isCurrentUser
                  ? 'bg-indigo-700/60 border-white text-indigo-100 self-end text-right'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-indigo-500 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="font-semibold text-[11px] opacity-90">{message.replyTo.senderName}</div>
              <div className="truncate max-w-xs opacity-80">{message.replyTo.text}</div>
            </div>
          )}

          {/* Message bubble core */}
          <div
            className={`relative px-4 py-3 rounded-2xl shadow-xs transition-shadow ${
              isCurrentUser
                ? 'bg-indigo-600 text-white rounded-tr-xs'
                : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
            }`}
          >
            {/* Attachment if present */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {message.attachments.map((att) => (
                  <div key={att.id} className="overflow-hidden rounded-xl">
                    {att.fileType === 'image' ? (
                      <div className="relative group/att">
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="max-h-56 w-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                        />
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {att.fileName}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                          isCurrentUser
                            ? 'bg-indigo-700/50 border-indigo-400/40'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <FileText className="w-5 h-5 shrink-0 opacity-80" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-semibold truncate">{att.fileName}</p>
                          <p className="text-[10px] opacity-70">
                            {(att.fileSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Message text */}
            <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
              {message.text}
            </p>

            {/* Timestamp for current user */}
            {isCurrentUser && (
              <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-indigo-200">
                {message.isPinned && <Pin className="w-2.5 h-2.5" />}
                <span>{formatTime(message.createdAt)}</span>
              </div>
            )}
          </div>

          {/* Reactions bar */}
          {hasReactions && (
            <div
              className={`flex flex-wrap gap-1 mt-1.5 ${
                isCurrentUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {Object.entries(message.reactions || {}).map(([emoji, userIds]) => {
                const isSelectedByMe = userIds.includes(currentUserId);
                return (
                  <button
                    key={emoji}
                    onClick={() => onToggleReaction(message.id, emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      isSelectedByMe
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-700 dark:text-indigo-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[11px] font-semibold">{userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Menu for Desktop & Touch */}
      <div
        className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
          isCurrentUser ? 'mr-2' : 'ml-12'
        }`}
      >
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="React"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onReply(message)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onTogglePin(message.id)}
          className={`p-1 rounded-md transition-colors ${
            message.isPinned
              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={message.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Emoji Picker Dropdown */}
      {showEmojiPicker && (
        <div
          className={`absolute z-20 flex gap-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg -top-6 ${
            isCurrentUser ? 'right-4' : 'left-12'
          }`}
        >
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              className="hover:scale-125 transition-transform p-1 text-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
