import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Smile,
  Sticker,
  Delete,
  Clock,
  Heart,
  Coffee,
  Sparkles,
  Car,
  Lightbulb,
  Flag,
  Plus,
  Send,
} from 'lucide-react';
import { Attachment, StickerMeta } from '../../types';

export interface StickerPreset {
  id: string;
  emoji: string;
  caption: string;
  keywords: string;
  bgGradient: string;
  textColor?: string;
  animation: StickerMeta['animation'];
  pack: 'gif' | 'funny' | 'family';
}

const GIF_REACTIONS: StickerPreset[] = [
  {
    id: 'gif_lol',
    emoji: '🤣',
    caption: 'HAHAHA LOL!',
    keywords: 'laugh funny haha lol comedy meme',
    bgGradient: 'from-amber-400 via-orange-500 to-rose-500',
    animation: 'bounce',
    pack: 'gif',
  },
  {
    id: 'gif_love',
    emoji: '😍',
    caption: 'SO MUCH LOVE ❤️',
    keywords: 'love heart cute pyar',
    bgGradient: 'from-pink-500 via-rose-500 to-red-500',
    animation: 'pulse',
    pack: 'gif',
  },
  {
    id: 'gif_party',
    emoji: '🥳',
    caption: 'PARTY TIME!',
    keywords: 'party celebrate mubarak congrats',
    bgGradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    animation: 'bounce',
    pack: 'gif',
  },
  {
    id: 'gif_mindblown',
    emoji: '🤯',
    caption: 'MIND BLOWN!',
    keywords: 'wow shocked crazy amazing',
    bgGradient: 'from-indigo-500 via-blue-600 to-cyan-500',
    animation: 'pulse',
    pack: 'gif',
  },
  {
    id: 'gif_clap',
    emoji: '👏',
    caption: 'SHABASH!',
    keywords: 'clap bravo well done shabash',
    bgGradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    animation: 'bounce',
    pack: 'gif',
  },
  {
    id: 'gif_fire',
    emoji: '🔥',
    caption: 'NEXT LEVEL!',
    keywords: 'fire lit awesome zabardast',
    bgGradient: 'from-orange-500 via-red-500 to-amber-500',
    animation: 'pulse',
    pack: 'gif',
  },
  {
    id: 'gif_sleep',
    emoji: '😴',
    caption: 'NEED SLEEP...',
    keywords: 'sleep tired goodnight neend',
    bgGradient: 'from-slate-700 via-indigo-900 to-slate-900',
    animation: 'float',
    pack: 'gif',
  },
  {
    id: 'gif_cool',
    emoji: '😎',
    caption: 'BOSS MODE ON',
    keywords: 'cool boss swag chill',
    bgGradient: 'from-cyan-500 via-sky-600 to-indigo-600',
    animation: 'wiggle',
    pack: 'gif',
  },
];

const FUNNY_AND_FAMILY_STICKERS: StickerPreset[] = [
  {
    id: 'stk_khaana',
    emoji: '🍲',
    caption: 'Khaana Ready Hai!',
    keywords: 'food dinner lunch khaana hungry',
    bgGradient: 'from-amber-500 to-orange-600',
    animation: 'wiggle',
    pack: 'family',
  },
  {
    id: 'stk_chai',
    emoji: '☕',
    caption: 'Chai Time!',
    keywords: 'chai tea coffee break',
    bgGradient: 'from-yellow-600 to-amber-700',
    animation: 'float',
    pack: 'family',
  },
  {
    id: 'stk_onmyway',
    emoji: '🚗',
    caption: 'Bas Pohanch Raha!',
    keywords: 'coming car driving omw way',
    bgGradient: 'from-emerald-500 to-teal-600',
    animation: 'bounce',
    pack: 'family',
  },
  {
    id: 'stk_kyascene',
    emoji: '😜',
    caption: 'Kya Scene Hai?',
    keywords: 'kya scene funny joke meme',
    bgGradient: 'from-fuchsia-500 to-purple-600',
    animation: 'wiggle',
    pack: 'funny',
  },
  {
    id: 'stk_mashallah',
    emoji: '✨',
    caption: 'MashaAllah!',
    keywords: 'mashallah blessing cute nice',
    bgGradient: 'from-teal-500 to-emerald-600',
    animation: 'pulse',
    pack: 'family',
  },
  {
    id: 'stk_jazakallah',
    emoji: '🤲',
    caption: 'JazakAllah!',
    keywords: 'thanks thank you dua jazakallah',
    bgGradient: 'from-indigo-500 to-blue-600',
    animation: 'float',
    pack: 'family',
  },
  {
    id: 'stk_treat',
    emoji: '🍕',
    caption: 'Treat Do Yaar!',
    keywords: 'pizza treat party hungry funny',
    bgGradient: 'from-rose-500 to-orange-500',
    animation: 'bounce',
    pack: 'funny',
  },
  {
    id: 'stk_please',
    emoji: '🥺',
    caption: 'Please Maan Jao!',
    keywords: 'please sorry cute puppy',
    bgGradient: 'from-sky-500 to-indigo-500',
    animation: 'pulse',
    pack: 'funny',
  },
  {
    id: 'stk_subah',
    emoji: '☀️',
    caption: 'Subah Bakhair!',
    keywords: 'good morning salam subah',
    bgGradient: 'from-amber-400 to-yellow-500',
    textColor: 'text-slate-900',
    animation: 'float',
    pack: 'family',
  },
  {
    id: 'stk_night',
    emoji: '🌙',
    caption: 'Shab Bakhair!',
    keywords: 'good night moon sleep',
    bgGradient: 'from-indigo-800 to-slate-900',
    animation: 'float',
    pack: 'family',
  },
  {
    id: 'stk_okboss',
    emoji: '🫡',
    caption: 'Ji Bilkul Done!',
    keywords: 'ok done yes sir salute',
    bgGradient: 'from-emerald-600 to-green-700',
    animation: 'wiggle',
    pack: 'funny',
  },
  {
    id: 'stk_drama',
    emoji: '🍿',
    caption: 'Full Drama Mode!',
    keywords: 'popcorn drama gossip funny',
    bgGradient: 'from-purple-600 to-pink-600',
    animation: 'bounce',
    pack: 'funny',
  },
];

interface EmojiCategory {
  id: string;
  label: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys & People',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂',
      '🤣', '🥲', '😊', '😇', '🙂', '🙃', '😉', '😌',
      '😍', '🥰', '😘', '😋', '😜', '🤪', '😎', '🤩',
      '🥳', '😏', '😒', '😔', '😢', '😭', '😤', '🤯',
      '🥺', '🤔', '🫡', '🤗', '🤭', '😴', '🤒', '🙏',
    ],
  },
  {
    id: 'hearts',
    label: 'Love & Family',
    emojis: [
      '💗', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍',
      '💖', '💘', '💝', '💞', '💕', '🫶', '🤝', '👍',
      '👏', '🙌', '🤲', '👪', '👨‍👩‍👧‍👦', '👶', '🏡', '💐',
    ],
  },
  {
    id: 'food',
    label: 'Food & Chai',
    emojis: [
      '☕', '🍵', '🍲', '🍛', '🍕', '🍔', '🍟', '🌮',
      '🍰', '🧁', '🍩', '🍪', '🍫', '🍿', '🍉', '🥭',
    ],
  },
  {
    id: 'celebrate',
    label: 'Fun & Celebrations',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎂', '✨', '🌟', '🔥',
      '💫', '🏆', '🥇', '🎯', '🎶', '📸', '🎥', '⚽',
    ],
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    emojis: [
      '🚗', '🚕', '🚌', '✈️', '🚀', '🛵', '🏥', '🏫',
      '🕌', '🛒', '🛍️', '🏖️', '⛰️', '☀️', '🌙', '🌧️',
    ],
  },
  {
    id: 'symbols',
    label: 'Ideas & Symbols',
    emojis: [
      '💡', '✅', '❌', '⚠️', '📌', '📍', '🔔', '💬',
      '📞', '📝', '💰', '💳', '🔒', '🆘', '🏁', '💯',
    ],
  },
];

const CUSTOM_GRADIENTS = [
  { id: 'g1', cls: 'from-emerald-500 to-teal-600' },
  { id: 'g2', cls: 'from-indigo-500 to-purple-600' },
  { id: 'g3', cls: 'from-rose-500 to-orange-500' },
  { id: 'g4', cls: 'from-amber-400 to-orange-600' },
  { id: 'g5', cls: 'from-cyan-500 to-blue-600' },
];

const RECENT_EMOJIS_KEY = 'familyhub_recent_emojis_v1';

const readRecentEmojis = (): string[] => {
  try {
    const raw = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (!raw) return ['💗', '🥰', '😂', '😎', '🙏', '👍', '🔥', '☕'];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : ['💗', '🥰', '😂', '😎', '🙏', '👍', '🔥', '☕'];
  } catch {
    return ['💗', '🥰', '😂', '😎'];
  }
};

interface StickerEmojiTrayProps {
  onInsertEmoji: (emoji: string) => void;
  onBackspace: () => void;
  onSendSticker: (stickerAttachment: Attachment) => Promise<void> | void;
}

export const StickerEmojiTray: React.FC<StickerEmojiTrayProps> = ({
  onInsertEmoji,
  onBackspace,
  onSendSticker,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'gif' | 'stickers'>('emoji');
  const [search, setSearch] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => readRecentEmojis());

  // Custom Sticker Creator inside Stickers tab
  const [showCustomCreator, setShowCustomCreator] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('😂');
  const [customCaption, setCustomCaption] = useState('');
  const [customGradIdx, setCustomGradIdx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handlePickEmoji = (emoji: string) => {
    onInsertEmoji(emoji);
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 12);
    setRecentEmojis(updated);
    try {
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleTapStickerPreset = (preset: StickerPreset) => {
    const att: Attachment = {
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: `${preset.caption || preset.emoji}.sticker`,
      fileType: 'sticker',
      fileSize: 0,
      url: '',
      stickerMeta: {
        emoji: preset.emoji,
        caption: preset.caption,
        bgGradient: preset.bgGradient,
        textColor: preset.textColor,
        animation: preset.animation,
        pack: preset.pack,
      },
    };
    onSendSticker(att);
  };

  const handleSendCustomSticker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCaption.trim() && !customEmoji) return;
    const att: Attachment = {
      id: `stk-custom-${Date.now()}`,
      fileName: `${customCaption.trim() || customEmoji}.sticker`,
      fileType: 'sticker',
      fileSize: 0,
      url: '',
      stickerMeta: {
        emoji: customEmoji || '🎉',
        caption: customCaption.trim(),
        bgGradient: CUSTOM_GRADIENTS[customGradIdx]?.cls || CUSTOM_GRADIENTS[0].cls,
        animation: 'bounce',
        pack: 'custom',
      },
    };
    onSendSticker(att);
    setCustomCaption('');
    setShowCustomCreator(false);
  };

  const filteredGifs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GIF_REACTIONS;
    return GIF_REACTIONS.filter(
      (g) => g.caption.toLowerCase().includes(q) || g.keywords.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredStickers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FUNNY_AND_FAMILY_STICKERS;
    return FUNNY_AND_FAMILY_STICKERS.filter(
      (s) => s.caption.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q)
    );
  }, [search]);

  const scrollToCategory = (catId: string) => {
    setActiveTab('emoji');
    setTimeout(() => {
      const target = sectionRefs.current[catId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 30);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl pt-2 pb-1.5 px-3 select-none animate-in slide-in-from-bottom-3 duration-150">
      {/* Top Drag Handle */}
      <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2.5" />

      {/* Search + Segmented Emoji / GIF / Stickers Switcher + Backspace */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mr-1.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-20 sm:w-28 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-full px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* 3-Tab Pill Switcher matching WhatsApp screenshot */}
        <div className="flex-1 max-w-[230px] mx-auto flex items-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('emoji')}
            className={`flex-1 py-1 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'emoji'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
            title="Emojis"
            aria-label="Emojis"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gif')}
            className={`flex-1 py-1 rounded-full text-[11px] font-black tracking-wide flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'gif'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
            title="Animated GIF Reactions"
            aria-label="GIF Reactions"
          >
            GIF
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stickers')}
            className={`flex-1 py-1 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              activeTab === 'stickers'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
            title="Funny & Family Stickers"
            aria-label="Stickers"
          >
            <Sticker className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onBackspace}
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          title="Backspace"
          aria-label="Backspace"
        >
          <Delete className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div
        ref={scrollRef}
        className="h-56 sm:h-64 overflow-y-auto pr-1 space-y-3 touch-scroll"
      >
        {activeTab === 'emoji' && (
          <>
            {/* Recents Section */}
            {!search.trim() && (
              <div
                ref={(el) => {
                  sectionRefs.current['recents'] = el;
                }}
              >
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                  Recents
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {recentEmojis.map((emoji) => (
                    <button
                      key={`rec-${emoji}`}
                      type="button"
                      onClick={() => handlePickEmoji(emoji)}
                      className="h-9 flex items-center justify-center text-2xl rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorized Emoji Grids */}
            {EMOJI_CATEGORIES.map((cat) => {
              if (search.trim() && !cat.label.toLowerCase().includes(search.trim().toLowerCase())) {
                return null;
              }
              return (
                <div
                  key={cat.id}
                  ref={(el) => {
                    sectionRefs.current[cat.id] = el;
                  }}
                >
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 px-1">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={`${cat.id}-${emoji}`}
                        type="button"
                        onClick={() => handlePickEmoji(emoji)}
                        className="h-9 flex items-center justify-center text-2xl rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {activeTab === 'gif' && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-1">
              Animated GIF Reactions (Tap to send)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredGifs.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleTapStickerPreset(g)}
                  className={`rounded-2xl p-3 bg-gradient-to-br ${g.bgGradient} text-white flex flex-col items-center justify-center text-center shadow-sm hover:scale-102 active:scale-95 transition-transform cursor-pointer`}
                >
                  <span
                    className={`text-3xl mb-1 ${
                      g.animation === 'bounce'
                        ? 'animate-bounce'
                        : g.animation === 'pulse'
                        ? 'animate-pulse'
                        : ''
                    }`}
                  >
                    {g.emoji}
                  </span>
                  <span className="text-[11px] font-black leading-tight">{g.caption}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stickers' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Funny & Family Stickers (Tap to send)
              </p>
              <button
                type="button"
                onClick={() => setShowCustomCreator((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{showCustomCreator ? 'Close Maker' : 'Create Sticker'}</span>
              </button>
            </div>

            {/* Built-In Custom Sticker Maker (Beats WhatsApp!) */}
            {showCustomCreator && (
              <form
                onSubmit={handleSendCustomSticker}
                className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={customEmoji}
                    onChange={(e) => setCustomEmoji(e.target.value)}
                    className="h-9 px-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-lg cursor-pointer"
                    aria-label="Sticker emoji"
                  >
                    {['😂', '❤️', '🥳', '🔥', '☕', '🍲', '🚗', '😎', '🙏', '✨', '🍕', '🥺'].map(
                      (em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Type sticker text (e.g. Chai Lao!)"
                    maxLength={28}
                    className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 mr-1">Color:</span>
                  {CUSTOM_GRADIENTS.map((g, idx) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setCustomGradIdx(idx)}
                      className={`w-5 h-5 rounded-full bg-gradient-to-br ${g.cls} cursor-pointer ${
                        customGradIdx === idx ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : ''
                      }`}
                      aria-label={`Color ${idx + 1}`}
                    />
                  ))}
                </div>
              </form>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {filteredStickers.map((stk) => (
                <button
                  key={stk.id}
                  type="button"
                  onClick={() => handleTapStickerPreset(stk)}
                  className={`rounded-2xl p-2.5 bg-gradient-to-br ${stk.bgGradient} ${
                    stk.textColor || 'text-white'
                  } flex flex-col items-center justify-center text-center shadow-sm hover:scale-102 active:scale-95 transition-transform cursor-pointer`}
                >
                  <span className="text-3xl mb-1">{stk.emoji}</span>
                  <span className="text-[11px] font-black leading-tight">{stk.caption}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Category Strip matching WhatsApp screenshot */}
      <div className="flex items-center justify-around pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-slate-400">
        <button
          type="button"
          onClick={() => scrollToCategory('recents')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Recents"
        >
          <Clock className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('smileys')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Smileys"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('hearts')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Love & Family"
        >
          <Heart className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('food')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Food & Chai"
        >
          <Coffee className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('celebrate')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Celebrations"
        >
          <Sparkles className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('travel')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Travel"
        >
          <Car className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollToCategory('symbols')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          title="Symbols"
        >
          <Lightbulb className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stickers')}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 cursor-pointer"
          title="Funny Stickers"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
