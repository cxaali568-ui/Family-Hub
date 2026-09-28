import React, { useState, useRef, useEffect } from 'react';
import { usePersonal } from '../../context/PersonalContext';
import { useLanguage } from '../../context/LanguageContext';
import { aiService } from '../../services/aiService';
import { AIMessage } from '../../types';
import { Sparkles, Send, Bot, User as UserIcon, RefreshCw, BookOpen, DollarSign, Calendar, Lightbulb } from 'lucide-react';
import { Button } from '../ui/Button';

type AIRole = 'general' | 'tutor' | 'budget' | 'organizer';

export const PersonalAIChat: React.FC = () => {
  const { aiMessages, addAIMessage } = usePersonal();
  const { t } = useLanguage();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<AIRole>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [aiMessages, loading]);

  const roles = [
    { id: 'general' as AIRole, label: t.personal.roleGeneral, icon: <Sparkles className="w-3.5 h-3.5" />, model: 'gemini-3.8-flash' },
    { id: 'tutor' as AIRole, label: t.personal.roleTutor, icon: <BookOpen className="w-3.5 h-3.5" />, model: 'gemini-3.8-flash' },
    { id: 'budget' as AIRole, label: t.personal.roleBudget, icon: <DollarSign className="w-3.5 h-3.5" />, model: 'gemini-3.8-flash' },
    { id: 'organizer' as AIRole, label: t.personal.roleOrganizer, icon: <Calendar className="w-3.5 h-3.5" />, model: 'gemini-3.8-flash' },
  ];

  const quickPrompts = [
    "How can I budget $300 for personal savings this month?",
    "Help me prepare a weekly study schedule for my exams.",
    "Draft a kind reminder message to my family about weekend chores.",
    "Give me 3 quick healthy dinner ideas for a busy family.",
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    setInput('');

    // Add user message
    addAIMessage({
      role: 'user',
      text: textToSend,
    });

    setLoading(true);

    try {
      const reply = await aiService.sendMessage(
        aiMessages,
        textToSend,
        { role: activeRole }
      );

      addAIMessage({
        role: 'model',
        text: reply,
      });
    } catch (err) {
      addAIMessage({
        role: 'model',
        text: "I'm having trouble connecting right now. Please check your network or try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px] bg-slate-900 rounded-2xl border border-indigo-500/20 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/80 border-b border-indigo-500/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              {t.personal.aiTitle}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Gemini 3.8 Flash
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {t.personal.aiSubtitle}
            </p>
          </div>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeRole === r.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              {r.icon}
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {aiMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-400'
              }`}
            >
              {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-xs shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 mr-auto max-w-[85%] animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/60 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-400 ml-1">Thinking with Gemini...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      {aiMessages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Suggestions:
          </span>
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/70 truncate max-w-xs transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input Composer */}
      <div className="p-3 bg-slate-950/90 border-t border-indigo-500/20 shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t.personal.aiInputPlaceholder}
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-700/80 text-white text-xs sm:text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
