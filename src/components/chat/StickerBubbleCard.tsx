import React from 'react';
import { Attachment } from '../../types';

interface StickerBubbleCardProps {
  attachment: Attachment;
}

export const StickerBubbleCard: React.FC<StickerBubbleCardProps> = ({ attachment }) => {
  const meta = attachment.stickerMeta;
  const emoji = meta?.emoji || '🎉';
  const caption = meta?.caption || '';
  const bgGradient =
    meta?.bgGradient || 'from-amber-400 via-orange-500 to-rose-500';
  const textColor = meta?.textColor || 'text-white';
  const animation = meta?.animation || 'none';

  const animClass =
    animation === 'bounce'
      ? 'animate-bounce'
      : animation === 'pulse'
      ? 'animate-pulse'
      : animation === 'wiggle'
      ? 'hover:rotate-6 active:scale-95 transition-transform'
      : animation === 'float'
      ? 'transition-transform duration-300 hover:-translate-y-1'
      : '';

  // Pure big emoji sticker without text box when no caption & gradient='transparent'
  if (bgGradient === 'transparent') {
    return (
      <div className="inline-flex flex-col items-center justify-center py-1 px-2 select-none">
        <span className={`text-6xl sm:text-7xl leading-none drop-shadow-md ${animClass}`}>
          {emoji}
        </span>
        {caption && (
          <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 text-white text-[11px] font-extrabold shadow-xs">
            {caption}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-3xl px-5 py-3.5 bg-gradient-to-br ${bgGradient} ${textColor} shadow-lg border-2 border-white/60 dark:border-slate-800/60 select-none min-w-[138px] max-w-[220px] text-center`}
    >
      <span className={`text-5xl leading-none mb-1.5 drop-shadow-sm ${animClass}`}>
        {emoji}
      </span>
      {caption && (
        <span className="text-xs sm:text-[13px] font-black tracking-tight leading-snug drop-shadow-xs">
          {caption}
        </span>
      )}
    </div>
  );
};
