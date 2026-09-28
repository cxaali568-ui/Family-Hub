import React, { useState } from 'react';
import { Pin, ChevronDown, ChevronUp } from 'lucide-react';
import { Message } from '../../types';

interface PinnedBannerProps {
  pinnedMessages: Message[];
  onUnpin: (messageId: string) => void;
}

export const PinnedBanner: React.FC<PinnedBannerProps> = ({ pinnedMessages, onUnpin }) => {
  const [expanded, setExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const current = pinnedMessages[0];

  return (
    <div className="bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 px-4 py-2 text-xs transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 shrink-0">
            <Pin className="w-3.5 h-3.5" />
          </span>
          <div className="overflow-hidden">
            <span className="font-bold text-amber-900 dark:text-amber-200 mr-1.5">
              Pinned ({pinnedMessages.length}):
            </span>
            <span className="text-amber-800 dark:text-amber-300/90 truncate inline-block align-bottom max-w-[200px] sm:max-w-md">
              {current.text}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {pinnedMessages.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onUnpin(current.id)}
            className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 px-1.5 py-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            Unpin
          </button>
        </div>
      </div>

      {expanded && pinnedMessages.length > 1 && (
        <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5 max-h-32 overflow-y-auto">
          {pinnedMessages.slice(1).map(msg => (
            <div key={msg.id} className="flex items-center justify-between py-1 text-slate-700 dark:text-slate-300">
              <span className="truncate max-w-[280px]">{msg.text}</span>
              <button
                onClick={() => onUnpin(msg.id)}
                className="text-[10px] text-amber-700 dark:text-amber-400 hover:underline shrink-0 ml-2"
              >
                Unpin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
