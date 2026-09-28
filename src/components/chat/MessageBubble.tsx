import React, { useState } from 'react';
import { Message, Attachment } from '../../types';
import { Avatar } from '../ui/Avatar';
import { formatMessageTimestamp } from '../../utils/dateUtils';
import {
  Reply,
  Pin,
  Smile,
  FileText,
  Edit2,
  Trash2,
  Star,
  Copy,
  Check,
  X,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  isFirstInGroup?: boolean;
  onReply: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onTogglePin: (messageId: string, currentlyPinned: boolean) => void;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onPreviewAttachment: (att: Attachment) => void;
  isImportant?: boolean;
  onToggleImportant?: (messageId: string) => void;
  currentUserId: string;
  canPin?: boolean;
}

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isCurrentUser,
  isFirstInGroup = true,
  onReply,
  onToggleReaction,
  onTogglePin,
  onEditMessage,
  onDeleteMessage,
  onPreviewAttachment,
  isImportant = false,
  onToggleImportant,
  currentUserId,
  canPin = true,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [editLoading, setEditLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDeleted = Boolean(message.deletedAt);
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === message.text) {
      setIsEditing(false);
      return;
    }
    setEditLoading(true);
    try {
      await onEditMessage(message.id, editText.trim());
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to edit message.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await onDeleteMessage(message.id);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete message.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group relative flex flex-col ${
        isFirstInGroup ? 'mt-3 mb-1' : 'my-0.5'
      } ${isCurrentUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`flex gap-2.5 max-w-[92%] sm:max-w-[80%] md:max-w-[70%] ${
          isCurrentUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar for other users (only on first message of consecutive group) */}
        {!isCurrentUser && (
          <div className="w-8 shrink-0">
            {isFirstInGroup ? (
              <Avatar
                src={message.senderAvatar}
                name={message.senderName}
                size="sm"
                className="mt-0.5"
              />
            ) : null}
          </div>
        )}

        <div className="flex flex-col min-w-0">
          {/* Sender Header if not current user and first in group */}
          {!isCurrentUser && isFirstInGroup && (
            <div className="flex items-center gap-2 mb-1 px-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {message.senderName}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatMessageTimestamp(message.createdAt)}
              </span>
              {message.isPinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded-full">
                  <Pin className="w-2.5 h-2.5" /> Pinned
                </span>
              )}
            </div>
          )}

          {/* Reply Quote Banner */}
          {message.replyTo && (
            <div
              className={`text-xs px-3 py-1.5 mb-1 rounded-xl border-l-3 transition-colors ${
                isCurrentUser
                  ? 'bg-indigo-700/50 border-white text-indigo-100 self-end text-right'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-indigo-500 text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="font-semibold text-[11px] opacity-90 truncate">
                {message.replyTo.senderName}
              </div>
              <div className="truncate max-w-xs text-[11px] opacity-80">
                {message.replyTo.text}
              </div>
            </div>
          )}

          {/* Core Bubble */}
          <div
            className={`relative px-4 py-2.5 rounded-2xl shadow-xs transition-shadow ${
              isDeleted
                ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800'
                : isCurrentUser
                ? 'bg-indigo-600 text-white rounded-tr-xs'
                : 'bg-white dark:bg-slate-800/95 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
            }`}
          >
            {/* Attachments rendering */}
            {!isDeleted && message.attachments && message.attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {message.attachments.map((att) => (
                  <div key={att.id} className="overflow-hidden rounded-xl">
                    {att.fileType === 'image' ? (
                      <div
                        onClick={() => onPreviewAttachment(att)}
                        className="relative group/att cursor-pointer overflow-hidden rounded-xl bg-black/5"
                      >
                        <img
                          src={att.url}
                          alt={att.fileName}
                          className="max-h-60 w-auto rounded-xl object-cover hover:scale-102 transition-transform duration-200"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-5 h-5 drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => onPreviewAttachment(att)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isCurrentUser
                            ? 'bg-indigo-700/50 border-indigo-400/40 hover:bg-indigo-700/70'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-xs font-bold truncate">{att.fileName}</p>
                          <p className="text-[10px] opacity-75">
                            {(att.fileSize / 1024).toFixed(1)} KB • Document
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Inline Edit Form */}
            {isEditing ? (
              <div className="space-y-2 min-w-[220px]">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5 text-xs">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2 py-1 rounded text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="px-2.5 py-1 rounded bg-white text-indigo-700 font-bold hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {editLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                {message.text}
              </p>
            )}

            {/* Bubble Meta (Timestamp, edited indicator, star) */}
            <div
              className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                isCurrentUser ? 'text-indigo-200' : 'text-slate-400'
              }`}
            >
              {message.editedAt && !isDeleted && (
                <span className="italic opacity-80">(edited)</span>
              )}

              {isImportant && (
                <span title="Marked as important" className="inline-flex items-center">
                  <Star className="w-3 h-3 text-amber-400 fill-current" />
                </span>
              )}

              {message.isPinned && isCurrentUser && (
                <span title="Pinned" className="inline-flex items-center">
                  <Pin className="w-2.5 h-2.5 text-amber-300" />
                </span>
              )}

              <span>{formatMessageTimestamp(message.createdAt)}</span>
            </div>
          </div>

          {/* Delete Confirmation Box */}
          {showDeleteConfirm && (
            <div className="mt-1.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <span className="text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
                Delete this message for everyone?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-0.5 rounded text-slate-500 hover:bg-slate-200 text-[11px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                  className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Emoji Reactions Bar */}
          {hasReactions && !isDeleted && (
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
                    <span className="text-[10px] font-bold">{userIds.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Menu (Reply, React, Pin, Star, Edit, Delete, Copy) */}
      {!isDeleted && (
        <div
          className={`flex items-center gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 shadow-sm z-10 ${
            isCurrentUser ? 'mr-1' : 'ml-10'
          }`}
        >
          {/* Reaction button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Add Reaction"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          {/* Reply */}
          <button
            onClick={() => onReply(message)}
            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyText}
            className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Mark Important (User specific) */}
          {onToggleImportant && (
            <button
              onClick={() => onToggleImportant(message.id)}
              className={`p-1 rounded-full transition-colors ${
                isImportant
                  ? 'text-amber-500'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={isImportant ? 'Unstar' : 'Star message'}
            >
              <Star className={`w-3.5 h-3.5 ${isImportant ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Pin (if permitted) */}
          {canPin && (
            <button
              onClick={() => onTogglePin(message.id, message.isPinned || false)}
              className={`p-1 rounded-full transition-colors ${
                message.isPinned
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                  : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={message.isPinned ? 'Unpin message' : 'Pin message'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sender-Only Actions: Edit & Delete */}
          {isCurrentUser && (
            <>
              <button
                onClick={() => {
                  setEditText(message.text);
                  setIsEditing(true);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Edit Message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                title="Delete Message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick Emoji Picker Popover */}
      {showEmojiPicker && (
        <div
          className={`absolute z-30 flex gap-1 p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-xl -top-7 ${
            isCurrentUser ? 'right-2' : 'left-10'
          }`}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onToggleReaction(message.id, emoji);
                setShowEmojiPicker(false);
              }}
              className="hover:scale-130 transition-transform p-1 text-base cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
