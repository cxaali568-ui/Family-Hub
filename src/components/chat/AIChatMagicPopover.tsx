import React, { useState } from 'react';
import { Sparkles, Languages, Wand2, MessageSquareText, Loader2, X, Mic } from 'lucide-react';
import { aiService } from '../../services/aiService';

interface AIChatMagicPopoverProps {
  familyId?: string;
  draftText: string;
  recentMessages?: Array<{ senderName: string; text: string }>;
  onApplyText: (newText: string) => void;
  onVoiceToText?: () => void;
  speechSupported?: boolean;
  isListeningSpeech?: boolean;
  onClose: () => void;
}

export const AIChatMagicPopover: React.FC<AIChatMagicPopoverProps> = ({
  familyId,
  draftText,
  recentMessages = [],
  onApplyText,
  onVoiceToText,
  speechSupported,
  isListeningSpeech,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runPrompt = async (prompt: string, parseLines: boolean = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await aiService.sendMessage([], prompt, {
        familyId,
        systemInstruction:
          'You are a concise family chat writing assistant. Return only the requested text with zero extra explanation or markdown quotes.',
      });
      const out = (res.reply || '').trim();
      if (parseLines) {
        const lines = out
          .split('\n')
          .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 3);
        setSmartReplies(lines);
      } else if (out) {
        onApplyText(out);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI helper unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartReplies = () => {
    const context = recentMessages
      .slice(-6)
      .map((m) => `${m.senderName}: ${m.text}`)
      .join('\n');
    const prompt = context
      ? `Based on this family chat:\n${context}\n\nGive 3 short, natural, friendly reply options (1 per line, under 12 words each, match the chat language).`
      : 'Give 3 friendly short family check-in messages (1 per line, under 12 words each).';
    runPrompt(prompt, true);
  };

  const handleRewrite = (mode: 'polish' | 'funny' | 'polite') => {
    if (!draftText.trim()) {
      setErrorMsg('Type a message first to rewrite it.');
      return;
    }
    const instruction =
      mode === 'funny'
        ? `Rewrite this message to sound witty and funny for family chat (keep same language/meaning): "${draftText}"`
        : mode === 'polite'
        ? `Rewrite this message warmly and respectfully for family: "${draftText}"`
        : `Fix spelling/grammar cleanly without changing tone: "${draftText}"`;
    runPrompt(instruction, false);
  };

  const handleTranslate = (targetLang: 'English' | 'Urdu' | 'Roman Urdu') => {
    if (!draftText.trim()) {
      setErrorMsg('Type a message first to translate it.');
      return;
    }
    runPrompt(
      `Translate this message naturally into ${targetLang}: "${draftText}"`,
      false
    );
  };

  return (
    <div className="mb-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/70 shadow-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart AI Assist</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          aria-label="Close AI Assist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {errorMsg && (
        <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-xl">
          {errorMsg}
        </p>
      )}

      {loading ? (
        <div className="py-3 flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-300 font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Thinking...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5">
            {speechSupported && onVoiceToText && (
              <button
                type="button"
                onClick={onVoiceToText}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                  isListeningSpeech
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                <Mic className="w-3 h-3" />
                <span>{isListeningSpeech ? 'Listening...' : 'Voice to Text'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSmartReplies}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer"
            >
              <MessageSquareText className="w-3 h-3" />
              <span>Smart Replies</span>
            </button>

            <button
              type="button"
              onClick={() => handleRewrite('polish')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
            >
              <Wand2 className="w-3 h-3" />
              <span>Fix Text</span>
            </button>

            <button
              type="button"
              onClick={() => handleRewrite('funny')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
            >
              Make Funny
            </button>

            <button
              type="button"
              onClick={() => handleRewrite('polite')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold cursor-pointer"
            >
              Warm Tone
            </button>
          </div>

          {/* Translate Draft Row */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 mr-1">
              <Languages className="w-3 h-3" /> Translate:
            </span>
            {(['English', 'Urdu', 'Roman Urdu'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleTranslate(lang)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/70 dark:hover:bg-indigo-950/50 text-slate-600 dark:text-slate-300 text-[11px] font-semibold cursor-pointer"
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Suggested Smart Replies */}
          {smartReplies.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400">Tap a reply:</p>
              <div className="flex flex-wrap gap-1.5">
                {smartReplies.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onApplyText(r);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-medium text-left cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
